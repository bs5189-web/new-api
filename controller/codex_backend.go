package controller

import (
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func CodexBackendModels(c *gin.Context) {
	rows, err := model.GetEnabledCodexBackendModels()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, service.BuildCodexBackendModelsResponse(rows))
}

func CodexWhamProfileMe(c *gin.Context) {
	user := model.UserBase{
		Id:       common.GetContextKeyInt(c, constant.ContextKeyUserId),
		Username: common.GetContextKeyString(c, constant.ContextKeyUserName),
		Email:    common.GetContextKeyString(c, constant.ContextKeyUserEmail),
		Quota:    common.GetContextKeyInt(c, constant.ContextKeyUserQuota),
	}
	if user.Id == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "token invalid",
				"type":    "invalid_request_error",
				"code":    "invalid_token",
			},
		})
		return
	}

	var token *model.Token
	if tokenId := common.GetContextKeyInt(c, constant.ContextKeyTokenId); tokenId > 0 {
		if loadedToken, err := model.GetTokenById(tokenId); err == nil {
			token = loadedToken
		}
	}

	profile, err := service.BuildCodexWhamProfileResponse(user, token, time.Now())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, profile)
}
