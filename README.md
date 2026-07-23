# @dreamer/notification

> 📖 English | [中文文档](./docs/zh-CN/README.md)

> A notification library for Deno, Bun and Node.js: multi-channel sending,
> subscription management, template system, and send queue.

[![JSR](https://jsr.io/badges/@dreamer/notification)](https://jsr.io/@dreamer/notification)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-115%20passed%20(3%20runtimes)-brightgreen)](./docs/en-US/TEST_REPORT.md)

---

## Features

Notification sending for multi-channel messaging, subscription management, and
templates: Web Push, email, SMS, Webhook, and more.

---

## Installation

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

> Requires Node.js 22+. Uses global `fetch` / `crypto.subtle` / `AbortController`
> (available in Node 22+); email sending reuses `@dreamer/email` v1.1.0
> `SmtpClient`.

---

## Environment compatibility

| Environment      | Version | Status                                              |
| ---------------- | ------- | --------------------------------------------------- |
| **Deno**         | 2.9+    | ✅ Fully supported                                  |
| **Bun**          | 1.3+    | ✅ Fully supported                                  |
| **Node.js**      | 22+     | ✅ Fully supported (since v1.1.0)                   |
| **Server**       | -       | ✅ Supported (push, email, SMS, Webhook sending)    |
| **Client**       | -       | ⚠️ Partial (Payload creation and verification only) |
| **Dependencies** | -       | 📦 @dreamer/email (for email sending)               |

---

## Capabilities

- **Multi-channel sending**:
  - Web Push: VAPID auth, payload encryption, batch push
  - Email: integrates @dreamer/email, SMTP sending
  - SMS: Aliyun, Tencent Cloud, Twilio
  - Webhook: signature verification, retry
- **Subscription management**:
  - Store and manage user subscriptions
  - Multiple subscription types (email, SMS, Push, Webhook)
  - Enable/disable subscriptions
- **Template system**:
  - Variable substitution `{{variable}}`
  - Conditionals `{{#if condition}}...{{/if}}`
  - Loops `{{#each items}}...{{/each}}`
  - Filters `{{value|upper}}`
  - Multi-language templates
- **Send queue**:
  - Priority queue (urgent, high, normal, low)
  - Scheduled send
  - Retry on failure
  - Batch processing

---

## Use cases

- **System notifications**: Verification codes, password reset, account
  activation
- **Message push**: New message alerts, order status updates
- **Marketing**: Promotions, offers
- **Monitoring**: System anomalies, service status changes

---

## Quick start

### Email sending

```typescript
import { createEmailSender, isValidEmail } from "jsr:@dreamer/notification";

if (isValidEmail("user@example.com")) {
  console.log("Email format valid");
}

const emailSender = createEmailSender({
  host: "smtp.example.com",
  port: 587,
  username: "user@example.com",
  password: "password",
  from: "noreply@example.com",
  fromName: "System",
});

const result = await emailSender.send({
  to: "user@example.com",
  subject: "Welcome",
  html: "<h1>Welcome</h1>",
});

if (result.success) {
  console.log("Sent:", result.messageId);
} else {
  console.error("Failed:", result.error);
}
```

### Web Push sending

```typescript
import {
  createWebPushSender,
  generateVapidKeys,
} from "jsr:@dreamer/notification";

const vapidKeys = await generateVapidKeys();
console.log("Public:", vapidKeys.publicKey);
console.log("Private:", vapidKeys.privateKey);

const pushSender = createWebPushSender({
  publicKey: vapidKeys.publicKey,
  privateKey: vapidKeys.privateKey,
  contact: "mailto:admin@example.com",
});

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/...",
  keys: {
    p256dh: "...",
    auth: "...",
  },
};

const result = await pushSender.send(subscription, {
  title: "New message",
  body: "You have a new message",
  icon: "/icons/notification.png",
  data: { url: "/messages/123" },
});
```

### SMS sending

```typescript
import {
  createAliyunSmsSender,
  formatPhoneNumber,
  isValidPhoneNumber,
} from "jsr:@dreamer/notification";

if (isValidPhoneNumber("13800138000")) {
  console.log("Phone format valid");
}

const formatted = formatPhoneNumber("13800138000"); // e.g. +8613800138000

const smsSender = createAliyunSmsSender(
  "accessKeyId",
  "accessKeySecret",
  "SignName",
);

const result = await smsSender.sendVerificationCode(
  "13800138000",
  "SMS_123456789",
  "1234",
);
```

### Webhook sending

```typescript
import {
  createWebhookSignature,
  verifyWebhookSignature,
  WebhookSender,
} from "jsr:@dreamer/notification";

const payload = JSON.stringify({ event: "order.created", data: { id: 123 } });
const signature = await createWebhookSignature(payload, "webhook-secret");

const isValid = await verifyWebhookSignature(
  payload,
  signature,
  "webhook-secret",
);

const webhookSender = new WebhookSender({
  url: "https://example.com/webhook",
  secret: "webhook-secret",
});

await webhookSender.send({
  event: "order.created",
  data: { orderId: 123 },
});
```

### Subscription management

```typescript
import {
  MemorySubscriptionStore,
  SubscriptionManager,
} from "jsr:@dreamer/notification";

const store = new MemorySubscriptionStore();
const manager = new SubscriptionManager({ store });

const emailSubId = await manager.addEmailSubscription(
  "user123",
  "user@example.com",
);

const pushSubId = await manager.addPushSubscription("user123", {
  endpoint: "https://...",
  keys: { p256dh: "...", auth: "..." },
});

const subscriptions = await manager.getUserSubscriptions("user123");

await manager.disableSubscription(emailSubId);

const pushSubs = await manager.getUserPushSubscriptions("user123");
```

### Template system

```typescript
import {
  renderTemplateString,
  TemplateManager,
  VERIFICATION_CODE_EMAIL_TEMPLATE,
} from "jsr:@dreamer/notification";

const text = renderTemplateString("Hello {{name}}, your code is {{code}}", {
  name: "User",
  code: "123456",
});
// Output: "Hello User, your code is 123456"

const conditional = renderTemplateString(
  "{{#if isVip}}Dear VIP{{/if}} Hello",
  { isVip: true },
);

const list = renderTemplateString(
  "Your order: {{#each items}}{{this.name}}, {{/each}}",
  { items: [{ name: "Item A" }, { name: "Item B" }] },
);

const templateManager = new TemplateManager();

await templateManager.register(VERIFICATION_CODE_EMAIL_TEMPLATE);

const result = await templateManager.render("verification_code_email", {
  code: "123456",
  expireMinutes: 5,
});
console.log(result.subject);
console.log(result.html);
```

### Notification queue

```typescript
import { MemoryTaskStore, NotificationQueue } from "jsr:@dreamer/notification";

const emailSender = {
  send: async (task: { recipient: string }) => {
    console.log("Sending to:", task.recipient);
    return { success: true, messageId: `msg_${Date.now()}` };
  },
};

const queue = new NotificationQueue({
  store: new MemoryTaskStore(),
  senders: { email: emailSender },
  concurrency: 5,
  pollInterval: 1000,
});

await queue.start();

const taskId = await queue.enqueue({
  type: "email",
  recipient: "user@example.com",
  payload: {
    subject: "Notification",
    text: "This is a notification",
  },
});

await queue.enqueue({
  type: "email",
  recipient: "vip@example.com",
  payload: { subject: "Urgent" },
  priority: "urgent",
});

await queue.enqueue({
  type: "email",
  recipient: "user@example.com",
  payload: { subject: "Scheduled" },
  scheduledAt: Date.now() + 3600000, // 1 hour later
});

const stats = await queue.getStats();
console.log("Pending:", stats.pending);
console.log("Completed:", stats.completed);

await queue.stop();
```

---

## API reference

### Email module

#### EmailSender

Email sender.

```typescript
const sender = new EmailSender(config: EmailSenderConfig);
```

**Methods**:

| Method                   | Description         |
| ------------------------ | ------------------- |
| `send(options)`          | Send email          |
| `sendTemplate(options)`  | Send templated      |
| `sendVerificationCode()` | Send verification   |
| `sendPasswordReset()`    | Send password reset |
| `sendWelcome()`          | Send welcome        |
| `registerTemplate()`     | Register template   |
| `getTemplate(id)`        | Get template        |

#### Helpers

| Function                 | Description    |
| ------------------------ | -------------- |
| `isValidEmail(email)`    | Validate email |
| `validateEmails(emails)` | Validate many  |
| `createEmailPayload()`   | Create payload |

### Web Push module

#### WebPushSender

Web Push sender.

```typescript
const sender = new WebPushSender(config: WebPushConfig);
```

**Methods**:

| Method                     | Description       |
| -------------------------- | ----------------- |
| `send(subscription, data)` | Send notification |
| `sendBatch(subscriptions)` | Batch send        |
| `getPublicKey()`           | Get VAPID public  |

#### Helpers

| Function                    | Description           |
| --------------------------- | --------------------- |
| `generateVapidKeys()`       | Generate VAPID pair   |
| `createWebPushPayload()`    | Create Push payload   |
| `isValidPushSubscription()` | Validate subscription |

### SMS module

#### SmsSender

SMS sender.

```typescript
const sender = new SmsSender(config: SmsSenderConfig);
```

**Methods**:

| Method                   | Description  |
| ------------------------ | ------------ |
| `send(options)`          | Send SMS     |
| `sendVerificationCode()` | Send code    |
| `getProvider()`          | Get provider |

#### Factory functions

| Function                   | Description    |
| -------------------------- | -------------- |
| `createAliyunSmsSender()`  | Aliyun sender  |
| `createTencentSmsSender()` | Tencent sender |
| `createTwilioSmsSender()`  | Twilio sender  |

#### Helpers

| Function                    | Description    |
| --------------------------- | -------------- |
| `isValidPhoneNumber(phone)` | Validate phone |
| `formatPhoneNumber(phone)`  | Format phone   |
| `createSmsPayload()`        | Create payload |

### Webhook module

#### WebhookSender

Webhook sender.

```typescript
const sender = new WebhookSender(config: WebhookSendOptions);
```

#### Helpers

| Function                   | Description      |
| -------------------------- | ---------------- |
| `createWebhookPayload()`   | Create payload   |
| `createWebhookSignature()` | Create signature |
| `verifyWebhookSignature()` | Verify signature |

### Subscription management

#### SubscriptionManager

Subscription manager.

```typescript
const manager = new SubscriptionManager(options: SubscriptionManagerOptions);
```

**Methods**:

| Method                       | Description              |
| ---------------------------- | ------------------------ |
| `addEmailSubscription()`     | Add email subscription   |
| `addSmsSubscription()`       | Add SMS subscription     |
| `addPushSubscription()`      | Add Push subscription    |
| `addWebhookSubscription()`   | Add Webhook subscription |
| `getSubscription(id)`        | Get subscription         |
| `getUserSubscriptions()`     | Get user subscriptions   |
| `getUserPushSubscriptions()` | Get user Push subs       |
| `removeSubscription(id)`     | Remove subscription      |
| `enableSubscription(id)`     | Enable subscription      |
| `disableSubscription(id)`    | Disable subscription     |

### Template module

#### TemplateManager

Template manager.

```typescript
const manager = new TemplateManager(options?: { defaultLocale?: string });
```

**Methods**:

| Method               | Description     |
| -------------------- | --------------- |
| `register(template)` | Register        |
| `registerBatch()`    | Batch register  |
| `get(id, locale?)`   | Get template    |
| `render(id, data)`   | Render          |
| `remove(id)`         | Remove          |
| `registerFilter()`   | Register filter |

#### renderTemplateString

Render a template string.

```typescript
const result = renderTemplateString(template: string, data: Record<string, unknown>);
```

**Syntax**:

- Variables: `{{variable}}` `{{object.property}}`
- Conditionals: `{{#if condition}}...{{/if}}`
- Loops: `{{#each items}}{{this}}{{/each}}`
- Filters: `{{value|upper}}` `{{value|lower}}` `{{value|capitalize}}`

### Queue module

#### NotificationQueue

Notification queue.

```typescript
const queue = new NotificationQueue(config: QueueConfig);
```

**Methods**:

| Method           | Description     |
| ---------------- | --------------- |
| `start()`        | Start queue     |
| `stop()`         | Stop queue      |
| `enqueue(task)`  | Add task        |
| `cancelTask(id)` | Cancel task     |
| `getTask(id)`    | Get task        |
| `getStats()`     | Get stats       |
| `cleanup()`      | Clean completed |
| `isRunning()`    | Check running   |

---

## Test report

All 114 tests pass. See [TEST_REPORT.md](./docs/en-US/TEST_REPORT.md) for
details.

| Item                | Value  |
| ------------------- | ------ |
| **Total tests**     | 114    |
| **Passed**          | 114 ✅ |
| **Failed**          | 0      |
| **Branch coverage** | 73.0%  |
| **Line coverage**   | 46.5%  |

| Module        | Count | Status  |
| ------------- | ----- | ------- |
| Email         | 21    | ✅ Done |
| Web Push      | 6     | ✅ Done |
| SMS           | 10    | ✅ Done |
| Webhook       | 4     | ✅ Done |
| Subscriptions | 18    | ✅ Done |
| Templates     | 24    | ✅ Done |
| Queue         | 18    | ✅ Done |
| Helpers       | 13    | ✅ Done |

Full report: [TEST_REPORT.md](./docs/en-US/TEST_REPORT.md)

---

## Changelog

- **[1.0.0]** (2026-02-19) — Initial release. Multi-channel sending (Web Push,
  email, SMS, Webhook), subscription management, template system, notification
  queue; i18n (en-US, zh-CN). [Full changelog](./docs/en-US/CHANGELOG.md)

---

## Documentation

- **Full (中文)**: [docs/zh-CN/README.md](./docs/zh-CN/README.md)
- **Test (EN)**: [docs/en-US/TEST_REPORT.md](./docs/en-US/TEST_REPORT.md) ·
  **Test (中文)**: [docs/zh-CN/TEST_REPORT.md](./docs/zh-CN/TEST_REPORT.md)

---

## Notes

- **VAPID keys**: Web Push requires a VAPID key pair; public key for browser
  subscription, private for server sending
- **SMS providers**: Aliyun/Tencent SMS require sign and template approval
- **Webhook security**: Always verify Webhook signatures in production
- **Queue persistence**: Default is in-memory; production should use a
  persistent store
- **Email**: Requires a valid SMTP server

---

## Contributing

Issues and Pull Requests welcome.

---

## License

Apache License 2.0 — see [LICENSE](./LICENSE)

---

<div align="center">**Made with ❤️ by Dreamer Team**</div>
