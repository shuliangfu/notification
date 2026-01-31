/**
 * @fileoverview 邮件通知发送模块
 *
 * 基于 @dreamer/email 库封装的邮件通知发送功能
 * 提供统一的通知接口和高级功能：
 * - 模板邮件发送
 * - 批量发送
 * - 发送结果处理
 * - 重试机制
 */

import {
  SmtpClient,
  renderTemplate,
  type Message,
  type SmtpConfig,
  type MessageOptions,
  type EmailAttachment,
} from "@dreamer/email";

// 重新导出供外部使用
export { SmtpClient, renderTemplate };
export type { Message, SmtpConfig, MessageOptions, EmailAttachment };

// 从 @dreamer/email 导入工厂函数用于导出
export { createMessage, createTemplateMessage } from "@dreamer/email";

import type { EmailConfig, EmailOptions, NotificationResult } from "./types.ts";

import { createSuccessResult, createErrorResult, generateNotificationId } from "./utils.ts";

// ============================================================================
// 邮箱验证
// ============================================================================

/**
 * 验证邮箱格式
 *
 * @param email - 邮箱地址
 * @returns 是否有效
 *
 * @example
 * ```typescript
 * isValidEmail("user@example.com"); // true
 * isValidEmail("invalid-email"); // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 批量验证邮箱
 *
 * @param emails - 邮箱列表
 * @returns 验证结果
 */
export function validateEmails(
  emails: string[]
): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  }

  return { valid, invalid };
}

/**
 * 创建邮件 Payload
 *
 * @param options - 邮件选项
 * @returns Payload 对象
 *
 * @example
 * ```typescript
 * const payload = createEmailPayload({
 *   to: "user@example.com",
 *   subject: "欢迎",
 *   html: "<h1>欢迎注册</h1>",
 * });
 * ```
 */
export function createEmailPayload(options: EmailOptions): Record<string, unknown> {
  const to = Array.isArray(options.to) ? options.to : [options.to];
  const cc = options.cc
    ? Array.isArray(options.cc)
      ? options.cc
      : [options.cc]
    : undefined;
  const bcc = options.bcc
    ? Array.isArray(options.bcc)
      ? options.bcc
      : [options.bcc]
    : undefined;

  return {
    to,
    cc,
    bcc,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
    replyTo: options.replyTo,
  };
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 邮件模板类型
 */
export interface EmailTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 主题模板 */
  subject: string;
  /** 纯文本模板 */
  text?: string;
  /** HTML 模板 */
  html?: string;
}

/**
 * 模板邮件选项
 */
export interface TemplateEmailOptions {
  /** 收件人 */
  to: string | string[];
  /** 抄送 */
  cc?: string | string[];
  /** 密送 */
  bcc?: string | string[];
  /** 模板 ID */
  templateId: string;
  /** 模板变量 */
  variables: Record<string, unknown>;
  /** 附件 */
  attachments?: EmailAttachment[];
  /** 回复地址 */
  replyTo?: string;
}

/**
 * 批量发送选项
 */
export interface BatchSendOptions {
  /** 每批发送数量（默认：10） */
  batchSize?: number;
  /** 批次间隔时间（毫秒，默认：1000） */
  delay?: number;
  /** 失败时继续发送（默认：true） */
  continueOnError?: boolean;
  /** 最大重试次数（默认：3） */
  maxRetries?: number;
  /** 重试延迟（毫秒，默认：1000） */
  retryDelay?: number;
}

/**
 * 批量发送结果
 */
export interface BatchSendResult {
  /** 总数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 详细结果 */
  results: NotificationResult[];
}

/**
 * 邮件发送器配置
 */
export interface EmailSenderConfig extends EmailConfig {
  /** 默认发件人名称 */
  fromName?: string;
  /** 是否在失败时自动重试 */
  autoRetry?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

// ============================================================================
// 邮件发送器类
// ============================================================================

/**
 * 邮件发送器
 *
 * 封装 SMTP 客户端，提供统一的邮件发送接口
 *
 * @example
 * ```typescript
 * const sender = new EmailSender({
 *   host: "smtp.example.com",
 *   port: 587,
 *   username: "user@example.com",
 *   password: "password",
 *   from: "noreply@example.com",
 *   fromName: "系统通知",
 * });
 *
 * await sender.connect();
 *
 * const result = await sender.send({
 *   to: "user@example.com",
 *   subject: "欢迎",
 *   html: "<h1>欢迎注册</h1>",
 * });
 *
 * await sender.close();
 * ```
 */
export class EmailSender {
  /** SMTP 客户端 */
  private client: SmtpClient;
  /** 发送器配置 */
  private config: EmailSenderConfig;
  /** 邮件模板存储 */
  private templates: Map<string, EmailTemplate> = new Map();
  /** 是否已连接 */
  private connected = false;

  /**
   * 创建邮件发送器
   *
   * @param config - 发送器配置
   */
  constructor(config: EmailSenderConfig) {
    this.config = {
      ...config,
      autoRetry: config.autoRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    // 创建 SMTP 客户端
    this.client = new SmtpClient({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        password: config.password,
      },
    });
  }

  /**
   * 连接到 SMTP 服务器
   *
   * @throws {Error} 连接失败时抛出错误
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    await this.client.connect();
    this.connected = true;
  }

  /**
   * 关闭 SMTP 连接
   */
  async close(): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.client.close();
    this.connected = false;
  }

  /**
   * 注册邮件模板
   *
   * @param template - 邮件模板
   */
  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 批量注册邮件模板
   *
   * @param templates - 邮件模板数组
   */
  registerTemplates(templates: EmailTemplate[]): void {
    for (const template of templates) {
      this.registerTemplate(template);
    }
  }

  /**
   * 获取邮件模板
   *
   * @param templateId - 模板 ID
   * @returns 邮件模板，如果不存在返回 undefined
   */
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 删除邮件模板
   *
   * @param templateId - 模板 ID
   */
  removeTemplate(templateId: string): void {
    this.templates.delete(templateId);
  }

  /**
   * 发送邮件
   *
   * @param options - 邮件选项
   * @returns 发送结果
   *
   * @example
   * ```typescript
   * const result = await sender.send({
   *   to: "user@example.com",
   *   subject: "欢迎",
   *   html: "<h1>欢迎注册</h1>",
   * });
   * ```
   */
  async send(options: EmailOptions): Promise<NotificationResult> {
    // 验证收件人邮箱
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const invalidEmails = recipients.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      return createErrorResult(`无效的邮箱地址: ${invalidEmails.join(", ")}`);
    }

    // 确保已连接
    if (!this.connected) {
      try {
        await this.connect();
      } catch (error) {
        return createErrorResult(
          `SMTP 连接失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // 构建邮件消息
    const messageOptions: MessageOptions = {
      from: this.config.fromName
        ? { address: this.config.from, name: this.config.fromName }
        : this.config.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
      replyTo: options.replyTo,
    };

    // 发送邮件（带重试）
    const messageId = generateNotificationId("email");
    let lastError: Error | null = null;
    const maxRetries = this.config.autoRetry ? this.config.maxRetries! : 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.client.send(messageOptions);
        return createSuccessResult(messageId);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retryDelay)
          );
        }
      }
    }

    return createErrorResult(lastError?.message || "发送失败");
  }

  /**
   * 使用模板发送邮件
   *
   * @param options - 模板邮件选项
   * @returns 发送结果
   *
   * @example
   * ```typescript
   * // 先注册模板
   * sender.registerTemplate({
   *   id: "welcome",
   *   name: "欢迎邮件",
   *   subject: "欢迎 {{name}} 加入",
   *   html: "<h1>欢迎 {{name}}</h1><p>您的账号已创建成功</p>",
   * });
   *
   * // 使用模板发送
   * const result = await sender.sendTemplate({
   *   to: "user@example.com",
   *   templateId: "welcome",
   *   variables: { name: "张三" },
   * });
   * ```
   */
  async sendTemplate(options: TemplateEmailOptions): Promise<NotificationResult> {
    // 获取模板
    const template = this.templates.get(options.templateId);
    if (!template) {
      return createErrorResult(`模板不存在: ${options.templateId}`);
    }

    // 渲染模板
    const variables = options.variables as Record<string, string>;
    const subject = renderTemplate(template.subject, variables);
    const text = template.text ? renderTemplate(template.text, variables) : undefined;
    const html = template.html ? renderTemplate(template.html, variables) : undefined;

    // 发送邮件
    return await this.send({
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject,
      text,
      html,
      attachments: options.attachments,
      replyTo: options.replyTo,
    });
  }

  /**
   * 批量发送邮件
   *
   * @param emails - 邮件选项数组
   * @param options - 批量发送选项
   * @returns 批量发送结果
   *
   * @example
   * ```typescript
   * const result = await sender.sendBatch([
   *   { to: "user1@example.com", subject: "通知", text: "内容1" },
   *   { to: "user2@example.com", subject: "通知", text: "内容2" },
   * ], { batchSize: 5, delay: 500 });
   *
   * console.log(`成功: ${result.success}, 失败: ${result.failed}`);
   * ```
   */
  async sendBatch(
    emails: EmailOptions[],
    options: BatchSendOptions = {}
  ): Promise<BatchSendResult> {
    const {
      batchSize = 10,
      delay = 1000,
      continueOnError = true,
    } = options;

    // 确保已连接
    if (!this.connected) {
      try {
        await this.connect();
      } catch (error) {
        // 连接失败，所有邮件都标记为失败
        const errorMsg = `SMTP 连接失败: ${error instanceof Error ? error.message : String(error)}`;
        return {
          total: emails.length,
          success: 0,
          failed: emails.length,
          results: emails.map(() => createErrorResult(errorMsg)),
        };
      }
    }

    // 性能优化：使用并发池处理批量发送
    const allResults: NotificationResult[] = new Array(emails.length);
    let success = 0;
    let failed = 0;
    let shouldStop = false;

    // 按批次并发发送
    for (let batchStart = 0; batchStart < emails.length; batchStart += batchSize) {
      if (shouldStop) break;

      const batchEnd = Math.min(batchStart + batchSize, emails.length);
      const batch = emails.slice(batchStart, batchEnd);

      // 并发发送当前批次
      const batchPromises = batch.map((email, idx) =>
        this.send(email).then((result) => ({
          index: batchStart + idx,
          result,
        }))
      );

      const batchResults = await Promise.all(batchPromises);

      // 处理批次结果
      for (const { index, result } of batchResults) {
        allResults[index] = result;
        if (result.success) {
          success++;
        } else {
          failed++;
          if (!continueOnError) {
            shouldStop = true;
          }
        }
      }

      // 如果中断，标记剩余邮件为失败
      if (shouldStop) {
        for (let j = batchEnd; j < emails.length; j++) {
          allResults[j] = createErrorResult("批量发送中断");
          failed++;
        }
        break;
      }

      // 批次间延迟（避免过载）
      if (batchEnd < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      total: emails.length,
      success,
      failed,
      results: allResults,
    };
  }

  /**
   * 批量使用模板发送邮件
   *
   * @param emails - 模板邮件选项数组
   * @param options - 批量发送选项
   * @returns 批量发送结果
   */
  async sendTemplateBatch(
    emails: TemplateEmailOptions[],
    options: BatchSendOptions = {}
  ): Promise<BatchSendResult> {
    const {
      batchSize = 10,
      delay = 1000,
      continueOnError = true,
    } = options;

    // 确保已连接
    if (!this.connected) {
      try {
        await this.connect();
      } catch (error) {
        const errorMsg = `SMTP 连接失败: ${error instanceof Error ? error.message : String(error)}`;
        return {
          total: emails.length,
          success: 0,
          failed: emails.length,
          results: emails.map(() => createErrorResult(errorMsg)),
        };
      }
    }

    // 性能优化：使用并发池处理批量发送
    const allResults: NotificationResult[] = new Array(emails.length);
    let success = 0;
    let failed = 0;
    let shouldStop = false;

    // 按批次并发发送
    for (let batchStart = 0; batchStart < emails.length; batchStart += batchSize) {
      if (shouldStop) break;

      const batchEnd = Math.min(batchStart + batchSize, emails.length);
      const batch = emails.slice(batchStart, batchEnd);

      // 并发发送当前批次
      const batchPromises = batch.map((email, idx) =>
        this.sendTemplate(email).then((result) => ({
          index: batchStart + idx,
          result,
        }))
      );

      const batchResults = await Promise.all(batchPromises);

      // 处理批次结果
      for (const { index, result } of batchResults) {
        allResults[index] = result;
        if (result.success) {
          success++;
        } else {
          failed++;
          if (!continueOnError) {
            shouldStop = true;
          }
        }
      }

      // 如果中断，标记剩余邮件为失败
      if (shouldStop) {
        for (let j = batchEnd; j < emails.length; j++) {
          allResults[j] = createErrorResult("批量发送中断");
          failed++;
        }
        break;
      }

      // 批次间延迟
      if (batchEnd < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      total: emails.length,
      success,
      failed,
      results: allResults,
    };
  }

  /**
   * 发送验证码邮件
   *
   * @param to - 收件人
   * @param code - 验证码
   * @param options - 额外选项
   * @returns 发送结果
   *
   * @example
   * ```typescript
   * const result = await sender.sendVerificationCode(
   *   "user@example.com",
   *   "123456",
   *   { expiresIn: 5, appName: "我的应用" }
   * );
   * ```
   */
  async sendVerificationCode(
    to: string,
    code: string,
    options: {
      /** 过期时间（分钟） */
      expiresIn?: number;
      /** 应用名称 */
      appName?: string;
      /** 自定义主题 */
      subject?: string;
    } = {}
  ): Promise<NotificationResult> {
    const { expiresIn = 5, appName = "系统", subject } = options;

    const emailSubject = subject || `【${appName}】验证码`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">验证码</h2>
        <p style="color: #666;">您的验证码是：</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #999; font-size: 14px;">
          验证码 ${expiresIn} 分钟内有效，请勿泄露给他人。
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          此邮件由 ${appName} 自动发送，请勿回复。
        </p>
      </div>
    `;

    return await this.send({
      to,
      subject: emailSubject,
      html,
    });
  }

  /**
   * 发送密码重置邮件
   *
   * @param to - 收件人
   * @param resetLink - 重置链接
   * @param options - 额外选项
   * @returns 发送结果
   */
  async sendPasswordReset(
    to: string,
    resetLink: string,
    options: {
      /** 过期时间（分钟） */
      expiresIn?: number;
      /** 应用名称 */
      appName?: string;
      /** 用户名 */
      username?: string;
    } = {}
  ): Promise<NotificationResult> {
    const { expiresIn = 30, appName = "系统", username } = options;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">密码重置</h2>
        ${username ? `<p style="color: #666;">尊敬的 ${username}：</p>` : ""}
        <p style="color: #666;">您正在重置密码，请点击下方按钮完成操作：</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            重置密码
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">
          此链接 ${expiresIn} 分钟内有效。如果您没有请求重置密码，请忽略此邮件。
        </p>
        <p style="color: #999; font-size: 12px;">
          如果按钮无法点击，请复制以下链接到浏览器：<br>
          <a href="${resetLink}" style="color: #007bff;">${resetLink}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          此邮件由 ${appName} 自动发送，请勿回复。
        </p>
      </div>
    `;

    return await this.send({
      to,
      subject: `【${appName}】密码重置`,
      html,
    });
  }

  /**
   * 发送欢迎邮件
   *
   * @param to - 收件人
   * @param options - 额外选项
   * @returns 发送结果
   */
  async sendWelcome(
    to: string,
    options: {
      /** 应用名称 */
      appName?: string;
      /** 用户名 */
      username?: string;
      /** 登录链接 */
      loginLink?: string;
    } = {}
  ): Promise<NotificationResult> {
    const { appName = "系统", username, loginLink } = options;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">欢迎加入 ${appName}！</h2>
        ${username ? `<p style="color: #666;">尊敬的 ${username}：</p>` : ""}
        <p style="color: #666;">感谢您注册成为我们的用户。您的账号已创建成功！</p>
        ${
          loginLink
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginLink}" 
             style="background: #28a745; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            立即登录
          </a>
        </div>
        `
            : ""
        }
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          此邮件由 ${appName} 自动发送，请勿回复。
        </p>
      </div>
    `;

    return await this.send({
      to,
      subject: `欢迎加入 ${appName}`,
      html,
    });
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建邮件发送器
 *
 * @param config - 发送器配置
 * @returns 邮件发送器实例
 *
 * @example
 * ```typescript
 * const sender = createEmailSender({
 *   host: "smtp.example.com",
 *   port: 587,
 *   username: "user@example.com",
 *   password: "password",
 *   from: "noreply@example.com",
 * });
 * ```
 */
export function createEmailSender(config: EmailSenderConfig): EmailSender {
  return new EmailSender(config);
}

