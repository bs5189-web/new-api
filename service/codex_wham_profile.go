package service

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

const codexWhamProfileBucketDays = 30

type CodexWhamProfileResponse struct {
	ID      string                `json:"id"`
	Name    string                `json:"name"`
	Email   string                `json:"email,omitempty"`
	Stats   CodexWhamProfileStats `json:"stats"`
	Profile CodexWhamProfileUser  `json:"profile"`
}

type CodexWhamProfileUser struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email,omitempty"`
}

type CodexWhamProfileStats struct {
	DailyUsageBuckets     []CodexWhamDailyUsageBucket `json:"daily_usage_buckets"`
	LifetimeTokens        int64                       `json:"lifetime_tokens"`
	PeakDailyTokens       int64                       `json:"peak_daily_tokens"`
	CurrentStreakDays     int                         `json:"current_streak_days"`
	LongestStreakDays     int                         `json:"longest_streak_days"`
	LongestRunningTurnSec int                         `json:"longest_running_turn_sec"`
	TopInvocations        []CodexWhamInvocation       `json:"top_invocations"`
	TotalThreads          int64                       `json:"total_threads"`
	UniqueSkillsUsed      int                         `json:"unique_skills_used"`
	TotalInvocations      int64                       `json:"total_invocations"`
	TotalPromptTokens     int64                       `json:"total_prompt_tokens"`
	TotalCompletionTokens int64                       `json:"total_completion_tokens"`
	RemainingQuota        int                         `json:"remaining_quota"`
	TokenRemainingQuota   int                         `json:"token_remaining_quota,omitempty"`
	TokenUnlimitedQuota   bool                        `json:"token_unlimited_quota"`
	TokenName             string                      `json:"token_name,omitempty"`
}

type CodexWhamDailyUsageBucket struct {
	StartDate string `json:"start_date"`
	Tokens    int64  `json:"tokens"`
}

type CodexWhamInvocation struct {
	Name   string `json:"name"`
	Count  int64  `json:"count"`
	Tokens int64  `json:"tokens"`
}

func BuildCodexWhamProfileResponse(user model.UserBase, token *model.Token, now time.Time) (CodexWhamProfileResponse, error) {
	if now.IsZero() {
		now = time.Now()
	}
	stats := CodexWhamProfileStats{
		DailyUsageBuckets: make([]CodexWhamDailyUsageBucket, 0, codexWhamProfileBucketDays),
		RemainingQuota:    user.Quota,
	}
	if token != nil {
		stats.TokenName = token.Name
		stats.TokenUnlimitedQuota = token.UnlimitedQuota
		if !token.UnlimitedQuota {
			stats.TokenRemainingQuota = token.RemainQuota
		}
	}

	if model.LOG_DB != nil {
		logs, err := fetchCodexWhamProfileLogs(user.Id)
		if err != nil {
			return CodexWhamProfileResponse{}, err
		}
		stats = summarizeCodexWhamProfileLogs(stats, logs, now)
	} else {
		stats = fillCodexWhamDailyBuckets(stats, map[string]int64{}, now)
	}

	name := strings.TrimSpace(user.Username)
	if name == "" {
		name = user.Email
	}
	return CodexWhamProfileResponse{
		ID:    codexWhamProfileUserID(user.Id),
		Name:  name,
		Email: user.Email,
		Stats: stats,
		Profile: CodexWhamProfileUser{
			ID:       user.Id,
			Username: user.Username,
			Email:    user.Email,
		},
	}, nil
}

func fetchCodexWhamProfileLogs(userID int) ([]model.Log, error) {
	var logs []model.Log
	err := model.LOG_DB.Model(&model.Log{}).
		Where("user_id = ? AND type = ?", userID, model.LogTypeConsume).
		Find(&logs).Error
	return logs, err
}

func summarizeCodexWhamProfileLogs(stats CodexWhamProfileStats, logs []model.Log, now time.Time) CodexWhamProfileStats {
	dailyTokens := make(map[string]int64)
	activeDays := make(map[string]bool)
	invocations := make(map[string]*CodexWhamInvocation)
	threads := make(map[string]bool)
	skills := make(map[string]bool)

	for _, log := range logs {
		tokens := int64(log.PromptTokens + log.CompletionTokens)
		if tokens < 0 {
			tokens = 0
		}
		stats.LifetimeTokens += tokens
		stats.TotalPromptTokens += int64(log.PromptTokens)
		stats.TotalCompletionTokens += int64(log.CompletionTokens)
		stats.TotalInvocations++
		if log.UseTime > stats.LongestRunningTurnSec {
			stats.LongestRunningTurnSec = log.UseTime
		}

		day := time.Unix(log.CreatedAt, 0).Format(time.DateOnly)
		dailyTokens[day] += tokens
		activeDays[day] = true
		if dailyTokens[day] > stats.PeakDailyTokens {
			stats.PeakDailyTokens = dailyTokens[day]
		}

		name := codexWhamInvocationName(log)
		invocation := invocations[name]
		if invocation == nil {
			invocation = &CodexWhamInvocation{Name: name}
			invocations[name] = invocation
		}
		invocation.Count++
		invocation.Tokens += tokens

		threadKey := strings.TrimSpace(log.RequestId)
		if threadKey == "" {
			threadKey = strings.TrimSpace(log.UpstreamRequestId)
		}
		if threadKey == "" {
			threadKey = strings.TrimSpace(log.Content)
		}
		if threadKey != "" {
			threads[threadKey] = true
		}
		if skill := codexWhamSkillName(log); skill != "" {
			skills[skill] = true
		}
	}

	stats.CurrentStreakDays = currentCodexWhamStreak(activeDays, now)
	stats.LongestStreakDays = longestCodexWhamStreak(activeDays)
	stats.TopInvocations = topCodexWhamInvocations(invocations)
	stats.TotalThreads = int64(len(threads))
	stats.UniqueSkillsUsed = len(skills)
	stats = fillCodexWhamDailyBuckets(stats, dailyTokens, now)
	return stats
}

func fillCodexWhamDailyBuckets(stats CodexWhamProfileStats, dailyTokens map[string]int64, now time.Time) CodexWhamProfileStats {
	start := beginningOfLocalDay(now).AddDate(0, 0, -codexWhamProfileBucketDays+1)
	stats.DailyUsageBuckets = stats.DailyUsageBuckets[:0]
	for dayOffset := 0; dayOffset < codexWhamProfileBucketDays; dayOffset++ {
		date := start.AddDate(0, 0, dayOffset).Format(time.DateOnly)
		stats.DailyUsageBuckets = append(stats.DailyUsageBuckets, CodexWhamDailyUsageBucket{
			StartDate: date,
			Tokens:    dailyTokens[date],
		})
	}
	return stats
}

func beginningOfLocalDay(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
}

func currentCodexWhamStreak(activeDays map[string]bool, now time.Time) int {
	streak := 0
	day := beginningOfLocalDay(now)
	for {
		if !activeDays[day.Format(time.DateOnly)] {
			return streak
		}
		streak++
		day = day.AddDate(0, 0, -1)
	}
}

func longestCodexWhamStreak(activeDays map[string]bool) int {
	if len(activeDays) == 0 {
		return 0
	}
	days := make([]string, 0, len(activeDays))
	for day := range activeDays {
		days = append(days, day)
	}
	sort.Strings(days)
	longest := 0
	current := 0
	var previous time.Time
	for _, day := range days {
		parsed, err := time.Parse(time.DateOnly, day)
		if err != nil {
			continue
		}
		if current == 0 || parsed.Sub(previous) != 24*time.Hour {
			current = 1
		} else {
			current++
		}
		if current > longest {
			longest = current
		}
		previous = parsed
	}
	return longest
}

func topCodexWhamInvocations(invocations map[string]*CodexWhamInvocation) []CodexWhamInvocation {
	items := make([]CodexWhamInvocation, 0, len(invocations))
	for _, invocation := range invocations {
		items = append(items, *invocation)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Count != items[j].Count {
			return items[i].Count > items[j].Count
		}
		if items[i].Tokens != items[j].Tokens {
			return items[i].Tokens > items[j].Tokens
		}
		return items[i].Name < items[j].Name
	})
	if len(items) > 10 {
		items = items[:10]
	}
	return items
}

func codexWhamInvocationName(log model.Log) string {
	for _, candidate := range []string{log.ModelName, log.TokenName, log.Content} {
		candidate = strings.TrimSpace(candidate)
		if candidate != "" {
			return candidate
		}
	}
	return "unknown"
}

func codexWhamSkillName(log model.Log) string {
	var other map[string]interface{}
	if strings.TrimSpace(log.Other) != "" {
		_ = common.UnmarshalJsonStr(log.Other, &other)
	}
	for _, key := range []string{"skill", "skill_name", "codex_skill", "invocation"} {
		if value, ok := other[key].(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func codexWhamProfileUserID(userID int) string {
	return "user_" + strconv.Itoa(userID)
}
