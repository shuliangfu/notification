/**
 * @fileoverview 通知模块类型定义
 *
 * 集中定义所有公共类型接口
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 通知类型
 */
export type NotificationType = "webpush" | "email" | "sms" | "webhook";

/**
 * 通知内容
 */
export interface NotificationContent {
  /** 标题 */
  title: string;
  /** 正文 */
  body: string;
  /** 图标 URL */
  icon?: string;
  /** 图片 URL */
  image?: string;
  /** 点击跳转 URL */
  url?: string;
  /** 操作按钮 */
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  /** 数据 */
  data?: Record<string, unknown>;
}

/**
 * 通知结果
 */
export interface NotificationResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 ID */
  messageId?: string;
  /** 错误信息 */
  error?: string;
  /** 原始响应 */
  rawResponse?: unknown;
}

// ============================================================================
// Web Push 类型
// ============================================================================

/**
 * Web Push 配置
 */
export interface WebPushConfig {
  /** VAPID 公钥 */
  publicKey: string;
  /** VAPID 私钥 */
  privateKey: string;
  /** 联系邮箱 */
  contact: string;
}

/**
 * Web Push 选项
 */
export interface WebPushOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 紧急程度 */
  urgency?: "very-low" | "low" | "normal" | "high";
  /** 主题（用于替换相同主题的通知） */
  topic?: string;
}

/**
 * 推送订阅
 */
export interface PushSubscription {
  /** 端点 URL */
  endpoint: string;
  /** 过期时间 */
  expirationTime?: number;
  /** 密钥 */
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ============================================================================
// Email 类型
// ============================================================================

/**
 * 邮件配置
 */
export interface EmailConfig {
  /** SMTP 主机 */
  host: string;
  /** SMTP 端口 */
  port: number;
  /** 是否使用 TLS */
  secure?: boolean;
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 发件人地址 */
  from: string;
  /** 发件人名称 */
  fromName?: string;
}

/**
 * 邮件选项
 */
export interface EmailOptions {
  /** 收件人 */
  to: string | string[];
  /** 抄送 */
  cc?: string | string[];
  /** 密送 */
  bcc?: string | string[];
  /** 主题 */
  subject: string;
  /** 正文（纯文本） */
  text?: string;
  /** 正文（HTML） */
  html?: string;
  /** 附件 */
  attachments?: Array<{
    filename: string;
    content: string | Uint8Array;
    contentType?: string;
  }>;
  /** 回复地址 */
  replyTo?: string;
}

// ============================================================================
// SMS 类型
// ============================================================================

/**
 * 短信配置
 */
export interface SmsConfig {
  /** 服务提供商 */
  provider: "aliyun" | "tencent" | "twilio";
  /** Access Key ID */
  accessKeyId: string;
  /** Access Key Secret */
  accessKeySecret: string;
  /** 签名名称 */
  signName?: string;
  /** 模板 ID */
  templateId?: string;
}

/**
 * 短信选项
 */
export interface SmsOptions {
  /** 手机号 */
  phone: string | string[];
  /** 模板 ID */
  templateId?: string;
  /** 模板参数 */
  templateParams?: Record<string, string>;
  /** 签名 */
  signName?: string;
}

// ============================================================================
// Webhook 类型
// ============================================================================

/**
 * Webhook 配置
 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string;
  /** 请求方法 */
  method?: "POST" | "PUT";
  /** 请求头 */
  headers?: Record<string, string>;
  /** 密钥（用于签名） */
  secret?: string;
}

/**
 * Webhook 选项
 */
export interface WebhookOptions {
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
}
