package router

import (
	"bytes"
	"embed"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestRegisterCodexBackendRoutesModelsAliases(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.CodexBackendModel{}, &model.Token{}, &model.User{}))
	originalDB := model.DB
	model.DB = db
	originalRedisEnabled := common.RedisEnabled
	common.RedisEnabled = false
	t.Cleanup(func() {
		model.DB = originalDB
		common.RedisEnabled = originalRedisEnabled
	})

	router := gin.New()
	RegisterCodexBackendRoutes(router)

	for _, path := range []string{
		"/codex-backend/codex/models",
		"/codex-backend/codex/v1/models",
		"/api/codex/models",
		"/api/codex/v1/models",
		"/backend-api/codex/models",
		"/backend-api/codex/v1/models",
	} {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.Header.Set("Authorization", "Bearer test-token")

		router.ServeHTTP(recorder, request)

		require.NotEqual(t, http.StatusNotFound, recorder.Code, path)
	}
}

func TestWhamAppsMCPInitializeDoesNotFallThroughToWebIndex(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	RegisterCodexWhamRoutes(router)
	SetWebRouter(router, ThemeAssets{
		DefaultBuildFS:   embed.FS{},
		DefaultIndexPage: []byte("<html>New API</html>"),
		ClassicBuildFS:   embed.FS{},
		ClassicIndexPage: []byte("<html>Classic</html>"),
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/backend-api/wham/apps",
		bytes.NewBufferString(`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"codex","version":"test"}}}`),
	)
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Header().Get("Content-Type"), "application/json")
	require.NotContains(t, recorder.Body.String(), "<html>")

	var body struct {
		JSONRPC string `json:"jsonrpc"`
		ID      int    `json:"id"`
		Result  struct {
			ProtocolVersion string `json:"protocolVersion"`
			Capabilities    struct {
				Tools map[string]any `json:"tools"`
			} `json:"capabilities"`
			ServerInfo struct {
				Name string `json:"name"`
			} `json:"serverInfo"`
		} `json:"result"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &body))
	require.Equal(t, "2.0", body.JSONRPC)
	require.Equal(t, 1, body.ID)
	require.NotEmpty(t, body.Result.ProtocolVersion)
	require.NotNil(t, body.Result.Capabilities.Tools)
	require.Equal(t, "codex_apps", body.Result.ServerInfo.Name)
}

func TestWhamProfilesMeReturnsTokenActivityStats(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Token{}, &model.Log{}))

	originalDB := model.DB
	originalLogDB := model.LOG_DB
	originalRedisEnabled := common.RedisEnabled
	model.DB = db
	model.LOG_DB = db
	common.RedisEnabled = false
	t.Cleanup(func() {
		model.DB = originalDB
		model.LOG_DB = originalLogDB
		common.RedisEnabled = originalRedisEnabled
	})

	accessToken := "access-token"
	user := model.User{
		Id:          7,
		Username:    "codex-user",
		Password:    "password123",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Email:       "codex@example.com",
		AccessToken: &accessToken,
		Quota:       9000,
		Group:       "default",
	}
	require.NoError(t, db.Create(&user).Error)
	token := model.Token{
		Id:             11,
		UserId:         user.Id,
		Key:            "profiletest",
		Name:           "Codex Profile Token",
		Status:         common.TokenStatusEnabled,
		CreatedTime:    time.Now().Unix(),
		ExpiredTime:    -1,
		RemainQuota:    8000,
		UnlimitedQuota: false,
	}
	require.NoError(t, db.Create(&token).Error)

	now := time.Now()
	logs := []model.Log{
		{
			UserId: user.Id, CreatedAt: now.Unix(), Type: model.LogTypeConsume,
			ModelName: "gpt-5-codex", PromptTokens: 100, CompletionTokens: 50,
			UseTime: 12, TokenId: token.Id, RequestId: "thread-today", Other: `{"skill_name":"review"}`,
		},
		{
			UserId: user.Id, CreatedAt: now.AddDate(0, 0, -1).Unix(), Type: model.LogTypeConsume,
			ModelName: "gpt-5-codex", PromptTokens: 40, CompletionTokens: 60,
			UseTime: 30, TokenId: token.Id, RequestId: "thread-yesterday", Other: `{"skill_name":"build"}`,
		},
		{
			UserId: user.Id, CreatedAt: now.AddDate(0, 0, -3).Unix(), Type: model.LogTypeConsume,
			ModelName: "gpt-5.1-codex", PromptTokens: 10, CompletionTokens: 5,
			UseTime: 5, TokenId: token.Id, RequestId: "thread-old", Other: `{"skill_name":"review"}`,
		},
		{
			UserId: 999, CreatedAt: now.Unix(), Type: model.LogTypeConsume,
			ModelName: "gpt-5-codex", PromptTokens: 1000, CompletionTokens: 1000,
		},
	}
	require.NoError(t, db.Create(&logs).Error)

	router := gin.New()
	RegisterCodexWhamRoutes(router)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/backend-api/wham/profiles/me", nil)
	request.Header.Set("Authorization", "Bearer sk-profiletest")
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Header().Get("Cache-Control"), "no-store")

	var body struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
		Stats struct {
			DailyUsageBuckets []struct {
				StartDate string `json:"start_date"`
				Tokens    int64  `json:"tokens"`
			} `json:"daily_usage_buckets"`
			LifetimeTokens        int64 `json:"lifetime_tokens"`
			PeakDailyTokens       int64 `json:"peak_daily_tokens"`
			CurrentStreakDays     int   `json:"current_streak_days"`
			LongestStreakDays     int   `json:"longest_streak_days"`
			LongestRunningTurnSec int   `json:"longest_running_turn_sec"`
			TopInvocations        []struct {
				Name   string `json:"name"`
				Count  int64  `json:"count"`
				Tokens int64  `json:"tokens"`
			} `json:"top_invocations"`
			TotalThreads        int64 `json:"total_threads"`
			UniqueSkillsUsed    int   `json:"unique_skills_used"`
			TokenRemainingQuota int   `json:"token_remaining_quota"`
		} `json:"stats"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &body))
	require.Equal(t, "user_7", body.ID)
	require.Equal(t, "codex-user", body.Name)
	require.Equal(t, "codex@example.com", body.Email)
	require.Len(t, body.Stats.DailyUsageBuckets, 30)
	require.Equal(t, int64(265), body.Stats.LifetimeTokens)
	require.Equal(t, int64(150), body.Stats.PeakDailyTokens)
	require.Equal(t, 2, body.Stats.CurrentStreakDays)
	require.Equal(t, 2, body.Stats.LongestStreakDays)
	require.Equal(t, 30, body.Stats.LongestRunningTurnSec)
	require.Equal(t, int64(3), body.Stats.TotalThreads)
	require.Equal(t, 2, body.Stats.UniqueSkillsUsed)
	require.Equal(t, 8000, body.Stats.TokenRemainingQuota)
	require.NotEmpty(t, body.Stats.TopInvocations)
	require.Equal(t, "gpt-5-codex", body.Stats.TopInvocations[0].Name)
	require.Equal(t, int64(2), body.Stats.TopInvocations[0].Count)
	require.Equal(t, int64(250), body.Stats.TopInvocations[0].Tokens)
}

func TestWhamAppsMCPToolsListReturnsEmptyToolSet(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	RegisterCodexWhamRoutes(router)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/backend-api/wham/apps",
		bytes.NewBufferString(`{"jsonrpc":"2.0","id":"tools-1","method":"tools/list","params":{}}`),
	)
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Header().Get("Content-Type"), "application/json")

	var body struct {
		JSONRPC string `json:"jsonrpc"`
		ID      string `json:"id"`
		Result  struct {
			Tools []any `json:"tools"`
		} `json:"result"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &body))
	require.Equal(t, "2.0", body.JSONRPC)
	require.Equal(t, "tools-1", body.ID)
	require.Empty(t, body.Result.Tools)
}

func TestWhamAppsMCPInitializedNotificationIsAccepted(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	RegisterCodexWhamRoutes(router)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/backend-api/wham/apps",
		bytes.NewBufferString(`{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}`),
	)
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusAccepted, recorder.Code)
	require.Empty(t, recorder.Body.String())
}
