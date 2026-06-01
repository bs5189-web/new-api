package model

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func TestOAuthRelayTokenKeyUsesSecret(t *testing.T) {
	originalCryptoSecret := common.CryptoSecret
	common.CryptoSecret = "oauth-relay-test-secret"
	t.Cleanup(func() {
		common.CryptoSecret = originalCryptoSecret
	})

	clientID := "app_EMoamEEZ73f0CkXaXp7hrann"
	legacySum := sha256.Sum256([]byte(fmt.Sprintf("oauth-relay:%d:%s", 42, clientID)))
	legacyKey := "oauth-" + hex.EncodeToString(legacySum[:])

	require.NotEqual(t, legacyKey, OAuthRelayTokenKey(42, clientID))
	require.Equal(t, OAuthRelayTokenKey(42, clientID), OAuthRelayTokenKey(42, clientID))
}

func TestGetOrCreateOAuthRelayTokenRotatesLegacyDeterministicKey(t *testing.T) {
	db := setupOAuthServerModelTestDB(t)
	require.NoError(t, db.AutoMigrate(&Token{}))
	DB = db

	originalCryptoSecret := common.CryptoSecret
	common.CryptoSecret = "oauth-relay-test-secret"
	t.Cleanup(func() {
		common.CryptoSecret = originalCryptoSecret
	})

	clientID := "app_EMoamEEZ73f0CkXaXp7hrann"
	legacyKey := legacyOAuthRelayTokenKey(42, clientID)
	require.NoError(t, db.Create(&Token{
		UserId:      42,
		Key:         legacyKey,
		Status:      common.TokenStatusEnabled,
		Name:        "OAuth: Codex CLI",
		ExpiredTime: -1,
	}).Error)

	token, err := GetOrCreateOAuthRelayToken(42, clientID, "Codex CLI")
	require.NoError(t, err)
	require.NotEqual(t, legacyKey, token.Key)
	require.Equal(t, OAuthRelayTokenKey(42, clientID), token.Key)

	_, err = GetTokenByKey(legacyKey, true)
	require.Error(t, err)
}
