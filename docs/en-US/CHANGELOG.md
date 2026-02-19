# Changelog

All notable changes to @dreamer/notification are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-02-19

### Added

- **Initial release**: First stable version of @dreamer/notification with a
  unified API for multi-channel notifications.

- **Email**
  - `EmailSender` and `createEmailSender` for sending email via SMTP.
  - `createEmailPayload`, `isValidEmail`, `validateEmails` for payload building
    and validation.
  - Template-based sending with `EmailTemplate`, `TemplateEmailOptions`, batch
    send via `BatchSendOptions` / `BatchSendResult`.
  - Re-exports from `@dreamer/email`: `SmtpClient`, `createMessage`,
    `createTemplateMessage`, `renderTemplate`, and types `Message`,
    `SmtpConfig`, `MessageOptions`, `EmailAttachment`.
  - Subpath export: `@dreamer/notification/email`.

- **Web Push**
  - `WebPushSender` and `createWebPushSender` for sending Web Push
    notifications.
  - `generateVapidKeys` for VAPID key pair generation.
  - `createWebPushPayload`, `isValidPushSubscription` for payload and
    subscription validation.
  - Types: `VapidKeys`, `WebPushSendOptions`, `BatchPushResult`.
  - Subpath export: `@dreamer/notification/webpush`.

- **SMS**
  - `SmsSender` with factory helpers: `createSmsSender`,
    `createAliyunSmsSender`, `createTencentSmsSender`, `createTwilioSmsSender`.
  - `createSmsPayload`, `isValidPhoneNumber`, `formatPhoneNumber` for payload
    and phone handling.
  - Config types: `AliyunSmsConfig`, `TencentSmsConfig`, `TwilioSmsConfig`,
    `SmsSenderConfig`, `SmsSendOptions`, `BatchSmsResult`.
  - Subpath export: `@dreamer/notification/sms`.

- **Webhook**
  - `WebhookSender` and `createWebhookSender` for HTTP webhook delivery.
  - `createWebhookPayload`, `createWebhookSignature`, `verifyWebhookSignature`
    for payload and HMAC signature (with optional timestamp validation).
  - Type: `WebhookSendOptions`.
  - Subpath export: `@dreamer/notification/webhook`.

- **Subscription management**
  - `SubscriptionManager` and `SubscriptionStore` interface for storing and
    querying user subscriptions.
  - `MemorySubscriptionStore` and `createSubscriptionManager` /
    `createMemorySubscriptionManager`.
  - Types: `SubscriptionRecord`, `SubscriptionManagerOptions`.
  - Support for email, SMS, webpush, and webhook subscription types with
    enable/disable and per-type queries.
  - Subpath export: `@dreamer/notification/subscription`.

- **Template system**
  - `TemplateManager` and `TemplateStore` for registering and rendering
    notification templates.
  - `MemoryTemplateStore`, `createTemplateManager`, `renderTemplateString` with
    variable substitution, conditionals, loops, and filters.
  - Predefined templates: `VERIFICATION_CODE_EMAIL_TEMPLATE`,
    `VERIFICATION_CODE_SMS_TEMPLATE`, `WELCOME_EMAIL_TEMPLATE`,
    `PASSWORD_RESET_EMAIL_TEMPLATE`, `NEW_MESSAGE_PUSH_TEMPLATE`.
  - Types: `NotificationTemplate`, `RenderOptions`, `RenderResult`.
  - Subpath export: `@dreamer/notification/template`.

- **Notification queue**
  - `NotificationQueue` and `TaskStore` for queuing and processing notification
    tasks.
  - `MemoryTaskStore` and `createNotificationQueue` /
    `createMemoryNotificationQueue`.
  - Task status and priority: `TaskStatus`, `TaskPriority`, `NotificationTask`,
    `TaskStats`, `NotificationSender`, `QueueConfig`.
  - Support for delayed send and priority ordering.
  - Subpath export: `@dreamer/notification/queue`.

- **Shared utilities and types**
  - `createSuccessResult`, `createErrorResult`, `generateNotificationId`,
    `getAvailableChannels` from `./utils.ts`.
  - Core types from `./types.ts`: `NotificationType`, `NotificationContent`,
    `NotificationResult`, and all channel config/options types.
  - Subpath exports: `@dreamer/notification/types`,
    `@dreamer/notification/utils`.

- **Internationalization (i18n)**
  - Server-side messages (e.g. template not found, send failed, invalid phone
    number, sender not configured) in **en-US** and **zh-CN** via
    `@dreamer/i18n`.
  - Locale detection from `LANGUAGE`, `LC_ALL`, or `LANG`; `detectLocale()`,
    `setNotificationLocale(lang)`, and `$tr(key)` exported from `./i18n.ts`.
  - Type: `Locale` (`"en-US" | "zh-CN"`), constant `DEFAULT_LOCALE`.

### Compatibility

- Deno 2.6+
- Bun 1.3.5+
