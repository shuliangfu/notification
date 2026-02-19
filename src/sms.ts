/**
 * @fileoverview 短信发送模块
 *
 * 支持多个短信服务提供商：
 * - 阿里云短信
 * - 腾讯云短信
 * - Twilio
 */

import type { NotificationResult, SmsOptions } from "./types.ts";

import { $tr } from "./i18n.ts";
import {
  createErrorResult,
  createSuccessResult,
  generateNotificationId,
} from "./utils.ts";

// ============================================================================
// 手机号验证
// ============================================================================

/**
 * 验证手机号格式（中国大陆）
 *
 * @param phone - 手机号
 * @returns 是否有效
 *
 * @example
 * ```typescript
 * isValidPhoneNumber("13800138000"); // true
 * isValidPhoneNumber("12345"); // false
 * ```
 */
export function isValidPhoneNumber(phone: string): boolean {
  // 中国大陆手机号
  const chinaRegex = /^1[3-9]\d{9}$/;
  // 国际格式
  const internationalRegex = /^\+?[1-9]\d{6,14}$/;

  return chinaRegex.test(phone) || internationalRegex.test(phone);
}

/**
 * 格式化手机号（添加国际区号）
 *
 * @param phone - 手机号
 * @param countryCode - 国家区号（默认 "86"）
 * @returns 格式化后的手机号
 */
export function formatPhoneNumber(phone: string, countryCode = "86"): string {
  // 移除所有非数字字符
  const cleaned = phone.replace(/\D/g, "");

  // 如果已经有国际区号，直接返回
  if (cleaned.startsWith(countryCode)) {
    return `+${cleaned}`;
  }

  return `+${countryCode}${cleaned}`;
}

/**
 * 创建短信 Payload
 *
 * @param options - 短信选项
 * @returns Payload 对象
 *
 * @example
 * ```typescript
 * const payload = createSmsPayload({
 *   phone: "13800138000",
 *   templateId: "SMS_123456",
 *   templateParams: { code: "123456" },
 * });
 * ```
 */
export function createSmsPayload(options: SmsOptions): Record<string, unknown> {
  const phones = Array.isArray(options.phone) ? options.phone : [options.phone];

  return {
    phones,
    templateId: options.templateId,
    templateParams: options.templateParams,
    signName: options.signName,
  };
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 阿里云短信配置
 */
export interface AliyunSmsConfig {
  /** 服务提供商 */
  provider: "aliyun";
  /** Access Key ID */
  accessKeyId: string;
  /** Access Key Secret */
  accessKeySecret: string;
  /** 签名名称 */
  signName: string;
  /** 区域（默认：cn-hangzhou） */
  region?: string;
  /** API 版本（默认：2017-05-25） */
  apiVersion?: string;
}

/**
 * 腾讯云短信配置
 */
export interface TencentSmsConfig {
  /** 服务提供商 */
  provider: "tencent";
  /** Secret ID */
  secretId: string;
  /** Secret Key */
  secretKey: string;
  /** SDK App ID */
  sdkAppId: string;
  /** 签名名称 */
  signName: string;
  /** 区域（默认：ap-guangzhou） */
  region?: string;
}

/**
 * Twilio 短信配置
 */
export interface TwilioSmsConfig {
  /** 服务提供商 */
  provider: "twilio";
  /** Account SID */
  accountSid: string;
  /** Auth Token */
  authToken: string;
  /** 发送号码 */
  fromNumber: string;
}

/**
 * 统一短信配置类型
 */
export type SmsSenderConfig =
  | AliyunSmsConfig
  | TencentSmsConfig
  | TwilioSmsConfig;

/**
 * 发送短信选项
 */
export interface SmsSendOptions {
  /** 手机号（支持单个或多个） */
  phone: string | string[];
  /** 模板 ID */
  templateId: string;
  /** 模板参数 */
  templateParams?: Record<string, string>;
  /** 签名（覆盖默认签名） */
  signName?: string;
}

/**
 * 批量发送结果
 */
export interface BatchSmsResult {
  /** 总数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 详细结果 */
  results: Array<{
    phone: string;
    result: NotificationResult;
  }>;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成 HMAC-SHA256 签名
 *
 * @param key - 密钥
 * @param data - 数据
 * @returns 签名（十六进制）
 */
async function hmacSha256(
  key: string | Uint8Array,
  data: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  // 转换为 ArrayBuffer
  const keyBuffer = keyData.buffer.slice(
    keyData.byteOffset,
    keyData.byteOffset + keyData.byteLength,
  ) as ArrayBuffer;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 生成 HMAC-SHA256 签名（返回 Uint8Array）
 */
async function hmacSha256Bytes(
  key: Uint8Array,
  data: string,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  // 转换为 ArrayBuffer
  const keyBuffer = key.buffer.slice(
    key.byteOffset,
    key.byteOffset + key.byteLength,
  ) as ArrayBuffer;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );

  return new Uint8Array(signature);
}

/**
 * SHA256 哈希
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(data),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// 阿里云短信发送
// ============================================================================

/**
 * 阿里云短信发送器
 */
class AliyunSmsSender {
  private config: AliyunSmsConfig;

  constructor(config: AliyunSmsConfig) {
    this.config = {
      ...config,
      region: config.region || "cn-hangzhou",
      apiVersion: config.apiVersion || "2017-05-25",
    };
  }

  /**
   * 发送短信
   */
  async send(options: SmsSendOptions): Promise<NotificationResult> {
    const phones = Array.isArray(options.phone)
      ? options.phone
      : [options.phone];

    // 验证手机号
    const invalidPhones = phones.filter((p) => !isValidPhoneNumber(p));
    if (invalidPhones.length > 0) {
      return createErrorResult(`无效的手机号: ${invalidPhones.join(", ")}`);
    }

    try {
      const timestamp = new Date().toISOString().replace(/\.\d{3}/, "");
      const nonce = crypto.randomUUID();

      const params: Record<string, string> = {
        AccessKeyId: this.config.accessKeyId,
        Action: "SendSms",
        Format: "JSON",
        PhoneNumbers: phones.join(","),
        SignName: options.signName || this.config.signName,
        SignatureMethod: "HMAC-SHA1",
        SignatureNonce: nonce,
        SignatureVersion: "1.0",
        TemplateCode: options.templateId,
        Timestamp: timestamp,
        Version: this.config.apiVersion!,
      };

      if (options.templateParams) {
        params.TemplateParam = JSON.stringify(options.templateParams);
      }

      // 按字母顺序排序参数
      const sortedKeys = Object.keys(params).sort();
      const canonicalQuery = sortedKeys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join("&");

      // 计算签名
      const stringToSign = `GET&${encodeURIComponent("/")}&${
        encodeURIComponent(canonicalQuery)
      }`;
      const signature = await this.sign(stringToSign);

      // 发送请求
      const url = `https://dysmsapi.aliyuncs.com/?${canonicalQuery}&Signature=${
        encodeURIComponent(signature)
      }`;

      const response = await fetch(url, { method: "GET" });
      const data = await response.json();

      if (data.Code === "OK") {
        return createSuccessResult(data.BizId || generateNotificationId("sms"));
      } else {
        return createErrorResult(
          `阿里云短信发送失败: ${data.Message || data.Code}`,
        );
      }
    } catch (error) {
      return createErrorResult(
        `阿里云短信发送失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * HMAC-SHA1 签名
   */
  private async sign(stringToSign: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = encoder.encode(this.config.accessKeySecret + "&");

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(stringToSign),
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
}

// ============================================================================
// 腾讯云短信发送
// ============================================================================

/**
 * 腾讯云短信发送器
 */
class TencentSmsSender {
  private config: TencentSmsConfig;

  constructor(config: TencentSmsConfig) {
    this.config = {
      ...config,
      region: config.region || "ap-guangzhou",
    };
  }

  /**
   * 发送短信
   */
  async send(options: SmsSendOptions): Promise<NotificationResult> {
    const phones = Array.isArray(options.phone)
      ? options.phone
      : [options.phone];

    // 验证并格式化手机号
    const formattedPhones = phones.map((p) => {
      if (!isValidPhoneNumber(p)) {
        throw new Error($tr("notification.sms.invalidPhone", { phone: p }));
      }
      // 腾讯云需要 +86 格式
      return formatPhoneNumber(p);
    });

    try {
      const service = "sms";
      const host = "sms.tencentcloudapi.com";
      const action = "SendSms";
      const version = "2021-01-11";
      const region = this.config.region!;
      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date(timestamp * 1000).toISOString().split("T")[0];

      const payload = {
        PhoneNumberSet: formattedPhones,
        SmsSdkAppId: this.config.sdkAppId,
        SignName: options.signName || this.config.signName,
        TemplateId: options.templateId,
        TemplateParamSet: options.templateParams
          ? Object.values(options.templateParams)
          : undefined,
      };

      const payloadStr = JSON.stringify(payload);

      // 计算签名
      const hashedPayload = await sha256(payloadStr);

      const canonicalRequest = [
        "POST",
        "/",
        "",
        `content-type:application/json; charset=utf-8`,
        `host:${host}`,
        "",
        "content-type;host",
        hashedPayload,
      ].join("\n");

      const hashedCanonicalRequest = await sha256(canonicalRequest);
      const credentialScope = `${date}/${service}/tc3_request`;
      const stringToSign = [
        "TC3-HMAC-SHA256",
        timestamp,
        credentialScope,
        hashedCanonicalRequest,
      ].join("\n");

      // 派生签名密钥
      const encoder = new TextEncoder();
      const secretDate = await hmacSha256Bytes(
        encoder.encode("TC3" + this.config.secretKey),
        date,
      );
      const secretService = await hmacSha256Bytes(secretDate, service);
      const secretSigning = await hmacSha256Bytes(secretService, "tc3_request");
      const signature = await hmacSha256(secretSigning, stringToSign);

      // 构建 Authorization
      const authorization = [
        "TC3-HMAC-SHA256",
        `Credential=${this.config.secretId}/${credentialScope}`,
        "SignedHeaders=content-type;host",
        `Signature=${signature}`,
      ].join(", ");

      // 发送请求
      const response = await fetch(`https://${host}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Host: host,
          "X-TC-Action": action,
          "X-TC-Version": version,
          "X-TC-Region": region,
          "X-TC-Timestamp": String(timestamp),
          Authorization: authorization,
        },
        body: payloadStr,
      });

      const data = await response.json();

      if (data.Response?.SendStatusSet?.[0]?.Code === "Ok") {
        return createSuccessResult(
          data.Response.SendStatusSet[0].SerialNo ||
            generateNotificationId("sms"),
        );
      } else {
        const errorMsg = data.Response?.Error?.Message ||
          data.Response?.SendStatusSet?.[0]?.Message ||
          "未知错误";
        return createErrorResult(`腾讯云短信发送失败: ${errorMsg}`);
      }
    } catch (error) {
      return createErrorResult(
        `腾讯云短信发送失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

// ============================================================================
// Twilio 短信发送
// ============================================================================

/**
 * Twilio 短信发送器
 */
class TwilioSmsSender {
  private config: TwilioSmsConfig;

  constructor(config: TwilioSmsConfig) {
    this.config = config;
  }

  /**
   * 发送短信
   */
  async send(options: SmsSendOptions): Promise<NotificationResult> {
    const phones = Array.isArray(options.phone)
      ? options.phone
      : [options.phone];

    // Twilio 需要逐个发送
    if (phones.length > 1) {
      return createErrorResult("Twilio 不支持批量发送，请使用 sendBatch 方法");
    }

    const phone = phones[0];
    if (!isValidPhoneNumber(phone)) {
      return createErrorResult(`无效的手机号: ${phone}`);
    }

    // Twilio 使用模板参数拼接消息体
    const body = options.templateParams
      ? Object.values(options.templateParams).join(" ")
      : `Template: ${options.templateId}`;

    try {
      const url =
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

      const formData = new URLSearchParams();
      formData.append("To", formatPhoneNumber(phone, "1")); // 默认美国
      formData.append("From", this.config.fromNumber);
      formData.append("Body", body);

      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        return createSuccessResult(data.sid || generateNotificationId("sms"));
      } else {
        return createErrorResult(
          `Twilio 短信发送失败: ${data.message || data.code || "未知错误"}`,
        );
      }
    } catch (error) {
      return createErrorResult(
        `Twilio 短信发送失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

// ============================================================================
// 统一短信发送器
// ============================================================================

/**
 * 短信发送器
 *
 * 统一接口支持多个短信服务提供商
 *
 * @example
 * ```typescript
 * // 阿里云
 * const sender = new SmsSender({
 *   provider: "aliyun",
 *   accessKeyId: "ACCESS_KEY_ID",
 *   accessKeySecret: "ACCESS_KEY_SECRET",
 *   signName: "我的应用",
 * });
 *
 * await sender.send({
 *   phone: "13800138000",
 *   templateId: "SMS_123456",
 *   templateParams: { code: "123456" },
 * });
 * ```
 */
export class SmsSender {
  private sender: AliyunSmsSender | TencentSmsSender | TwilioSmsSender;
  private config: SmsSenderConfig;

  constructor(config: SmsSenderConfig) {
    this.config = config;

    switch (config.provider) {
      case "aliyun":
        this.sender = new AliyunSmsSender(config);
        break;
      case "tencent":
        this.sender = new TencentSmsSender(config);
        break;
      case "twilio":
        this.sender = new TwilioSmsSender(config);
        break;
      default:
        throw new Error(
          $tr("notification.sms.unsupportedProvider", {
            provider: (config as SmsSenderConfig).provider,
          }),
        );
    }
  }

  /**
   * 获取服务提供商
   */
  getProvider(): string {
    return this.config.provider;
  }

  /**
   * 发送短信
   *
   * @param options - 发送选项
   * @returns 发送结果
   */
  async send(options: SmsSendOptions): Promise<NotificationResult> {
    return await this.sender.send(options);
  }

  /**
   * 批量发送短信
   *
   * @param phoneList - 手机号列表
   * @param templateId - 模板 ID
   * @param templateParams - 模板参数
   * @param options - 额外选项
   * @returns 批量发送结果
   */
  async sendBatch(
    phoneList: string[],
    templateId: string,
    templateParams?: Record<string, string>,
    options: { concurrency?: number; signName?: string } = {},
  ): Promise<BatchSmsResult> {
    const { concurrency = 10, signName } = options;
    const results: Array<{ phone: string; result: NotificationResult }> = [];

    // 阿里云和腾讯云支持批量发送
    if (
      this.config.provider === "aliyun" || this.config.provider === "tencent"
    ) {
      // 分批发送（每批最多 1000 个）
      const batchSize = 1000;
      for (let i = 0; i < phoneList.length; i += batchSize) {
        const batch = phoneList.slice(i, i + batchSize);
        const result = await this.send({
          phone: batch,
          templateId,
          templateParams,
          signName,
        });

        // 为每个号码添加结果
        for (const phone of batch) {
          results.push({ phone, result });
        }
      }
    } else {
      // Twilio 需要逐个发送
      for (let i = 0; i < phoneList.length; i += concurrency) {
        const batch = phoneList.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(async (phone) => {
            const result = await this.send({
              phone,
              templateId,
              templateParams,
              signName,
            });
            return { phone, result };
          }),
        );
        results.push(...batchResults);
      }
    }

    const success = results.filter((r) => r.result.success).length;
    const failed = results.length - success;

    return {
      total: results.length,
      success,
      failed,
      results,
    };
  }

  /**
   * 发送验证码短信
   *
   * @param phone - 手机号
   * @param code - 验证码
   * @param templateId - 模板 ID
   * @returns 发送结果
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    templateId: string,
  ): Promise<NotificationResult> {
    return await this.send({
      phone,
      templateId,
      templateParams: { code },
    });
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建短信发送器
 *
 * @param config - 短信配置
 * @returns 短信发送器实例
 */
export function createSmsSender(config: SmsSenderConfig): SmsSender {
  return new SmsSender(config);
}

/**
 * 创建阿里云短信发送器
 */
export function createAliyunSmsSender(
  accessKeyId: string,
  accessKeySecret: string,
  signName: string,
): SmsSender {
  return new SmsSender({
    provider: "aliyun",
    accessKeyId,
    accessKeySecret,
    signName,
  });
}

/**
 * 创建腾讯云短信发送器
 */
export function createTencentSmsSender(
  secretId: string,
  secretKey: string,
  sdkAppId: string,
  signName: string,
): SmsSender {
  return new SmsSender({
    provider: "tencent",
    secretId,
    secretKey,
    sdkAppId,
    signName,
  });
}

/**
 * 创建 Twilio 短信发送器
 */
export function createTwilioSmsSender(
  accountSid: string,
  authToken: string,
  fromNumber: string,
): SmsSender {
  return new SmsSender({
    provider: "twilio",
    accountSid,
    authToken,
    fromNumber,
  });
}
