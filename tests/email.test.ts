/**
 * @fileoverview 邮件发送模块测试
 */

import { describe, it, expect, beforeEach } from "@dreamer/test";
import {
  EmailSender,
  createEmailSender,
  type EmailTemplate,
  type EmailSenderConfig,
} from "../src/email.ts";
import {
  createEmailPayload,
  isValidEmail,
  validateEmails,
  createSuccessResult,
  createErrorResult,
  generateNotificationId,
} from "../src/mod.ts";

// ============================================================================
// 辅助函数测试
// ============================================================================

describe("isValidEmail - 邮箱验证", () => {
  it("应该返回 true 对于有效邮箱", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test.user@example.co.uk")).toBe(true);
    expect(isValidEmail("user+tag@example.org")).toBe(true);
  });

  it("应该返回 false 对于无效邮箱", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user@.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("validateEmails - 批量邮箱验证", () => {
  it("应该分离有效和无效邮箱", () => {
    const emails = [
      "valid@example.com",
      "invalid",
      "another@test.org",
      "@bad.com",
    ];

    const result = validateEmails(emails);

    expect(result.valid).toEqual(["valid@example.com", "another@test.org"]);
    expect(result.invalid).toEqual(["invalid", "@bad.com"]);
  });

  it("应该处理空数组", () => {
    const result = validateEmails([]);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
  });
});

describe("createEmailPayload - 邮件 Payload 创建", () => {
  it("应该创建基本邮件 Payload", () => {
    const payload = createEmailPayload({
      to: "user@example.com",
      subject: "测试",
      text: "测试内容",
    });

    expect(payload.to).toEqual(["user@example.com"]);
    expect(payload.subject).toBe("测试");
    expect(payload.text).toBe("测试内容");
  });

  it("应该处理多个收件人", () => {
    const payload = createEmailPayload({
      to: ["user1@example.com", "user2@example.com"],
      subject: "测试",
    });

    expect(payload.to).toEqual(["user1@example.com", "user2@example.com"]);
  });

  it("应该处理抄送和密送", () => {
    const payload = createEmailPayload({
      to: "user@example.com",
      cc: "cc@example.com",
      bcc: ["bcc1@example.com", "bcc2@example.com"],
      subject: "测试",
    });

    expect(payload.cc).toEqual(["cc@example.com"]);
    expect(payload.bcc).toEqual(["bcc1@example.com", "bcc2@example.com"]);
  });

  it("应该支持 HTML 内容", () => {
    const payload = createEmailPayload({
      to: "user@example.com",
      subject: "测试",
      html: "<h1>标题</h1>",
    });

    expect(payload.html).toBe("<h1>标题</h1>");
  });
});

describe("createSuccessResult - 成功结果创建", () => {
  it("应该创建成功结果", () => {
    const result = createSuccessResult("msg_123");

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_123");
  });

  it("应该自动生成消息 ID", () => {
    const result = createSuccessResult();

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^msg_\d+$/);
  });
});

describe("createErrorResult - 错误结果创建", () => {
  it("应该创建错误结果", () => {
    const result = createErrorResult("发送失败");

    expect(result.success).toBe(false);
    expect(result.error).toBe("发送失败");
  });
});

describe("generateNotificationId - ID 生成", () => {
  it("应该生成唯一 ID", () => {
    const id1 = generateNotificationId();
    const id2 = generateNotificationId();

    expect(id1).not.toBe(id2);
  });

  it("应该使用自定义前缀", () => {
    const id = generateNotificationId("email");

    expect(id).toMatch(/^email_\d+_[a-z0-9]+$/);
  });
});

// ============================================================================
// EmailSender 类测试
// ============================================================================

describe("EmailSender - 邮件发送器", () => {
  const testConfig: EmailSenderConfig = {
    host: "smtp.example.com",
    port: 587,
    username: "test@example.com",
    password: "password",
    from: "noreply@example.com",
    fromName: "测试系统",
  };

  describe("constructor - 构造函数", () => {
    it("应该创建 EmailSender 实例", () => {
      const sender = new EmailSender(testConfig);
      expect(sender).toBeInstanceOf(EmailSender);
    });
  });

  describe("registerTemplate - 模板注册", () => {
    it("应该注册模板", () => {
      const sender = new EmailSender(testConfig);
      const template: EmailTemplate = {
        id: "welcome",
        name: "欢迎邮件",
        subject: "欢迎 {{name}}",
        html: "<h1>欢迎 {{name}}</h1>",
      };

      sender.registerTemplate(template);
      const retrieved = sender.getTemplate("welcome");

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe("welcome");
      expect(retrieved!.subject).toBe("欢迎 {{name}}");
    });

    it("应该批量注册模板", () => {
      const sender = new EmailSender(testConfig);
      const templates: EmailTemplate[] = [
        { id: "t1", name: "模板1", subject: "主题1" },
        { id: "t2", name: "模板2", subject: "主题2" },
      ];

      sender.registerTemplates(templates);

      expect(sender.getTemplate("t1")).toBeDefined();
      expect(sender.getTemplate("t2")).toBeDefined();
    });
  });

  describe("removeTemplate - 模板删除", () => {
    it("应该删除模板", () => {
      const sender = new EmailSender(testConfig);
      sender.registerTemplate({
        id: "test",
        name: "测试",
        subject: "测试",
      });

      sender.removeTemplate("test");

      expect(sender.getTemplate("test")).toBeUndefined();
    });
  });

  describe("send - 邮件发送", () => {
    it("应该返回错误对于无效邮箱", async () => {
      const sender = new EmailSender(testConfig);

      const result = await sender.send({
        to: "invalid-email",
        subject: "测试",
        text: "内容",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("无效的邮箱地址");
    });

    it("应该返回错误对于多个无效邮箱", async () => {
      const sender = new EmailSender(testConfig);

      const result = await sender.send({
        to: ["valid@example.com", "invalid", "bad@"],
        subject: "测试",
        text: "内容",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("invalid");
      expect(result.error).toContain("bad@");
    });
  });

  describe("sendTemplate - 模板邮件发送", () => {
    it("应该返回错误对于不存在的模板", async () => {
      const sender = new EmailSender(testConfig);

      const result = await sender.sendTemplate({
        to: "user@example.com",
        templateId: "nonexistent",
        variables: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("模板不存在");
    });
  });
});

describe("createEmailSender - 工厂函数", () => {
  it("应该创建 EmailSender 实例", () => {
    const sender = createEmailSender({
      host: "smtp.example.com",
      port: 587,
      username: "test@example.com",
      password: "password",
      from: "noreply@example.com",
    });

    expect(sender).toBeInstanceOf(EmailSender);
  });
});
