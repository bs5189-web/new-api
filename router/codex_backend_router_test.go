package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

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
