/**
 * @fileoverview Webhook 通知模块
 *
 * 提供 Webhook 相关功能：
 * - Payload 创建
 * - 签名生成和验证
 * - Webhook 发送
 */

import type {
  NotificationContent,
  NotificationResult,
  WebhookConfig,
  WebhookOptions,
} from "./types.ts";

import {
  createErrorResult,
  createSuccessResult,
  generateNotificationId,
} from "./utils.ts";

// ============================================================================
// Payload 创建
// ============================================================================

/**
 * 创建 Webhook Payload
 *
 * @param content - 通知内容
 * @param options - 选项
 * @returns Payload 对象
 */
export function createWebhookPayload(
  content: NotificationContent,
  options: WebhookOptions = {},
): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    content: {
      title: content.title,
      body: content.body,
      icon: content.icon,
      image: content.image,
      url: content.url,
      data: content.data,
    },
    options: {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
    },
  };
}

// ============================================================================
// 签名
// ============================================================================

/**
 * 创建 Webhook 签名
 *
 * @param payload - 请求体
 * @param secret - 密钥
 * @param algorithm - 算法（默认 "SHA-256"）
 * @returns 签名（Promise）
 *
 * @example
 * ```typescript
 * const signature = await createWebhookSignature(
 *   JSON.stringify(data),
 *   "your-secret"
 * );
 * ```
 */
export async function createWebhookSignature(
  payload: string,
  secret: string,
  algorithm: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, payloadData);

  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 时间戳验证配置 */
export interface TimestampValidationOptions {
  /** 时间戳（毫秒或秒） */
  timestamp?: number | string;
  /** 最大时间差（毫秒，默认 5 分钟） */
  maxAge?: number;
}

/**
 * 验证 Webhook 签名
 *
 * @param payload - 请求体
 * @param signature - 签名
 * @param secret - 密钥
 * @param algorithm - 算法
 * @param timestampOptions - 时间戳验证选项（防重放攻击）
 * @returns 验证结果对象
 *
 * @example
 * ```typescript
 * const result = await verifyWebhookSignature(
 *   body,
 *   headers["x-signature"],
 *   secret,
 *   "SHA-256",
 *   { timestamp: headers["x-timestamp"], maxAge: 300000 }
 * );
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
  timestampOptions?: TimestampValidationOptions,
): Promise<{ valid: boolean; error?: string }> {
  // 1. 验证时间戳（防重放攻击）
  if (timestampOptions?.timestamp !== undefined) {
    const maxAge = timestampOptions.maxAge ?? 300000; // 默认 5 分钟
    const timestamp = typeof timestampOptions.timestamp === "string"
      ? parseInt(timestampOptions.timestamp, 10)
      : timestampOptions.timestamp;

    // 处理秒级时间戳（自动转换）
    const normalizedTimestamp = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const age = Date.now() - normalizedTimestamp;

    if (isNaN(normalizedTimestamp)) {
      return { valid: false, error: "时间戳格式无效" };
    }

    if (age < 0) {
      return { valid: false, error: "时间戳在未来，可能是时钟偏差或攻击" };
    }

    if (age > maxAge) {
      return {
        valid: false,
        error: `请求已过期（${Math.floor(age / 1000)}秒前）`,
      };
    }
  }

  // 2. 验证签名
  const expectedSignature = await createWebhookSignature(
    payload,
    secret,
    algorithm,
  );

  // 使用时间安全比较
  if (signature.length !== expectedSignature.length) {
    return { valid: false, error: "签名长度不匹配" };
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  if (result !== 0) {
    return { valid: false, error: "签名验证失败" };
  }

  return { valid: true };
}

// ============================================================================
// Webhook 发送器
// ============================================================================

/**
 * Webhook 发送选项
 */
export interface WebhookSendOptions extends WebhookOptions {
  /** 签名头名称（默认 X-Signature） */
  signatureHeader?: string;
  /** 时间戳头名称（默认 X-Timestamp） */
  timestampHeader?: string;
}

/**
 * Webhook 发送器
 *
 * @example
 * ```typescript
 * const sender = new WebhookSender({
 *   url: "https://example.com/webhook",
 *   secret: "your-secret",
 * });
 *
 * const result = await sender.send({
 *   title: "新订单",
 *   body: "您有一个新订单",
 * });
 * ```
 */
export class WebhookSender {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = {
      method: "POST",
      ...config,
    };
  }

  /**
   * 发送 Webhook 通知
   *
   * @param content - 通知内容
   * @param options - 发送选项
   * @returns 发送结果
   */
  async send(
    content: NotificationContent,
    options: WebhookSendOptions = {},
  ): Promise<NotificationResult> {
    const {
      timeout = 30000,
      retries = 3,
      signatureHeader = "X-Signature",
      timestampHeader = "X-Timestamp",
    } = options;

    const payload = createWebhookPayload(content, options);
    const payloadString = JSON.stringify(payload);
    const timestamp = Date.now();

    // 构建请求头
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      [timestampHeader]: String(timestamp),
      ...this.config.headers,
      ...options.headers,
    };

    // 如果有密钥，添加签名
    if (this.config.secret) {
      const signature = await createWebhookSignature(
        payloadString,
        this.config.secret,
      );
      headers[signatureHeader] = signature;
    }

    // 重试发送
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(this.config.url, {
          method: this.config.method,
          headers,
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const responseData = await response.text();
          return createSuccessResult(
            generateNotificationId("webhook"),
            responseData,
          );
        } else {
          lastError = new Error(
            `HTTP ${response.status}: ${response.statusText}`,
          );
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
        }
      }
    }

    return createErrorResult(lastError?.message || "Webhook 发送失败");
  }

  /**
   * 批量发送 Webhook
   *
   * @param contents - 通知内容列表
   * @param options - 发送选项
   * @returns 发送结果列表
   */
  async sendBatch(
    contents: NotificationContent[],
    options: WebhookSendOptions = {},
  ): Promise<NotificationResult[]> {
    return await Promise.all(
      contents.map((content) => this.send(content, options)),
    );
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 Webhook 发送器
 *
 * @param config - Webhook 配置
 * @returns Webhook 发送器实例
 */
export function createWebhookSender(config: WebhookConfig): WebhookSender {
  return new WebhookSender(config);
}
