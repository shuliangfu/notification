# @dreamer/notification

> 📖 [English](../../README.md) | 中文

> 一个兼容 Deno、Bun 和 Node.js
> 的通知库，提供多渠道通知发送、订阅管理、模板系统和发送队列功能

[![JSR](https://jsr.io/badges/@dreamer/notification)](https://jsr.io/@dreamer/notification)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Tests](https://img.shields.io/badge/tests-115%20passed%20(三端)-brightgreen)](./TEST_REPORT.md)

---

## 🎯 功能

通知发送包，用于多渠道消息推送、订阅管理和通知模板，提供 Web
Push、邮件、短信、Webhook 等多渠道发送能力，兼容 Deno、Bun 与 Node.js 22+。

---

## 📦 安装

### Deno

```bash
deno add jsr:@dreamer/notification
```

### Bun

```bash
bunx jsr add @dreamer/notification
```

### Node.js

```bash
npx jsr add @dreamer/notification
```

> 需要 Node.js 22+。使用 Node 22+ 全局已提供的 `fetch` / `crypto.subtle` /
> `AbortController`；邮件发送复用 `@dreamer/email` v1.1.0 `SmtpClient`。

---

## 🌍 环境兼容性

| 环境       | 版本要求 | 状态                                          |
| ---------- | -------- | --------------------------------------------- |
| **Deno**   | 2.9+     | ✅ 完全支持                                   |
| **Bun**    | 1.3+     | ✅ 完全支持                                   |
| **Node.js**| 22+      | ✅ 完全支持（自 v1.1.0 起）                   |
| **服务端** | -        | ✅ 支持（推送通知、邮件、短信、Webhook 发送） |
| **客户端** | -        | ⚠️ 部分支持（仅 Payload 创建和验证功能）      |
| **依赖**   | -        | 📦 @dreamer/email（邮件发送）                 |

---

## ✨ 特性

- **多渠道发送**：
  - Web Push：VAPID 认证、Payload 加密、批量推送
  - 邮件：集成 @dreamer/email，支持 SMTP 发送
  - 短信：支持阿里云、腾讯云、Twilio 多服务商
  - Webhook：签名验证、重试机制
- **订阅管理**：
  - 用户订阅存储和管理
  - 支持多种订阅类型（邮箱、短信、Push、Webhook）
  - 启用/禁用订阅
- **模板系统**：
  - 变量替换 `{{variable}}`
  - 条件渲染 `{{#if condition}}...{{/if}}`
  - 循环渲染 `{{#each items}}...{{/each}}`
  - 过滤器支持 `{{value|upper}}`
  - 多语言模板
- **发送队列**：
  - 优先级队列（urgent、high、normal、low）
  - 定时发送
  - 失败重试
  - 批量处理

---

## 🎯 使用场景

- **系统通知**：验证码、密码重置、账号激活
- **消息推送**：新消息提醒、订单状态更新
- **营销通知**：活动推广、优惠提醒
- **监控告警**：系统异常、服务状态变更

---

## 🚀 快速开始

### 邮件发送

```typescript
import { createEmailSender, isValidEmail } from "jsr:@dreamer/notification";

// 验证邮箱
if (isValidEmail("user@example.com")) {
  console.log("邮箱格式正确");
}

// 创建邮件发送器
const emailSender = createEmailSender({
  host: "smtp.example.com",
  port: 587,
  username: "user@example.com",
  password: "password",
  from: "noreply@example.com",
  fromName: "系统通知",
});

// 发送邮件
const result = await emailSender.send({
  to: "user@example.com",
  subject: "欢迎注册",
  html: "<h1>欢迎加入我们</h1>",
});

if (result.success) {
  console.log("邮件发送成功:", result.messageId);
} else {
  console.error("邮件发送失败:", result.error);
}
```

### Web Push 发送

```typescript
import {
  createWebPushSender,
  generateVapidKeys,
} from "jsr:@dreamer/notification";

// 生成 VAPID 密钥（仅需执行一次，保存密钥）
const vapidKeys = await generateVapidKeys();
console.log("公钥:", vapidKeys.publicKey);
console.log("私钥:", vapidKeys.privateKey);

// 创建 Web Push 发送器
const pushSender = createWebPushSender({
  publicKey: vapidKeys.publicKey,
  privateKey: vapidKeys.privateKey,
  contact: "mailto:admin@example.com",
});

// 发送推送通知
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/...",
  keys: {
    p256dh: "...",
    auth: "...",
  },
};

const result = await pushSender.send(subscription, {
  title: "新消息",
  body: "您有一条新消息",
  icon: "/icons/notification.png",
  data: { url: "/messages/123" },
});
```

### 短信发送

```typescript
import {
  createAliyunSmsSender,
  formatPhoneNumber,
  isValidPhoneNumber,
} from "jsr:@dreamer/notification";

// 验证手机号
if (isValidPhoneNumber("13800138000")) {
  console.log("手机号格式正确");
}

// 格式化手机号（添加区号）
const formatted = formatPhoneNumber("13800138000"); // +8613800138000

// 创建阿里云短信发送器
const smsSender = createAliyunSmsSender(
  "accessKeyId",
  "accessKeySecret",
  "签名名称",
);

// 发送验证码短信
const result = await smsSender.sendVerificationCode(
  "13800138000",
  "SMS_123456789",
  "1234",
);
```

### Webhook 发送

```typescript
import {
  createWebhookSignature,
  verifyWebhookSignature,
  WebhookSender,
} from "jsr:@dreamer/notification";

// 创建签名
const payload = JSON.stringify({ event: "order.created", data: { id: 123 } });
const signature = await createWebhookSignature(payload, "webhook-secret");

// 验证签名
const isValid = await verifyWebhookSignature(
  payload,
  signature,
  "webhook-secret",
);

// 使用 WebhookSender 发送
const webhookSender = new WebhookSender({
  url: "https://example.com/webhook",
  secret: "webhook-secret",
});

await webhookSender.send({
  event: "order.created",
  data: { orderId: 123 },
});
```

### 订阅管理

```typescript
import {
  MemorySubscriptionStore,
  SubscriptionManager,
} from "jsr:@dreamer/notification";

// 创建订阅管理器
const store = new MemorySubscriptionStore();
const manager = new SubscriptionManager({ store });

// 添加邮箱订阅
const emailSubId = await manager.addEmailSubscription(
  "user123",
  "user@example.com",
);

// 添加 Push 订阅
const pushSubId = await manager.addPushSubscription("user123", {
  endpoint: "https://...",
  keys: { p256dh: "...", auth: "..." },
});

// 获取用户的所有订阅
const subscriptions = await manager.getUserSubscriptions("user123");

// 禁用订阅
await manager.disableSubscription(emailSubId);

// 获取用户的 Push 订阅
const pushSubs = await manager.getUserPushSubscriptions("user123");
```

### 模板系统

```typescript
import {
  renderTemplateString,
  TemplateManager,
  VERIFICATION_CODE_EMAIL_TEMPLATE,
} from "jsr:@dreamer/notification";

// 简单变量替换
const text = renderTemplateString("您好 {{name}}，您的验证码是 {{code}}", {
  name: "张三",
  code: "123456",
});
// 输出: "您好 张三，您的验证码是 123456"

// 条件渲染
const conditional = renderTemplateString(
  "{{#if isVip}}尊敬的 VIP 用户{{/if}}您好",
  { isVip: true },
);

// 循环渲染
const list = renderTemplateString(
  "您的订单包含：{{#each items}}{{this.name}}、{{/each}}",
  { items: [{ name: "商品A" }, { name: "商品B" }] },
);

// 使用模板管理器
const templateManager = new TemplateManager();

// 注册预定义模板
await templateManager.register(VERIFICATION_CODE_EMAIL_TEMPLATE);

// 渲染模板
const result = await templateManager.render("verification_code_email", {
  code: "123456",
  expireMinutes: 5,
});
console.log(result.subject); // 渲染后的主题
console.log(result.html); // 渲染后的 HTML
```

### 通知队列

```typescript
import { MemoryTaskStore, NotificationQueue } from "jsr:@dreamer/notification";

// 创建 mock 发送器
const emailSender = {
  send: async (task) => {
    console.log("发送邮件:", task.recipient);
    return { success: true, messageId: `msg_${Date.now()}` };
  },
};

// 创建通知队列
const queue = new NotificationQueue({
  store: new MemoryTaskStore(),
  senders: { email: emailSender },
  concurrency: 5,
  pollInterval: 1000,
});

// 启动队列处理
await queue.start();

// 添加任务
const taskId = await queue.enqueue({
  type: "email",
  recipient: "user@example.com",
  payload: {
    subject: "通知",
    text: "这是一条通知",
  },
});

// 添加高优先级任务
await queue.enqueue({
  type: "email",
  recipient: "vip@example.com",
  payload: { subject: "紧急通知" },
  priority: "urgent",
});

// 添加定时任务
await queue.enqueue({
  type: "email",
  recipient: "user@example.com",
  payload: { subject: "定时通知" },
  scheduledAt: Date.now() + 3600000, // 1 小时后发送
});

// 获取队列统计
const stats = await queue.getStats();
console.log("待处理:", stats.pending);
console.log("已完成:", stats.completed);

// 停止队列
await queue.stop();
```

---

## 📚 API 文档

### 邮件模块

#### EmailSender

邮件发送器类。

```typescript
const sender = new EmailSender(config: EmailSenderConfig);
```

**方法**：

| 方法                     | 说明           |
| ------------------------ | -------------- |
| `send(options)`          | 发送邮件       |
| `sendTemplate(options)`  | 发送模板邮件   |
| `sendVerificationCode()` | 发送验证码邮件 |
| `sendPasswordReset()`    | 发送密码重置   |
| `sendWelcome()`          | 发送欢迎邮件   |
| `registerTemplate()`     | 注册邮件模板   |
| `getTemplate(id)`        | 获取模板       |

#### 辅助函数

| 函数                     | 说明             |
| ------------------------ | ---------------- |
| `isValidEmail(email)`    | 验证邮箱格式     |
| `validateEmails(emails)` | 批量验证邮箱     |
| `createEmailPayload()`   | 创建邮件 Payload |

### Web Push 模块

#### WebPushSender

Web Push 发送器类。

```typescript
const sender = new WebPushSender(config: WebPushConfig);
```

**方法**：

| 方法                       | 说明            |
| -------------------------- | --------------- |
| `send(subscription, data)` | 发送推送通知    |
| `sendBatch(subscriptions)` | 批量发送        |
| `getPublicKey()`           | 获取 VAPID 公钥 |

#### 辅助函数

| 函数                        | 说明              |
| --------------------------- | ----------------- |
| `generateVapidKeys()`       | 生成 VAPID 密钥对 |
| `createWebPushPayload()`    | 创建 Push Payload |
| `isValidPushSubscription()` | 验证 Push 订阅    |

### 短信模块

#### SmsSender

短信发送器类。

```typescript
const sender = new SmsSender(config: SmsSenderConfig);
```

**方法**：

| 方法                     | 说明           |
| ------------------------ | -------------- |
| `send(options)`          | 发送短信       |
| `sendVerificationCode()` | 发送验证码     |
| `getProvider()`          | 获取服务商名称 |

#### 工厂函数

| 函数                       | 说明               |
| -------------------------- | ------------------ |
| `createAliyunSmsSender()`  | 创建阿里云发送器   |
| `createTencentSmsSender()` | 创建腾讯云发送器   |
| `createTwilioSmsSender()`  | 创建 Twilio 发送器 |

#### 辅助函数

| 函数                        | 说明             |
| --------------------------- | ---------------- |
| `isValidPhoneNumber(phone)` | 验证手机号       |
| `formatPhoneNumber(phone)`  | 格式化手机号     |
| `createSmsPayload()`        | 创建短信 Payload |

### Webhook 模块

#### WebhookSender

Webhook 发送器类。

```typescript
const sender = new WebhookSender(config: WebhookSendOptions);
```

#### 辅助函数

| 函数                       | 说明         |
| -------------------------- | ------------ |
| `createWebhookPayload()`   | 创建 Payload |
| `createWebhookSignature()` | 创建签名     |
| `verifyWebhookSignature()` | 验证签名     |

### 订阅管理模块

#### SubscriptionManager

订阅管理器类。

```typescript
const manager = new SubscriptionManager(options: SubscriptionManagerOptions);
```

**方法**：

| 方法                         | 说明               |
| ---------------------------- | ------------------ |
| `addEmailSubscription()`     | 添加邮箱订阅       |
| `addSmsSubscription()`       | 添加短信订阅       |
| `addPushSubscription()`      | 添加 Push 订阅     |
| `addWebhookSubscription()`   | 添加 Webhook 订阅  |
| `getSubscription(id)`        | 获取订阅           |
| `getUserSubscriptions()`     | 获取用户订阅       |
| `getUserPushSubscriptions()` | 获取用户 Push 订阅 |
| `removeSubscription(id)`     | 删除订阅           |
| `enableSubscription(id)`     | 启用订阅           |
| `disableSubscription(id)`    | 禁用订阅           |

### 模板模块

#### TemplateManager

模板管理器类。

```typescript
const manager = new TemplateManager(options?: { defaultLocale?: string });
```

**方法**：

| 方法                 | 说明       |
| -------------------- | ---------- |
| `register(template)` | 注册模板   |
| `registerBatch()`    | 批量注册   |
| `get(id, locale?)`   | 获取模板   |
| `render(id, data)`   | 渲染模板   |
| `remove(id)`         | 删除模板   |
| `registerFilter()`   | 注册过滤器 |

#### renderTemplateString

渲染模板字符串。

```typescript
const result = renderTemplateString(template: string, data: Record<string, unknown>);
```

**支持的语法**：

- 变量：`{{variable}}` `{{object.property}}`
- 条件：`{{#if condition}}...{{/if}}`
- 循环：`{{#each items}}{{this}}{{/each}}`
- 过滤器：`{{value|upper}}` `{{value|lower}}` `{{value|capitalize}}`

### 队列模块

#### NotificationQueue

通知队列类。

```typescript
const queue = new NotificationQueue(config: QueueConfig);
```

**方法**：

| 方法             | 说明           |
| ---------------- | -------------- |
| `start()`        | 启动队列       |
| `stop()`         | 停止队列       |
| `enqueue(task)`  | 添加任务       |
| `cancelTask(id)` | 取消任务       |
| `getTask(id)`    | 获取任务       |
| `getStats()`     | 获取统计       |
| `cleanup()`      | 清理已完成任务 |
| `isRunning()`    | 检查运行状态   |

---

## 📊 测试报告

本包经过全面测试，所有 114 个测试用例均已通过。详细测试报告请查看
[TEST_REPORT.md](./TEST_REPORT.md)。

| 项目           | 详情   |
| -------------- | ------ |
| **总测试数**   | 114    |
| **通过**       | 114 ✅ |
| **失败**       | 0      |
| **分支覆盖率** | 73.0%  |
| **行覆盖率**   | 46.5%  |

| 测试模块 | 测试数量 | 状态    |
| -------- | -------- | ------- |
| 邮件发送 | 21       | ✅ 完成 |
| Web Push | 6        | ✅ 完成 |
| 短信发送 | 10       | ✅ 完成 |
| Webhook  | 4        | ✅ 完成 |
| 订阅管理 | 18       | ✅ 完成 |
| 模板系统 | 24       | ✅ 完成 |
| 通知队列 | 18       | ✅ 完成 |
| 辅助函数 | 13       | ✅ 完成 |

查看完整测试报告：[TEST_REPORT.md](./TEST_REPORT.md)

---

## 变更日志

- **[1.0.0]**（2026-02-19）— 初始版本。多渠道发送（Web
  Push、邮件、短信、Webhook）、订阅管理、模板系统、通知队列；国际化（en-US、zh-CN）。[完整变更日志](./CHANGELOG.md)

---

## 📝 注意事项

- **VAPID 密钥**：Web Push 需要生成 VAPID
  密钥对，公钥用于浏览器订阅，私钥用于服务端发送
- **短信服务商**：使用阿里云、腾讯云短信服务需要先申请签名和模板
- **Webhook 安全**：生产环境中务必验证 Webhook 签名，防止伪造请求
- **队列持久化**：默认使用内存存储，生产环境建议实现数据库存储
- **邮件发送**：需要配置有效的 SMTP 服务器

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](../../LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
