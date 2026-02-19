# 变更日志

@dreamer/notification 的所有重要变更均记录于此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-02-19

### 新增

- **初始版本**：首个稳定版 @dreamer/notification，提供统一的多通道通知 API。

- **邮件**
  - `EmailSender`、`createEmailSender`，基于 SMTP 发送邮件。
  - `createEmailPayload`、`isValidEmail`、`validateEmails` 用于构建与校验邮件。
  - 模板发送：`EmailTemplate`、`TemplateEmailOptions`，批量发送
    `BatchSendOptions` / `BatchSendResult`。
  - 从 `@dreamer/email`
    再导出：`SmtpClient`、`createMessage`、`createTemplateMessage`、`renderTemplate`
    及类型 `Message`、`SmtpConfig`、`MessageOptions`、`EmailAttachment`。
  - 子路径导出：`@dreamer/notification/email`。

- **Web Push**
  - `WebPushSender`、`createWebPushSender` 用于发送 Web Push 通知。
  - `generateVapidKeys` 生成 VAPID 密钥对。
  - `createWebPushPayload`、`isValidPushSubscription` 用于 payload 与订阅校验。
  - 类型：`VapidKeys`、`WebPushSendOptions`、`BatchPushResult`。
  - 子路径导出：`@dreamer/notification/webpush`。

- **短信**
  - `SmsSender`
    及工厂：`createSmsSender`、`createAliyunSmsSender`、`createTencentSmsSender`、`createTwilioSmsSender`。
  - `createSmsPayload`、`isValidPhoneNumber`、`formatPhoneNumber` 用于 payload
    与号码处理。
  - 配置类型：`AliyunSmsConfig`、`TencentSmsConfig`、`TwilioSmsConfig`、`SmsSenderConfig`、`SmsSendOptions`、`BatchSmsResult`。
  - 子路径导出：`@dreamer/notification/sms`。

- **Webhook**
  - `WebhookSender`、`createWebhookSender` 用于 HTTP Webhook 投递。
  - `createWebhookPayload`、`createWebhookSignature`、`verifyWebhookSignature`
    用于 payload 与 HMAC 签名（可选时间戳校验）。
  - 类型：`WebhookSendOptions`。
  - 子路径导出：`@dreamer/notification/webhook`。

- **订阅管理**
  - `SubscriptionManager` 与 `SubscriptionStore` 接口，用于存储与查询用户订阅。
  - `MemorySubscriptionStore` 及 `createSubscriptionManager` /
    `createMemorySubscriptionManager`。
  - 类型：`SubscriptionRecord`、`SubscriptionManagerOptions`。
  - 支持 email、SMS、webpush、webhook 等订阅类型，支持启用/禁用及按类型查询。
  - 子路径导出：`@dreamer/notification/subscription`。

- **模板系统**
  - `TemplateManager` 与 `TemplateStore`，用于注册与渲染通知模板。
  - `MemoryTemplateStore`、`createTemplateManager`、`renderTemplateString`，支持变量替换、条件、循环与过滤器。
  - 预定义模板：`VERIFICATION_CODE_EMAIL_TEMPLATE`、`VERIFICATION_CODE_SMS_TEMPLATE`、`WELCOME_EMAIL_TEMPLATE`、`PASSWORD_RESET_EMAIL_TEMPLATE`、`NEW_MESSAGE_PUSH_TEMPLATE`。
  - 类型：`NotificationTemplate`、`RenderOptions`、`RenderResult`。
  - 子路径导出：`@dreamer/notification/template`。

- **通知队列**
  - `NotificationQueue` 与 `TaskStore`，用于排队与处理通知任务。
  - `MemoryTaskStore` 及 `createNotificationQueue` /
    `createMemoryNotificationQueue`。
  - 任务状态与优先级：`TaskStatus`、`TaskPriority`、`NotificationTask`、`TaskStats`、`NotificationSender`、`QueueConfig`。
  - 支持延迟发送与按优先级排序。
  - 子路径导出：`@dreamer/notification/queue`。

- **通用工具与类型**
  - `createSuccessResult`、`createErrorResult`、`generateNotificationId`、`getAvailableChannels`（来自
    `./utils.ts`）。
  - 核心类型（来自
    `./types.ts`）：`NotificationType`、`NotificationContent`、`NotificationResult`
    及各通道配置/选项类型。
  - 子路径导出：`@dreamer/notification/types`、`@dreamer/notification/utils`。

- **国际化（i18n）**
  - 服务端文案（如模板不存在、发送失败、无效手机号、未配置发送器）提供 **en-US**
    与 **zh-CN**，基于 `@dreamer/i18n`。
  - 语言由 `LANGUAGE`、`LC_ALL`、`LANG` 检测；从 `./i18n.ts` 导出
    `detectLocale()`、`setNotificationLocale(lang)`、`$tr(key)`。
  - 类型：`Locale`（`"en-US" | "zh-CN"`），常量 `DEFAULT_LOCALE`。

### 兼容性

- Deno 2.6+
- Bun 1.3.5+
