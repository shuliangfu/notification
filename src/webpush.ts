/**
 * @fileoverview Web Push 通知发送模块
 *
 * 实现 Web Push 协议，支持：
 * - VAPID 认证
 * - 消息加密
 * - 推送发送
 */

import type {
  WebPushConfig,
  WebPushOptions,
  NotificationContent,
  PushSubscription,
  NotificationResult,
} from "./types.ts";

import { createSuccessResult, createErrorResult, generateNotificationId } from "./utils.ts";

// ============================================================================
// Payload 创建
// ============================================================================

/**
 * 创建 Web Push Payload
 *
 * @param content - 通知内容
 * @param options - 选项
 * @returns Payload 对象
 *
 * @example
 * ```typescript
 * const payload = createWebPushPayload({
 *   title: "新消息",
 *   body: "您有一条新消息",
 *   icon: "/icons/notification.png",
 *   url: "/messages",
 * });
 * ```
 */
export function createWebPushPayload(
  content: NotificationContent,
  options: WebPushOptions = {}
): Record<string, unknown> {
  return {
    notification: {
      title: content.title,
      body: content.body,
      icon: content.icon,
      image: content.image,
      data: {
        url: content.url,
        ...content.data,
      },
      actions: content.actions,
    },
    options: {
      ttl: options.ttl || 86400, // 默认 24 小时
      urgency: options.urgency || "normal",
      topic: options.topic,
    },
  };
}

/**
 * 验证 Push 订阅是否有效
 *
 * @param subscription - 订阅信息
 * @returns 是否有效
 */
export function isValidPushSubscription(
  subscription: unknown
): subscription is PushSubscription {
  if (!subscription || typeof subscription !== "object") {
    return false;
  }

  const sub = subscription as Record<string, unknown>;

  if (typeof sub.endpoint !== "string" || !sub.endpoint) {
    return false;
  }

  if (!sub.keys || typeof sub.keys !== "object") {
    return false;
  }

  const keys = sub.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== "string" || typeof keys.auth !== "string") {
    return false;
  }

  return true;
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * VAPID 密钥对
 */
export interface VapidKeys {
  /** 公钥（Base64 URL 编码） */
  publicKey: string;
  /** 私钥（Base64 URL 编码） */
  privateKey: string;
}

/**
 * Web Push 发送选项
 */
export interface WebPushSendOptions extends WebPushOptions {
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * 批量推送结果
 */
export interface BatchPushResult {
  /** 总数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 详细结果 */
  results: Array<{
    subscription: PushSubscription;
    result: NotificationResult;
  }>;
  /** 失效的订阅（需要从存储中移除） */
  expiredSubscriptions: PushSubscription[];
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * Base64 URL 编码
 *
 * @param data - 要编码的数据
 * @returns Base64 URL 编码字符串
 */
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Base64 URL 解码
 *
 * @param str - Base64 URL 编码字符串
 * @returns 解码后的 Uint8Array
 */
function base64UrlDecode(str: string): Uint8Array {
  // 补齐 padding
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 生成随机盐值
 *
 * @param length - 盐值长度（默认 16）
 * @returns 随机盐值
 */
function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * 创建 VAPID JWT
 *
 * @param audience - 目标 URL 的 origin
 * @param subject - 联系邮箱（mailto: 或 https: URL）
 * @param privateKey - VAPID 私钥
 * @param expiration - 过期时间（秒，默认 12 小时）
 * @returns JWT 字符串
 */
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKey: CryptoKey,
  expiration = 12 * 60 * 60
): Promise<string> {
  const header = {
    typ: "JWT",
    alg: "ES256",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expiration,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // 签名
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

/**
 * 导入 VAPID 私钥
 *
 * @param privateKeyB64 - Base64 URL 编码的私钥
 * @returns CryptoKey
 */
async function importVapidPrivateKey(privateKeyB64: string): Promise<CryptoKey> {
  const privateKeyBytes = base64UrlDecode(privateKeyB64);

  // PKCS8 格式头部
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);

  const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyBytes.length);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);

  return await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Key,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

// ============================================================================
// Web Push 发送器类
// ============================================================================

/**
 * Web Push 发送器
 *
 * @example
 * ```typescript
 * const pusher = new WebPushSender({
 *   publicKey: "VAPID_PUBLIC_KEY",
 *   privateKey: "VAPID_PRIVATE_KEY",
 *   contact: "mailto:admin@example.com",
 * });
 *
 * const result = await pusher.send(subscription, {
 *   title: "新消息",
 *   body: "您有一条新消息",
 * });
 * ```
 */
export class WebPushSender {
  /** VAPID 配置 */
  private config: WebPushConfig;
  /** 缓存的私钥 */
  private privateKey: CryptoKey | null = null;

  /**
   * 创建 Web Push 发送器
   *
   * @param config - VAPID 配置
   */
  constructor(config: WebPushConfig) {
    this.config = config;
  }

  /**
   * 获取 VAPID 公钥
   *
   * @returns VAPID 公钥
   */
  getPublicKey(): string {
    return this.config.publicKey;
  }

  /**
   * 发送推送通知
   *
   * @param subscription - 推送订阅
   * @param content - 通知内容
   * @param options - 发送选项
   * @returns 发送结果
   */
  async send(
    subscription: PushSubscription,
    content: NotificationContent,
    options: WebPushSendOptions = {}
  ): Promise<NotificationResult> {
    // 验证订阅
    if (!isValidPushSubscription(subscription)) {
      return createErrorResult("无效的推送订阅");
    }

    try {
      // 准备 payload
      const payload = createWebPushPayload(content, options);
      const payloadString = JSON.stringify(payload);
      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(payloadString);

      // 获取端点 URL
      const endpointUrl = new URL(subscription.endpoint);
      const audience = endpointUrl.origin;

      // 导入私钥（缓存）
      if (!this.privateKey) {
        this.privateKey = await importVapidPrivateKey(this.config.privateKey);
      }

      // 创建 VAPID JWT
      const jwt = await createVapidJwt(
        audience,
        this.config.contact,
        this.privateKey
      );

      // 加密 payload
      const { encryptedPayload, headers: encryptionHeaders } =
        await this.encryptPayload(payloadBytes, subscription);

      // 构建请求头
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": String(encryptedPayload.length),
        Authorization: `vapid t=${jwt}, k=${this.config.publicKey}`,
        TTL: String(options.ttl || 86400),
        ...encryptionHeaders,
        ...options.headers,
      };

      if (options.urgency) {
        headers["Urgency"] = options.urgency;
      }

      if (options.topic) {
        headers["Topic"] = options.topic;
      }

      // 发送请求
      const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers,
        body: encryptedPayload.buffer.slice(encryptedPayload.byteOffset, encryptedPayload.byteOffset + encryptedPayload.byteLength) as ArrayBuffer,
      });

      if (response.ok) {
        return createSuccessResult(generateNotificationId("push"));
      } else {
        const errorText = await response.text();
        return createErrorResult(
          `推送失败: ${response.status} ${response.statusText} - ${errorText}`
        );
      }
    } catch (error) {
      return createErrorResult(
        `推送失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 加密 payload
   *
   * @param payload - 原始 payload
   * @param subscription - 推送订阅
   * @returns 加密后的 payload 和请求头
   */
  private async encryptPayload(
    payload: Uint8Array,
    subscription: PushSubscription
  ): Promise<{ encryptedPayload: Uint8Array; headers: Record<string, string> }> {
    // 解码订阅密钥
    const p256dh = base64UrlDecode(subscription.keys.p256dh);
    const auth = base64UrlDecode(subscription.keys.auth);

    // 生成本地密钥对
    const localKeyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );

    // 导出本地公钥
    const localPublicKey = await crypto.subtle.exportKey(
      "raw",
      localKeyPair.publicKey
    );

    // 导入订阅公钥
    const p256dhBuffer = p256dh.buffer.slice(p256dh.byteOffset, p256dh.byteOffset + p256dh.byteLength) as ArrayBuffer;
    const subscriptionPublicKey = await crypto.subtle.importKey(
      "raw",
      p256dhBuffer,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    // ECDH 密钥交换
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriptionPublicKey },
      localKeyPair.privateKey,
      256
    );

    // 生成盐值
    const salt = generateSalt(16);

    // 派生加密密钥
    const { contentEncryptionKey, nonce } = await this.deriveKeys(
      new Uint8Array(sharedSecret),
      auth,
      new Uint8Array(localPublicKey),
      p256dh,
      salt
    );

    // 加密内容
    const cekBuffer = contentEncryptionKey.buffer.slice(contentEncryptionKey.byteOffset, contentEncryptionKey.byteOffset + contentEncryptionKey.byteLength) as ArrayBuffer;
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      cekBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    // 添加 padding
    const paddedPayload = this.addPadding(payload);

    const nonceBuffer = nonce.buffer.slice(nonce.byteOffset, nonce.byteOffset + nonce.byteLength) as ArrayBuffer;
    const paddedBuffer = paddedPayload.buffer.slice(paddedPayload.byteOffset, paddedPayload.byteOffset + paddedPayload.byteLength) as ArrayBuffer;
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBuffer },
      cryptoKey,
      paddedBuffer
    );

    // 构建 aes128gcm 格式的消息
    const recordSize = 4096;
    const header = new Uint8Array(21 + new Uint8Array(localPublicKey).length);
    header.set(salt, 0);
    header[16] = (recordSize >> 24) & 0xff;
    header[17] = (recordSize >> 16) & 0xff;
    header[18] = (recordSize >> 8) & 0xff;
    header[19] = recordSize & 0xff;
    header[20] = new Uint8Array(localPublicKey).length;
    header.set(new Uint8Array(localPublicKey), 21);

    const encryptedPayload = new Uint8Array(
      header.length + new Uint8Array(encrypted).length
    );
    encryptedPayload.set(header);
    encryptedPayload.set(new Uint8Array(encrypted), header.length);

    return {
      encryptedPayload,
      headers: {},
    };
  }

  /**
   * 派生加密密钥
   */
  private async deriveKeys(
    sharedSecret: Uint8Array,
    authSecret: Uint8Array,
    localPublicKey: Uint8Array,
    subscriptionPublicKey: Uint8Array,
    salt: Uint8Array
  ): Promise<{ contentEncryptionKey: Uint8Array; nonce: Uint8Array }> {
    const encoder = new TextEncoder();

    // 创建 info 上下文
    const keyInfo = this.createInfo("aesgcm", subscriptionPublicKey, localPublicKey);
    const nonceInfo = this.createInfo("nonce", subscriptionPublicKey, localPublicKey);

    // 使用 HKDF 派生密钥
    const authInfo = encoder.encode("Content-Encoding: auth\0");
    const prk = await this.hkdfExtract(authSecret, sharedSecret);
    const ikm = await this.hkdfExpand(prk, authInfo, 32);

    const prkForCek = await this.hkdfExtract(salt, ikm);
    const contentEncryptionKey = await this.hkdfExpand(prkForCek, keyInfo, 16);
    const nonce = await this.hkdfExpand(prkForCek, nonceInfo, 12);

    return { contentEncryptionKey, nonce };
  }

  /**
   * 创建 info 字节数组
   */
  private createInfo(
    type: string,
    subscriptionPublicKey: Uint8Array,
    localPublicKey: Uint8Array
  ): Uint8Array {
    const encoder = new TextEncoder();
    const typeBytes = encoder.encode(`Content-Encoding: ${type}\0`);
    const p256dhBytes = encoder.encode("P-256\0");

    const info = new Uint8Array(
      typeBytes.length +
        p256dhBytes.length +
        2 +
        subscriptionPublicKey.length +
        2 +
        localPublicKey.length
    );

    let offset = 0;
    info.set(typeBytes, offset);
    offset += typeBytes.length;
    info.set(p256dhBytes, offset);
    offset += p256dhBytes.length;
    info[offset++] = 0;
    info[offset++] = subscriptionPublicKey.length;
    info.set(subscriptionPublicKey, offset);
    offset += subscriptionPublicKey.length;
    info[offset++] = 0;
    info[offset++] = localPublicKey.length;
    info.set(localPublicKey, offset);

    return info;
  }

  /**
   * HKDF Extract
   */
  private async hkdfExtract(
    salt: Uint8Array,
    ikm: Uint8Array
  ): Promise<Uint8Array> {
    const saltBuffer = salt.length > 0 ? salt : new Uint8Array(32);
    const saltArrayBuffer = saltBuffer.buffer.slice(saltBuffer.byteOffset, saltBuffer.byteOffset + saltBuffer.byteLength) as ArrayBuffer;
    const key = await crypto.subtle.importKey(
      "raw",
      saltArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const ikmArrayBuffer = ikm.buffer.slice(ikm.byteOffset, ikm.byteOffset + ikm.byteLength) as ArrayBuffer;
    const prk = await crypto.subtle.sign("HMAC", key, ikmArrayBuffer);
    return new Uint8Array(prk);
  }

  /**
   * HKDF Expand
   */
  private async hkdfExpand(
    prk: Uint8Array,
    info: Uint8Array,
    length: number
  ): Promise<Uint8Array> {
    const prkArrayBuffer = prk.buffer.slice(prk.byteOffset, prk.byteOffset + prk.byteLength) as ArrayBuffer;
    const key = await crypto.subtle.importKey(
      "raw",
      prkArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const result = new Uint8Array(length);
    let t = new Uint8Array(0);
    let offset = 0;
    let counter = 1;

    while (offset < length) {
      const input = new Uint8Array(t.length + info.length + 1);
      input.set(t);
      input.set(info, t.length);
      input[t.length + info.length] = counter;

      t = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
      const copyLength = Math.min(t.length, length - offset);
      result.set(t.slice(0, copyLength), offset);
      offset += copyLength;
      counter++;
    }

    return result;
  }

  /**
   * 添加 padding
   */
  private addPadding(payload: Uint8Array): Uint8Array {
    // 添加 1 字节分隔符和 padding
    const padded = new Uint8Array(payload.length + 1);
    padded.set(payload);
    padded[payload.length] = 2; // 分隔符
    return padded;
  }

  /**
   * 批量发送推送通知
   *
   * @param subscriptions - 推送订阅列表
   * @param content - 通知内容
   * @param options - 发送选项
   * @returns 批量发送结果
   */
  async sendBatch(
    subscriptions: PushSubscription[],
    content: NotificationContent,
    options: WebPushSendOptions & { concurrency?: number } = {}
  ): Promise<BatchPushResult> {
    const { concurrency = 10, ...sendOptions } = options;
    const results: Array<{
      subscription: PushSubscription;
      result: NotificationResult;
    }> = [];
    const expiredSubscriptions: PushSubscription[] = [];

    // 分批并发发送
    for (let i = 0; i < subscriptions.length; i += concurrency) {
      const batch = subscriptions.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (subscription) => {
          const result = await this.send(subscription, content, sendOptions);

          // 检查是否是过期订阅（410 Gone）
          if (
            !result.success &&
            result.error?.includes("410")
          ) {
            expiredSubscriptions.push(subscription);
          }

          return { subscription, result };
        })
      );
      results.push(...batchResults);
    }

    const success = results.filter((r) => r.result.success).length;
    const failed = results.length - success;

    return {
      total: results.length,
      success,
      failed,
      results,
      expiredSubscriptions,
    };
  }
}

// ============================================================================
// VAPID 密钥生成
// ============================================================================

/**
 * 生成 VAPID 密钥对
 *
 * @returns VAPID 密钥对（Base64 URL 编码）
 *
 * @example
 * ```typescript
 * const keys = await generateVapidKeys();
 * console.log("公钥:", keys.publicKey);
 * console.log("私钥:", keys.privateKey);
 * ```
 */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  // 导出公钥（uncompressed 格式）
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKey = base64UrlEncode(new Uint8Array(publicKeyRaw));

  // 导出私钥
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKey = privateKeyJwk.d!;

  return { publicKey, privateKey };
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 Web Push 发送器
 *
 * @param config - VAPID 配置
 * @returns Web Push 发送器实例
 */
export function createWebPushSender(config: WebPushConfig): WebPushSender {
  return new WebPushSender(config);
}
