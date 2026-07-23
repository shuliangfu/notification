# Changelog

All notable changes to @dreamer/notification are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-07-23

### Added

- **Node.js compatibility**: notification now runs on Node 22+. `src/` uses only
  cross-runtime Web APIs (`crypto.subtle`, `fetch`, `AbortController`) already
  provided by Node 22+ globals; email sending reuses the now Node-compatible
  `@dreamer/email` v1.1.0 `SmtpClient`.
- **Node.js test infra**: Added `tsconfig.json`, `ci.yml` (9-job: 3 Deno v2.9 +
  3 Bun + 3 Node 22); `test:node` driven by `tsx --test --test-force-exit`;
  Deno/Bun/Node share the same `tests/*.test.ts` suite.

### Changed

- **src/queue.ts**: `pollTimer` type changed from `number` to
  `ReturnType<typeof setTimeout>` (resolves to `NodeJS.Timeout` on Node) and
  removed the `as unknown as number` cast on `setTimeout` assignment.
- **src/subscription.ts**: `cleanupTimer` type changed from `number` to
  `ReturnType<typeof setInterval>` and removed the `as unknown as number` cast.
- **tests/mod.test.ts**: Added module-level `setNotificationLocale("zh-CN")`
  lock so the `manager.render("nonexistent")` → `$tr("notification.template.notFound")`
  assertion ("模板不存在") passes under CI's English locale.
- **Dependencies**: `@dreamer/email` ^1.1.0, `@dreamer/i18n` ^1.1.2,
  `@dreamer/runtime-adapter` ^1.2.2, `@dreamer/test` ^1.2.3.
- **deno.json**: Added `minimumDependencyAge: 0`.
- **.gitignore**: Added `package-lock.json`.

### Compatibility

- Deno 2.9+ / Bun 1.3+ / Node.js 22+

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
