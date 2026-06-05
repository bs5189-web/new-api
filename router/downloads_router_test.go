package router

import (
	"embed"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestDownloadsRouteServesFilesFromDownloadsDirBeforeWebFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)

	downloadsDir := t.TempDir()
	releaseDir := filepath.Join(downloadsDir, "ruizhi")
	require.NoError(t, os.MkdirAll(releaseDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(releaseDir, "ruizhi-macos-x64.dmg"), []byte("dmg-bytes"), 0o644))
	t.Setenv("DOWNLOADS_DIR", downloadsDir)

	router := gin.New()
	SetWebRouter(router, ThemeAssets{
		DefaultBuildFS:   embed.FS{},
		DefaultIndexPage: []byte("<html>Default</html>"),
		ClassicBuildFS:   embed.FS{},
		ClassicIndexPage: []byte("<html>Classic</html>"),
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/downloads/ruizhi/ruizhi-macos-x64.dmg", nil)

	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, "dmg-bytes", recorder.Body.String())
	require.NotContains(t, recorder.Body.String(), "<html>")
}
