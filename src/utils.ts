/**
 * @fileoverview 通知模块通用工具函数
 *
 * 提供通用的辅助功能
 */

import type {
  EmailConfig,
  NotificationResult,
  NotificationType,
  SmsConfig,
  WebhookConfig,
  WebPushConfig,
} from "./types.ts";

// ============================================================================
// 结果创建
// ============================================================================

/**
 * 创建成功结果
 *
 * @param messageId - 消息 ID
 * @param rawResponse - 原始响应
 * @returns 通知结果
 */
export function createSuccessResult(
  messageId?: string,
  rawResponse?: unknown,
): NotificationResult {
  return {
    success: true,
    messageId: messageId || `msg_${Date.now()}`,
    rawResponse,
  };
}

/**
 * 创建错误结果
 *
 * @param error - 错误信息
 * @param rawResponse - 原始响应
 * @returns 通知结果
 */
export function createErrorResult(
  error: string,
  rawResponse?: unknown,
): NotificationResult {
  return {
    success: false,
    error,
    rawResponse,
  };
}

// ============================================================================
// ID 生成
// ============================================================================

/**
 * 生成通知 ID
 *
 * @param prefix - 前缀
 * @returns 唯一 ID
 */
export function generateNotificationId(prefix = "notif"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// ============================================================================
// 渠道检测
// ============================================================================

/**
 * 获取可用的通知渠道
 *
 * @param config - 配置对象
 * @returns 可用渠道列表
 */
export function getAvailableChannels(config: {
  webpush?: WebPushConfig;
  email?: EmailConfig;
  sms?: SmsConfig;
  webhooks?: WebhookConfig[];
}): NotificationType[] {
  const channels: NotificationType[] = [];

  if (config.webpush) channels.push("webpush");
  if (config.email) channels.push("email");
  if (config.sms) channels.push("sms");
  if (config.webhooks && config.webhooks.length > 0) channels.push("webhook");

  return channels;
}
