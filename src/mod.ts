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
  EmailConfig,
  EmailOptions,
  NotificationContent,
  NotificationResult,
  NotificationType,
  PushSubscription,
  SmsConfig,
  SmsOptions,
  WebhookConfig,
  WebhookOptions,
  WebPushConfig,
  WebPushOptions,
} from "./types.ts";

// ============================================================================
// 通用工具导出
// ============================================================================

export {
  createErrorResult,
  createSuccessResult,
  generateNotificationId,
  getAvailableChannels,
} from "./utils.ts";

// ============================================================================
// Web Push 模块导出
// ============================================================================

export {
  type BatchPushResult,
  // Payload 和验证
  createWebPushPayload,
  createWebPushSender,
  generateVapidKeys,
  isValidPushSubscription,
  // 类型
  type VapidKeys,
  // Sender
  WebPushSender,
  type WebPushSendOptions,
} from "./webpush.ts";

// ============================================================================
// 邮件模块导出
// ============================================================================

export {
  type BatchSendOptions,
  type BatchSendResult,
  // Payload 和验证
  createEmailPayload,
  createEmailSender,
  createMessage,
  createTemplateMessage,
  type EmailAttachment,
  // Sender
  EmailSender,
  type EmailSenderConfig,
  // 类型
  type EmailTemplate,
  isValidEmail,
  type Message,
  type MessageOptions,
  renderTemplate,
  // 重新导出 @dreamer/email 的类型
  SmtpClient,
  type SmtpConfig,
  type TemplateEmailOptions,
  validateEmails,
} from "./email.ts";

// ============================================================================
// 短信模块导出
// ============================================================================

export {
  // 类型
  type AliyunSmsConfig,
  type BatchSmsResult,
  createAliyunSmsSender,
  // Payload 和验证
  createSmsPayload,
  createSmsSender,
  createTencentSmsSender,
  createTwilioSmsSender,
  formatPhoneNumber,
  isValidPhoneNumber,
  // Sender
  SmsSender,
  type SmsSenderConfig,
  type SmsSendOptions,
  type TencentSmsConfig,
  type TwilioSmsConfig,
} from "./sms.ts";

// ============================================================================
// Webhook 模块导出
// ============================================================================

export {
  // Payload 和签名
  createWebhookPayload,
  createWebhookSender,
  createWebhookSignature,
  verifyWebhookSignature,
  // Sender
  WebhookSender,
  // 类型
  type WebhookSendOptions,
} from "./webhook.ts";

// ============================================================================
// 订阅管理模块导出
// ============================================================================

export {
  createMemorySubscriptionManager,
  createSubscriptionManager,
  MemorySubscriptionStore,
  SubscriptionManager,
  type SubscriptionManagerOptions,
  type SubscriptionRecord,
  type SubscriptionStore,
} from "./subscription.ts";

// ============================================================================
// 模板系统模块导出
// ============================================================================

export {
  createTemplateManager,
  MemoryTemplateStore,
  NEW_MESSAGE_PUSH_TEMPLATE,
  type NotificationTemplate,
  PASSWORD_RESET_EMAIL_TEMPLATE,
  type RenderOptions,
  type RenderResult,
  renderTemplateString,
  TemplateManager,
  type TemplateStore,
  // 预定义模板
  VERIFICATION_CODE_EMAIL_TEMPLATE,
  VERIFICATION_CODE_SMS_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
} from "./template.ts";

// ============================================================================
// 队列模块导出
// ============================================================================

export {
  createMemoryNotificationQueue,
  createNotificationQueue,
  MemoryTaskStore,
  NotificationQueue,
  type NotificationSender,
  type NotificationTask,
  type QueueConfig,
  type TaskPriority,
  type TaskStats,
  type TaskStatus,
  type TaskStore,
} from "./queue.ts";
