package utils

import "github.com/gofiber/fiber/v2"

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func OK(c *fiber.Ctx, data interface{}, message string) error {
	return c.JSON(APIResponse{Success: true, Message: message, Data: data})
}

func Created(c *fiber.Ctx, data interface{}, message string) error {
	return c.Status(fiber.StatusCreated).JSON(APIResponse{Success: true, Message: message, Data: data})
}

func BadRequest(c *fiber.Ctx, errMsg string) error {
	return c.Status(fiber.StatusBadRequest).JSON(APIResponse{Success: false, Error: errMsg})
}

func Unauthorized(c *fiber.Ctx, errMsg string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(APIResponse{Success: false, Error: errMsg})
}

func Forbidden(c *fiber.Ctx, errMsg string) error {
	return c.Status(fiber.StatusForbidden).JSON(APIResponse{Success: false, Error: errMsg})
}

func NotFound(c *fiber.Ctx, errMsg string) error {
	return c.Status(fiber.StatusNotFound).JSON(APIResponse{Success: false, Error: errMsg})
}

func TooManyRequests(c *fiber.Ctx, errMsg string) error {
	return c.Status(fiber.StatusTooManyRequests).JSON(APIResponse{Success: false, Error: errMsg})
}

func InternalError(c *fiber.Ctx, errMsg string) error {
	return c.Status(fiber.StatusInternalServerError).JSON(APIResponse{Success: false, Error: errMsg})
}
