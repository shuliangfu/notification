/**
 * @fileoverview 通知模块综合测试
 */

import { beforeEach, describe, expect, it } from "@dreamer/test";
import type { SubscriptionManager, TemplateManager } from "../src/mod.ts";
import {
  createAliyunSmsSender,
  createMemoryNotificationQueue,
  createMemorySubscriptionManager,
  createSmsPayload,
  createTemplateManager,
  createTencentSmsSender,
  createTwilioSmsSender,
  createWebhookPayload,
  createWebhookSignature,
  createWebPushPayload,
  formatPhoneNumber,
  generateVapidKeys,
  getAvailableChannels,
  isValidPhoneNumber,
  isValidPushSubscription,
  MemorySubscriptionStore,
  MemoryTaskStore,
  MemoryTemplateStore,
  renderTemplateString,
  VERIFICATION_CODE_EMAIL_TEMPLATE,
  verifyWebhookSignature,
  WebPushSender,
} from "../src/mod.ts";
import { setNotificationLocale } from "../src/i18n.ts";

// 锁定中文 locale，避免 CI 英文环境下 $tr 返回英文文案导致断言失败
setNotificationLocale("zh-CN");

// ============================================================================
// Web Push 测试
// ============================================================================

describe("createWebPushPayload - Web Push Payload 创建", () => {
  it("应该创建基本 Payload", () => {
    const payload = createWebPushPayload({
      title: "测试标题",
      body: "测试内容",
    });

    expect(payload.notification).toBeDefined();
    expect((payload.notification as Record<string, unknown>).title).toBe("测试标题");
    expect((payload.notification as Record<string, unknown>).body).toBe("测试内容");
  });

  it("应该包含选项", () => {
    const payload = createWebPushPayload(
      { title: "测试", body: "内容" },
      { ttl: 3600, urgency: "high", topic: "test" },
    );

    expect((payload.options as Record<string, unknown>).ttl).toBe(3600);
    expect((payload.options as Record<string, unknown>).urgency).toBe("high");
    expect((payload.options as Record<string, unknown>).topic).toBe("test");
  });
});

describe("isValidPushSubscription - Push 订阅验证", () => {
  it("应该返回 true 对于有效订阅", () => {
    const subscription = {
      endpoint: "https://example.com/push",
      keys: {
        p256dh: "test-p256dh",
        auth: "test-auth",
      },
    };

    expect(isValidPushSubscription(subscription)).toBe(true);
  });

  it("应该返回 false 对于无效订阅", () => {
    expect(isValidPushSubscription(null)).toBe(false);
    expect(isValidPushSubscription({})).toBe(false);
    expect(isValidPushSubscription({ endpoint: "" })).toBe(false);
    expect(isValidPushSubscription({ endpoint: "test", keys: {} })).toBe(false);
  });
});

describe("generateVapidKeys - VAPID 密钥生成", () => {
  it("应该生成密钥对", async () => {
    const keys = await generateVapidKeys();

    expect(keys.publicKey).toBeDefined();
    expect(keys.privateKey).toBeDefined();
    expect(keys.publicKey.length).toBeGreaterThan(0);
    expect(keys.privateKey.length).toBeGreaterThan(0);
  });

  it("应该每次生成不同的密钥对", async () => {
    const keys1 = await generateVapidKeys();
    const keys2 = await generateVapidKeys();

    expect(keys1.publicKey).not.toBe(keys2.publicKey);
    expect(keys1.privateKey).not.toBe(keys2.privateKey);
  });
});

// ============================================================================
// SMS 测试
// ============================================================================

describe("createSmsPayload - 短信 Payload 创建", () => {
  it("应该创建基本 Payload", () => {
    const payload = createSmsPayload({
      phone: "13800138000",
      templateId: "SMS_123456",
    });

    expect(payload.phones).toEqual(["13800138000"]);
    expect(payload.templateId).toBe("SMS_123456");
  });

  it("应该支持多个手机号", () => {
    const payload = createSmsPayload({
      phone: ["13800138000", "13900139000"],
      templateId: "SMS_123456",
    });

    expect(payload.phones).toEqual(["13800138000", "13900139000"]);
  });

  it("应该包含模板参数", () => {
    const payload = createSmsPayload({
      phone: "13800138000",
      templateId: "SMS_123456",
      templateParams: { code: "123456" },
    });

    expect(payload.templateParams).toEqual({ code: "123456" });
  });
});

describe("isValidPhoneNumber - 手机号验证", () => {
  it("应该返回 true 对于中国手机号", () => {
    expect(isValidPhoneNumber("13800138000")).toBe(true);
    expect(isValidPhoneNumber("15912345678")).toBe(true);
    expect(isValidPhoneNumber("18888888888")).toBe(true);
  });

  it("应该返回 true 对于国际格式", () => {
    expect(isValidPhoneNumber("+8613800138000")).toBe(true);
    expect(isValidPhoneNumber("+14155551234")).toBe(true);
  });

  it("应该返回 false 对于无效手机号", () => {
    expect(isValidPhoneNumber("12345")).toBe(false);
    expect(isValidPhoneNumber("abcdefghijk")).toBe(false);
  });
});

describe("formatPhoneNumber - 手机号格式化", () => {
  it("应该添加中国区号", () => {
    expect(formatPhoneNumber("13800138000")).toBe("+8613800138000");
  });

  it("应该支持自定义区号", () => {
    expect(formatPhoneNumber("4155551234", "1")).toBe("+14155551234");
  });
});

describe("SmsSender - 短信发送器", () => {
  it("应该创建阿里云发送器", () => {
    const sender = createAliyunSmsSender("key", "secret", "签名");
    expect(sender.getProvider()).toBe("aliyun");
  });

  it("应该创建腾讯云发送器", () => {
    const sender = createTencentSmsSender("id", "key", "appId", "签名");
    expect(sender.getProvider()).toBe("tencent");
  });

  it("应该创建 Twilio 发送器", () => {
    const sender = createTwilioSmsSender("sid", "token", "+1234567890");
    expect(sender.getProvider()).toBe("twilio");
  });
});

// ============================================================================
// Webhook 测试
// ============================================================================

describe("createWebhookPayload - Webhook Payload 创建", () => {
  it("应该创建 Payload", () => {
    const payload = createWebhookPayload({
      title: "测试",
      body: "内容",
    });

    expect(payload.timestamp).toBeDefined();
    expect((payload.content as Record<string, unknown>).title).toBe("测试");
    expect((payload.content as Record<string, unknown>).body).toBe("内容");
  });
});

describe("Webhook 签名", () => {
  it("应该创建签名", async () => {
    const signature = await createWebhookSignature('{"test": 1}', "secret");
    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(0);
  });

  it("应该验证正确的签名", async () => {
    const payload = '{"test": 1}';
    const secret = "secret";
    const signature = await createWebhookSignature(payload, secret);
    const result = await verifyWebhookSignature(payload, signature, secret);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("应该拒绝错误的签名", async () => {
    const payload = '{"test": 1}';
    const result = await verifyWebhookSignature(
      payload,
      "wrong-signature",
      "secret",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("应该验证时间戳防止重放攻击", async () => {
    const payload = '{"test": 1}';
    const secret = "secret";
    const signature = await createWebhookSignature(payload, secret);

    // 有效时间戳
    const validResult = await verifyWebhookSignature(
      payload,
      signature,
      secret,
      "SHA-256",
      { timestamp: Date.now(), maxAge: 300000 },
    );
    expect(validResult.valid).toBe(true);

    // 过期时间戳
    const expiredResult = await verifyWebhookSignature(
      payload,
      signature,
      secret,
      "SHA-256",
      { timestamp: Date.now() - 600000, maxAge: 300000 },
    );
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.error).toContain("过期");
  });
});

// ============================================================================
// 订阅管理测试
// ============================================================================

describe("MemorySubscriptionStore - 内存订阅存储", () => {
  let store: MemorySubscriptionStore;

  beforeEach(() => {
    store = new MemorySubscriptionStore();
  });

  it("应该保存和获取订阅", async () => {
    const record = {
      id: "sub_1",
      userId: "user_1",
      type: "email" as const,
      target: "test@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    };

    await store.save(record);
    const retrieved = await store.get("sub_1");

    expect(retrieved).toBeDefined();
    expect(retrieved!.target).toBe("test@example.com");
  });

  it("应该按用户获取订阅", async () => {
    await store.save({
      id: "sub_1",
      userId: "user_1",
      type: "email",
      target: "a@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    await store.save({
      id: "sub_2",
      userId: "user_1",
      type: "sms",
      target: "13800138000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    const subs = await store.getByUser("user_1");
    expect(subs.length).toBe(2);

    const emailSubs = await store.getByUser("user_1", "email");
    expect(emailSubs.length).toBe(1);
  });
});

describe("SubscriptionManager - 订阅管理器", () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = createMemorySubscriptionManager();
  });

  it("应该添加邮箱订阅", async () => {
    const id = await manager.addEmailSubscription("user_1", "test@example.com");
    expect(id).toBeDefined();

    const sub = await manager.getSubscription(id);
    expect(sub!.target).toBe("test@example.com");
  });

  it("应该添加短信订阅", async () => {
    const id = await manager.addSmsSubscription("user_1", "13800138000");
    const sub = await manager.getSubscription(id);
    expect(sub!.type).toBe("sms");
  });

  it("应该删除订阅", async () => {
    const id = await manager.addEmailSubscription("user_1", "test@example.com");
    await manager.removeSubscription(id);
    const sub = await manager.getSubscription(id);
    expect(sub).toBeNull();
  });

  it("应该启用/禁用订阅", async () => {
    const id = await manager.addEmailSubscription("user_1", "test@example.com");

    await manager.disableSubscription(id);
    let sub = await manager.getSubscription(id);
    expect(sub!.enabled).toBe(false);

    await manager.enableSubscription(id);
    sub = await manager.getSubscription(id);
    expect(sub!.enabled).toBe(true);
  });
});

// ============================================================================
// 模板系统测试
// ============================================================================

describe("renderTemplateString - 模板渲染", () => {
  it("应该替换变量", () => {
    const result = renderTemplateString("Hello {{name}}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  it("应该支持嵌套变量", () => {
    const result = renderTemplateString("Hello {{user.name}}", {
      user: { name: "John" },
    });
    expect(result).toBe("Hello John");
  });

  it("应该支持条件渲染", () => {
    const template = "{{#if show}}Visible{{/if}}";
    expect(renderTemplateString(template, { show: true })).toBe("Visible");
    expect(renderTemplateString(template, { show: false })).toBe("");
  });

  it("应该支持循环渲染", () => {
    const template = "{{#each items}}{{this}},{{/each}}";
    const result = renderTemplateString(template, { items: ["a", "b", "c"] });
    expect(result).toBe("a,b,c,");
  });

  it("应该支持过滤器", () => {
    expect(renderTemplateString("{{name|upper}}", { name: "hello" })).toBe(
      "HELLO",
    );
    expect(renderTemplateString("{{name|lower}}", { name: "HELLO" })).toBe(
      "hello",
    );
    expect(renderTemplateString("{{name|capitalize}}", { name: "hello" })).toBe(
      "Hello",
    );
  });
});

describe("TemplateManager - 模板管理器", () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = createTemplateManager();
  });

  it("应该注册和获取模板", async () => {
    await manager.register({
      id: "test",
      name: "测试模板",
      type: "email",
      subject: "主题 {{name}}",
    });

    const template = await manager.get("test");
    expect(template).toBeDefined();
    expect(template!.subject).toBe("主题 {{name}}");
  });

  it("应该渲染模板", async () => {
    await manager.register({
      id: "welcome",
      name: "欢迎",
      type: "email",
      subject: "欢迎 {{name}}",
      html: "<h1>欢迎 {{name}}</h1>",
    });

    const result = await manager.render("welcome", { name: "张三" });
    expect(result.subject).toBe("欢迎 张三");
    expect(result.html).toBe("<h1>欢迎 张三</h1>");
  });

  it("应该注册自定义过滤器", async () => {
    manager.registerFilter(
      "reverse",
      (value) => String(value).split("").reverse().join(""),
    );

    await manager.register({
      id: "test",
      name: "测试",
      type: "email",
      body: "{{text|reverse}}",
    });

    const result = await manager.render("test", { text: "hello" });
    expect(result.body).toBe("olleh");
  });
});

describe("预定义模板", () => {
  it("VERIFICATION_CODE_EMAIL_TEMPLATE 应该存在", () => {
    expect(VERIFICATION_CODE_EMAIL_TEMPLATE).toBeDefined();
    expect(VERIFICATION_CODE_EMAIL_TEMPLATE.id).toBe("verification_code_email");
    expect(VERIFICATION_CODE_EMAIL_TEMPLATE.type).toBe("email");
  });
});

// ============================================================================
// 队列测试
// ============================================================================

describe("MemoryTaskStore - 内存任务存储", () => {
  let store: MemoryTaskStore;

  beforeEach(() => {
    store = new MemoryTaskStore();
  });

  it("应该添加和获取任务", async () => {
    const task = {
      id: "task_1",
      type: "email" as const,
      recipient: "test@example.com",
      payload: { subject: "Test", text: "Content" },
      status: "pending" as const,
      priority: "normal" as const,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };

    await store.add(task);
    const retrieved = await store.get("task_1");

    expect(retrieved).toBeDefined();
    expect(retrieved!.recipient).toBe("test@example.com");
  });

  it("应该获取待处理任务", async () => {
    await store.add({
      id: "task_1",
      type: "email",
      recipient: "a@example.com",
      payload: {},
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    await store.add({
      id: "task_2",
      type: "email",
      recipient: "b@example.com",
      payload: {},
      status: "completed",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    const pending = await store.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe("task_1");
  });

  it("应该按优先级排序", async () => {
    await store.add({
      id: "task_low",
      type: "email",
      recipient: "a@example.com",
      payload: {},
      status: "pending",
      priority: "low",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    await store.add({
      id: "task_high",
      type: "email",
      recipient: "b@example.com",
      payload: {},
      status: "pending",
      priority: "high",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    const pending = await store.getPending();
    expect(pending[0].id).toBe("task_high");
    expect(pending[1].id).toBe("task_low");
  });

  it("应该返回任务统计", async () => {
    await store.add({
      id: "task_1",
      type: "email",
      recipient: "",
      payload: {},
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    await store.add({
      id: "task_2",
      type: "email",
      recipient: "",
      payload: {},
      status: "completed",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    const stats = await store.getStats();
    expect(stats.pending).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.total).toBe(2);
  });
});

describe("NotificationQueue - 通知队列", () => {
  it("应该添加任务", async () => {
    const queue = createMemoryNotificationQueue({});
    const taskId = await queue.enqueue({
      type: "email",
      recipient: "test@example.com",
      payload: { subject: "Test" },
    });

    expect(taskId).toBeDefined();

    const task = await queue.getTask(taskId);
    expect(task).toBeDefined();
    expect(task!.status).toBe("pending");
  });

  it("应该取消任务", async () => {
    const queue = createMemoryNotificationQueue({});
    const taskId = await queue.enqueue({
      type: "email",
      recipient: "test@example.com",
      payload: {},
    });

    const cancelled = await queue.cancelTask(taskId);
    expect(cancelled).toBe(true);

    const task = await queue.getTask(taskId);
    expect(task!.status).toBe("cancelled");
  });

  it("应该支持延迟发送", async () => {
    const queue = createMemoryNotificationQueue({});
    const futureTime = Date.now() + 60000;

    const taskId = await queue.enqueue({
      type: "email",
      recipient: "test@example.com",
      payload: {},
      scheduledAt: futureTime,
    });

    const task = await queue.getTask(taskId);
    expect(task!.scheduledAt).toBe(futureTime);
  });

  it("应该支持优先级", async () => {
    const queue = createMemoryNotificationQueue({});

    await queue.enqueue({
      type: "email",
      recipient: "a@example.com",
      payload: {},
      priority: "low",
    });

    await queue.enqueue({
      type: "email",
      recipient: "b@example.com",
      payload: {},
      priority: "urgent",
    });

    const stats = await queue.getStats();
    expect(stats.pending).toBe(2);
  });
});

// ============================================================================
// 辅助功能测试
// ============================================================================

describe("getAvailableChannels - 获取可用渠道", () => {
  it("应该返回配置的渠道", () => {
    const channels = getAvailableChannels({
      webpush: { publicKey: "", privateKey: "", contact: "" },
      email: { host: "", port: 587, username: "", password: "", from: "" },
    });

    expect(channels).toContain("webpush");
    expect(channels).toContain("email");
    expect(channels).not.toContain("sms");
  });

  it("应该返回空数组对于空配置", () => {
    const channels = getAvailableChannels({});
    expect(channels).toEqual([]);
  });

  it("应该返回所有渠道", () => {
    const channels = getAvailableChannels({
      webpush: { publicKey: "", privateKey: "", contact: "" },
      email: { host: "", port: 587, username: "", password: "", from: "" },
      sms: {
        provider: "aliyun",
        accessKeyId: "key",
        accessKeySecret: "secret",
      },
    });

    expect(channels).toContain("webpush");
    expect(channels).toContain("email");
    expect(channels).toContain("sms");
  });
});

// ============================================================================
// WebPushSender 扩展测试
// ============================================================================

describe("WebPushSender - Web Push 发送器", () => {
  it("应该创建发送器实例", async () => {
    const keys = await generateVapidKeys();
    const sender = new WebPushSender({
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      contact: "mailto:test@example.com",
    });

    expect(sender).toBeInstanceOf(WebPushSender);
  });

  it("应该获取公钥", async () => {
    const keys = await generateVapidKeys();
    const sender = new WebPushSender({
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      contact: "mailto:test@example.com",
    });

    const publicKey = sender.getPublicKey();
    expect(publicKey).toBe(keys.publicKey);
  });
});

// ============================================================================
// MemorySubscriptionStore 扩展测试
// ============================================================================

describe("MemorySubscriptionStore - 扩展测试", () => {
  let store: MemorySubscriptionStore;

  beforeEach(() => {
    store = new MemorySubscriptionStore();
  });

  it("应该更新订阅", async () => {
    await store.save({
      id: "sub_1",
      userId: "user_1",
      type: "email",
      target: "old@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    await store.update("sub_1", { target: "new@example.com", enabled: false });
    const updated = await store.get("sub_1");

    expect(updated!.target).toBe("new@example.com");
    expect(updated!.enabled).toBe(false);
  });

  it("应该检查订阅是否存在", async () => {
    await store.save({
      id: "sub_1",
      userId: "user_1",
      type: "email",
      target: "test@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    expect(await store.has("sub_1")).toBe(true);
    expect(await store.has("nonexistent")).toBe(false);
  });

  it("应该删除订阅", async () => {
    await store.save({
      id: "sub_1",
      userId: "user_1",
      type: "email",
      target: "test@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    await store.delete("sub_1");
    expect(await store.get("sub_1")).toBeNull();
  });

  it("应该清空所有订阅", async () => {
    await store.save({
      id: "sub_1",
      userId: "user_1",
      type: "email",
      target: "a@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    await store.save({
      id: "sub_2",
      userId: "user_2",
      type: "sms",
      target: "13800138000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    await store.clear();
    expect(store.getAll().length).toBe(0);
  });

  it("应该按类型获取订阅", async () => {
    await store.save({
      id: "sub_1",
      userId: "user_1",
      type: "email",
      target: "a@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    await store.save({
      id: "sub_2",
      userId: "user_2",
      type: "sms",
      target: "13800138000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    const emailSubs = await store.getByType("email");
    expect(emailSubs.length).toBe(1);
    expect(emailSubs[0].type).toBe("email");
  });

  it("应该只返回启用的订阅", async () => {
    await store.save({
      id: "sub_1",
      userId: "user_1",
      type: "email",
      target: "a@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    });

    await store.save({
      id: "sub_2",
      userId: "user_2",
      type: "email",
      target: "b@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: false,
    });

    const emailSubs = await store.getByType("email");
    expect(emailSubs.length).toBe(1);
    expect(emailSubs[0].target).toBe("a@example.com");
  });

  it("应该返回 null 对于不存在的订阅", async () => {
    const result = await store.get("nonexistent");
    expect(result).toBeNull();
  });
});

// ============================================================================
// SubscriptionManager 扩展测试
// ============================================================================

describe("SubscriptionManager - 扩展测试", () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = createMemorySubscriptionManager();
  });

  it("应该添加 WebPush 订阅", async () => {
    const subscription = {
      endpoint: "https://example.com/push",
      keys: { p256dh: "key1", auth: "key2" },
    };

    const id = await manager.addPushSubscription("user_1", subscription);
    const sub = await manager.getSubscription(id);

    expect(sub!.type).toBe("webpush");
    // target 是订阅对象
    const target = sub!.target as typeof subscription;
    expect(target.endpoint).toBe("https://example.com/push");
  });

  it("应该添加 Webhook 订阅", async () => {
    const id = await manager.addWebhookSubscription(
      "user_1",
      "https://example.com/webhook",
      { secret: "secret123" },
    );
    const sub = await manager.getSubscription(id);

    expect(sub!.type).toBe("webhook");
    expect(sub!.target).toBe("https://example.com/webhook");
    expect(sub!.metadata!.secret).toBe("secret123");
  });

  it("应该获取用户订阅", async () => {
    await manager.addEmailSubscription("user_1", "a@example.com");
    await manager.addSmsSubscription("user_1", "13800138000");
    await manager.addEmailSubscription("user_2", "b@example.com");

    const user1Subs = await manager.getUserSubscriptions("user_1");
    expect(user1Subs.length).toBe(2);
  });

  it("应该获取用户 Push 订阅", async () => {
    const subscription = {
      endpoint: "https://example.com/push",
      keys: { p256dh: "key1", auth: "key2" },
    };

    await manager.addPushSubscription("user_1", subscription);
    await manager.addEmailSubscription("user_1", "a@example.com");

    const pushSubs = await manager.getUserPushSubscriptions("user_1");
    expect(pushSubs.length).toBe(1);
    expect(pushSubs[0].endpoint).toBe("https://example.com/push");
  });

  it("应该按类型获取所有订阅", async () => {
    await manager.addEmailSubscription("user_1", "a@example.com");
    await manager.addEmailSubscription("user_2", "b@example.com");
    await manager.addSmsSubscription("user_1", "13800138000");

    const emailSubs = await manager.getAllByType("email");
    expect(emailSubs.length).toBe(2);
  });
});

// ============================================================================
// MemoryTaskStore 扩展测试
// ============================================================================

describe("MemoryTaskStore - 扩展测试", () => {
  let store: MemoryTaskStore;

  beforeEach(() => {
    store = new MemoryTaskStore();
  });

  it("应该更新任务", async () => {
    await store.add({
      id: "task_1",
      type: "email",
      recipient: "test@example.com",
      payload: {},
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    await store.update("task_1", { status: "processing" });
    const task = await store.get("task_1");

    expect(task!.status).toBe("processing");
  });

  it("应该删除任务", async () => {
    await store.add({
      id: "task_1",
      type: "email",
      recipient: "test@example.com",
      payload: {},
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    await store.delete("task_1");
    const task = await store.get("task_1");

    expect(task).toBeNull();
  });

  it("应该获取可重试任务", async () => {
    await store.add({
      id: "task_1",
      type: "email",
      recipient: "a@example.com",
      payload: {},
      status: "failed",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 1,
      maxRetries: 3,
    });

    await store.add({
      id: "task_2",
      type: "email",
      recipient: "b@example.com",
      payload: {},
      status: "failed",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 3,
      maxRetries: 3,
    });

    const retryable = await store.getRetryable();
    expect(retryable.length).toBe(1);
    expect(retryable[0].id).toBe("task_1");
  });

  it("应该清理已完成任务", async () => {
    const oldTime = Date.now() - 100000;

    await store.add({
      id: "task_old",
      type: "email",
      recipient: "a@example.com",
      payload: {},
      status: "completed",
      priority: "normal",
      createdAt: oldTime,
      completedAt: oldTime,
      retryCount: 0,
      maxRetries: 3,
    });

    await store.add({
      id: "task_new",
      type: "email",
      recipient: "b@example.com",
      payload: {},
      status: "completed",
      priority: "normal",
      createdAt: Date.now(),
      completedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    const cleaned = await store.cleanup(50000);
    expect(cleaned).toBe(1);

    const remaining = store.getAll();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe("task_new");
  });

  it("应该返回 null 对于不存在的任务", async () => {
    const task = await store.get("nonexistent");
    expect(task).toBeNull();
  });

  it("应该排除计划时间未到的任务", async () => {
    const futureTime = Date.now() + 60000;

    await store.add({
      id: "task_future",
      type: "email",
      recipient: "a@example.com",
      payload: {},
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      scheduledAt: futureTime,
      retryCount: 0,
      maxRetries: 3,
    });

    await store.add({
      id: "task_now",
      type: "email",
      recipient: "b@example.com",
      payload: {},
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    const pending = await store.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe("task_now");
  });

  it("应该按紧急优先级排序", async () => {
    await store.add({
      id: "task_normal",
      type: "email",
      recipient: "",
      payload: {},
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    await store.add({
      id: "task_urgent",
      type: "email",
      recipient: "",
      payload: {},
      status: "pending",
      priority: "urgent",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    const pending = await store.getPending();
    expect(pending[0].id).toBe("task_urgent");
    expect(pending[1].id).toBe("task_normal");
  });
});

// ============================================================================
// NotificationQueue 扩展测试
// ============================================================================

describe("NotificationQueue - 扩展测试", () => {
  it("应该获取队列统计", async () => {
    const queue = createMemoryNotificationQueue({});

    await queue.enqueue({
      type: "email",
      recipient: "a@example.com",
      payload: {},
    });
    await queue.enqueue({
      type: "email",
      recipient: "b@example.com",
      payload: {},
    });

    const stats = await queue.getStats();
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
  });

  it("应该清理已完成任务", async () => {
    const queue = createMemoryNotificationQueue({});
    const cleaned = await queue.cleanup(1000);
    expect(cleaned).toBe(0);
  });

  it("应该返回 false 对于不存在的任务取消", async () => {
    const queue = createMemoryNotificationQueue({});
    const cancelled = await queue.cancelTask("nonexistent");
    expect(cancelled).toBe(false);
  });

  // 注意：队列启动/停止测试会产生计时器泄漏，在集成测试中处理
});

// ============================================================================
// TemplateManager 扩展测试
// ============================================================================

describe("TemplateManager - 扩展测试", () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = createTemplateManager();
  });

  it("应该批量注册模板", async () => {
    await manager.registerBatch([
      { id: "t1", name: "模板1", type: "email", subject: "主题1" },
      { id: "t2", name: "模板2", type: "sms", body: "内容2" },
    ]);

    const t1 = await manager.get("t1");
    const t2 = await manager.get("t2");

    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
  });

  it("应该删除模板", async () => {
    await manager.register({ id: "test", name: "测试", type: "email" });
    await manager.remove("test");

    const template = await manager.get("test");
    expect(template).toBeNull();
  });

  it("应该获取所有模板", async () => {
    await manager.register({ id: "t1", name: "模板1", type: "email" });
    await manager.register({ id: "t2", name: "模板2", type: "sms" });

    const all = await manager.getAll();
    expect(all.length).toBe(2);
  });

  it("应该按类型获取模板", async () => {
    await manager.register({ id: "t1", name: "模板1", type: "email" });
    await manager.register({ id: "t2", name: "模板2", type: "sms" });
    await manager.register({ id: "t3", name: "模板3", type: "email" });

    const emailTemplates = await manager.getByType("email");
    expect(emailTemplates.length).toBe(2);
  });

  it("应该抛出错误对于不存在的模板渲染", async () => {
    let error: Error | null = null;
    try {
      await manager.render("nonexistent", {});
    } catch (e) {
      error = e as Error;
    }
    expect(error).not.toBeNull();
    expect(error!.message).toContain("模板不存在");
  });

  it("应该支持多语言模板", async () => {
    await manager.register({
      id: "greeting",
      name: "问候",
      type: "email",
      subject: "Hello {{name}}",
      body: "Welcome {{name}}",
    });

    await manager.register({
      id: "greeting",
      name: "问候",
      type: "email",
      locale: "zh-CN",
      subject: "你好 {{name}}",
      body: "欢迎 {{name}}",
    });

    const enResult = await manager.render("greeting", { name: "John" }, {
      locale: "en",
    });
    expect(enResult.subject).toBe("Hello John");

    const zhResult = await manager.render("greeting", { name: "张三" }, {
      locale: "zh-CN",
    });
    expect(zhResult.subject).toBe("你好 张三");
  });
});

// ============================================================================
// MemoryTemplateStore 扩展测试
// ============================================================================

describe("MemoryTemplateStore - 扩展测试", () => {
  let store: MemoryTemplateStore;

  beforeEach(() => {
    store = new MemoryTemplateStore();
  });

  it("应该保存和获取模板", async () => {
    await store.save({
      id: "test",
      name: "测试模板",
      type: "email",
      subject: "主题",
    });

    const template = await store.get("test");
    expect(template).toBeDefined();
    expect(template!.name).toBe("测试模板");
  });

  it("应该支持语言版本", async () => {
    await store.save({
      id: "test",
      name: "测试",
      type: "email",
      subject: "Subject",
    });

    await store.save({
      id: "test",
      name: "测试",
      type: "email",
      locale: "zh-CN",
      subject: "主题",
    });

    const enTemplate = await store.get("test");
    expect(enTemplate!.subject).toBe("Subject");

    const zhTemplate = await store.get("test", "zh-CN");
    expect(zhTemplate!.subject).toBe("主题");
  });

  it("应该删除模板及其语言版本", async () => {
    await store.save({ id: "test", name: "测试", type: "email" });
    await store.save({
      id: "test",
      name: "测试",
      type: "email",
      locale: "zh-CN",
    });

    await store.delete("test");

    expect(await store.get("test")).toBeNull();
    expect(await store.get("test", "zh-CN")).toBeNull();
  });

  it("应该获取所有模板", async () => {
    await store.save({ id: "t1", name: "模板1", type: "email" });
    await store.save({ id: "t2", name: "模板2", type: "sms" });

    const all = await store.getAll();
    expect(all.length).toBe(2);
  });

  it("应该按类型获取模板", async () => {
    await store.save({ id: "t1", name: "模板1", type: "email" });
    await store.save({ id: "t2", name: "模板2", type: "sms" });

    const emailTemplates = await store.getByType("email");
    expect(emailTemplates.length).toBe(1);
    expect(emailTemplates[0].id).toBe("t1");
  });
});

// ============================================================================
// renderTemplateString 扩展测试
// ============================================================================

describe("renderTemplateString - 扩展测试", () => {
  it("应该处理未定义的变量", () => {
    const result = renderTemplateString("Hello {{name}}", {});
    expect(result).toBe("Hello ");
  });

  it("应该处理空循环", () => {
    const template = "{{#each items}}{{this}}{{/each}}";
    const result = renderTemplateString(template, { items: [] });
    expect(result).toBe("");
  });

  it("应该支持深层嵌套变量", () => {
    const result = renderTemplateString("{{a.b.c.d}}", {
      a: { b: { c: { d: "deep" } } },
    });
    expect(result).toBe("deep");
  });

  it("应该处理基本数组循环", () => {
    const template = "{{#each items}}[{{this}}]{{/each}}";
    const result = renderTemplateString(template, { items: ["a", "b", "c"] });
    expect(result).toBe("[a][b][c]");
  });

  it("应该正确处理 if 条件为 false", () => {
    const template = "{{#if show}}Visible{{/if}}Hidden";
    expect(renderTemplateString(template, { show: false })).toBe("Hidden");
  });
});

// ============================================================================
// SmsSender 扩展测试
// ============================================================================

describe("SmsSender - 扩展测试", () => {
  it("应该验证无效手机号", async () => {
    const sender = createAliyunSmsSender("key", "secret", "签名");

    const result = await sender.send({
      phone: ["invalid"],
      templateId: "SMS_123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("无效");
  });

  it("应该验证多个手机号中的无效号码", async () => {
    const sender = createAliyunSmsSender("key", "secret", "签名");

    const result = await sender.send({
      phone: ["13800138000", "invalid", "12345"],
      templateId: "SMS_123",
    });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// 预定义模板扩展测试
// ============================================================================

import {
  NEW_MESSAGE_PUSH_TEMPLATE,
  PASSWORD_RESET_EMAIL_TEMPLATE,
  VERIFICATION_CODE_SMS_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
} from "../src/mod.ts";

describe("预定义模板 - 扩展测试", () => {
  it("VERIFICATION_CODE_SMS_TEMPLATE 应该存在", () => {
    expect(VERIFICATION_CODE_SMS_TEMPLATE).toBeDefined();
    expect(VERIFICATION_CODE_SMS_TEMPLATE.id).toBe("verification_code_sms");
    expect(VERIFICATION_CODE_SMS_TEMPLATE.type).toBe("sms");
  });

  it("WELCOME_EMAIL_TEMPLATE 应该存在", () => {
    expect(WELCOME_EMAIL_TEMPLATE).toBeDefined();
    expect(WELCOME_EMAIL_TEMPLATE.id).toBe("welcome_email");
    expect(WELCOME_EMAIL_TEMPLATE.type).toBe("email");
  });

  it("PASSWORD_RESET_EMAIL_TEMPLATE 应该存在", () => {
    expect(PASSWORD_RESET_EMAIL_TEMPLATE).toBeDefined();
    expect(PASSWORD_RESET_EMAIL_TEMPLATE.id).toBe("password_reset_email");
    expect(PASSWORD_RESET_EMAIL_TEMPLATE.type).toBe("email");
  });

  it("NEW_MESSAGE_PUSH_TEMPLATE 应该存在", () => {
    expect(NEW_MESSAGE_PUSH_TEMPLATE).toBeDefined();
    expect(NEW_MESSAGE_PUSH_TEMPLATE.id).toBe("new_message_push");
    expect(NEW_MESSAGE_PUSH_TEMPLATE.type).toBe("webpush");
  });
});
