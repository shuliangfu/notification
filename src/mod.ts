/**
 * @module @dreamer/notification
 *
 * 通知库
 *
 * 提供推送通知功能，支持：
 * - Web Push 通知
 * - 邮件通知
 * - 短信通知
 * - Webhook 通知
 * - 订阅管理
 * - 模板系统
 * - 发送队列
 *
 * @example
 * ```typescript
 * import {
 *   // 邮件发送
 *   EmailSender,
 *   createEmailSender,
 *   isValidEmail,
 *
 *   // Web Push
 *   WebPushSender,
 *   generateVapidKeys,
 *
 *   // 短信
 *   SmsSender,
 *   createAliyunSmsSender,
 *
 *   // Webhook
 *   WebhookSender,
 *   createWebhookSignature,
 *
 *   // 订阅管理
 *   SubscriptionManager,
 *
 *   // 模板系统
 *   TemplateManager,
 *
 *   // 队列
 *   NotificationQueue,
 * } from "@dreamer/notification";
 * ```
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  NotificationType,
  NotificationContent,
  NotificationResult,
  WebPushConfig,
  WebPushOptions,
  PushSubscription,
  EmailConfig,
  EmailOptions,
  SmsConfig,
  SmsOptions,
  WebhookConfig,
  WebhookOptions,
} from "./types.ts";

// ============================================================================
// 通用工具导出
// ============================================================================

export {
  createSuccessResult,
  createErrorResult,
  generateNotificationId,
  getAvailableChannels,
} from "./utils.ts";

// ============================================================================
// Web Push 模块导出
// ============================================================================

export {
  // Sender
  WebPushSender,
  createWebPushSender,
  generateVapidKeys,
  // Payload 和验证
  createWebPushPayload,
  isValidPushSubscription,
  // 类型
  type VapidKeys,
  type WebPushSendOptions,
  type BatchPushResult,
} from "./webpush.ts";

// ============================================================================
// 邮件模块导出
// ============================================================================

export {
  // Sender
  EmailSender,
  createEmailSender,
  // Payload 和验证
  createEmailPayload,
  isValidEmail,
  validateEmails,
  // 类型
  type EmailTemplate,
  type TemplateEmailOptions,
  type BatchSendOptions,
  type BatchSendResult,
  type EmailSenderConfig,
  // 重新导出 @dreamer/email 的类型
  SmtpClient,
  createMessage,
  createTemplateMessage,
  renderTemplate,
  type Message,
  type SmtpConfig,
  type MessageOptions,
  type EmailAttachment,
} from "./email.ts";

// ============================================================================
// 短信模块导出
// ============================================================================

export {
  // Sender
  SmsSender,
  createSmsSender,
  createAliyunSmsSender,
  createTencentSmsSender,
  createTwilioSmsSender,
  // Payload 和验证
  createSmsPayload,
  isValidPhoneNumber,
  formatPhoneNumber,
  // 类型
  type AliyunSmsConfig,
  type TencentSmsConfig,
  type TwilioSmsConfig,
  type SmsSenderConfig,
  type SmsSendOptions,
  type BatchSmsResult,
} from "./sms.ts";

// ============================================================================
// Webhook 模块导出
// ============================================================================

export {
  // Sender
  WebhookSender,
  createWebhookSender,
  // Payload 和签名
  createWebhookPayload,
  createWebhookSignature,
  verifyWebhookSignature,
  // 类型
  type WebhookSendOptions,
} from "./webhook.ts";

// ============================================================================
// 订阅管理模块导出
// ============================================================================

export {
  SubscriptionManager,
  MemorySubscriptionStore,
  createSubscriptionManager,
  createMemorySubscriptionManager,
  type SubscriptionRecord,
  type SubscriptionStore,
  type SubscriptionManagerOptions,
} from "./subscription.ts";

// ============================================================================
// 模板系统模块导出
// ============================================================================

export {
  TemplateManager,
  MemoryTemplateStore,
  createTemplateManager,
  renderTemplateString,
  // 预定义模板
  VERIFICATION_CODE_EMAIL_TEMPLATE,
  VERIFICATION_CODE_SMS_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
  PASSWORD_RESET_EMAIL_TEMPLATE,
  NEW_MESSAGE_PUSH_TEMPLATE,
  type NotificationTemplate,
  type RenderOptions,
  type RenderResult,
  type TemplateStore,
} from "./template.ts";

// ============================================================================
// 队列模块导出
// ============================================================================

export {
  NotificationQueue,
  MemoryTaskStore,
  createNotificationQueue,
  createMemoryNotificationQueue,
  type NotificationTask,
  type TaskStatus,
  type TaskPriority,
  type TaskStore,
  type TaskStats,
  type NotificationSender,
  type QueueConfig,
} from "./queue.ts";
