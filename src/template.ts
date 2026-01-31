/**
 * @fileoverview 通知模板系统
 *
 * 提供通知模板的管理和渲染功能：
 * - 模板存储
 * - 变量替换
 * - 条件渲染
 * - 多语言支持
 */

import type { NotificationType } from "./types.ts";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 模板类型
 */
export interface NotificationTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 通知类型 */
  type: NotificationType;
  /** 语言代码（如 "zh-CN", "en-US"） */
  locale?: string;
  /** 标题模板 */
  title?: string;
  /** 正文模板 */
  body?: string;
  /** HTML 模板（用于邮件） */
  html?: string;
  /** 主题模板（用于邮件） */
  subject?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt?: number;
  /** 更新时间 */
  updatedAt?: number;
}

/**
 * 模板渲染选项
 */
export interface RenderOptions {
  /** 语言代码 */
  locale?: string;
  /** 是否转义 HTML */
  escapeHtml?: boolean;
  /** 缺失变量的默认值 */
  defaultValue?: string;
  /** 自定义过滤器 */
  filters?: Record<string, (value: unknown) => string>;
}

/**
 * 模板存储接口
 */
export interface TemplateStore {
  /**
   * 保存模板
   */
  save(template: NotificationTemplate): Promise<void>;

  /**
   * 获取模板
   */
  get(id: string, locale?: string): Promise<NotificationTemplate | null>;

  /**
   * 删除模板
   */
  delete(id: string): Promise<void>;

  /**
   * 获取所有模板
   */
  getAll(): Promise<NotificationTemplate[]>;

  /**
   * 按类型获取模板
   */
  getByType(type: NotificationType): Promise<NotificationTemplate[]>;
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 渲染后的标题 */
  title?: string;
  /** 渲染后的正文 */
  body?: string;
  /** 渲染后的 HTML */
  html?: string;
  /** 渲染后的主题 */
  subject?: string;
}

// ============================================================================
// 内存模板存储
// ============================================================================

/**
 * 内存模板存储
 */
export class MemoryTemplateStore implements TemplateStore {
  private templates: Map<string, NotificationTemplate> = new Map();

  /**
   * 保存模板
   * 注：返回 Promise 是为了与异步存储实现（如数据库）保持接口一致
   */
  save(template: NotificationTemplate): Promise<void> {
    const key = template.locale
      ? `${template.id}:${template.locale}`
      : template.id;
    this.templates.set(key, {
      ...template,
      createdAt: template.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    return Promise.resolve();
  }

  /**
   * 获取模板
   */
  get(id: string, locale?: string): Promise<NotificationTemplate | null> {
    // 先尝试获取指定语言的模板
    if (locale) {
      const localeKey = `${id}:${locale}`;
      const localeTemplate = this.templates.get(localeKey);
      if (localeTemplate) {
        return Promise.resolve({ ...localeTemplate });
      }
    }

    // 回退到默认模板
    const template = this.templates.get(id);
    return Promise.resolve(template ? { ...template } : null);
  }

  /**
   * 删除模板
   */
  delete(id: string): Promise<void> {
    // 删除所有语言版本
    const keysToDelete: string[] = [];
    for (const key of this.templates.keys()) {
      if (key === id || key.startsWith(`${id}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.templates.delete(key);
    }
    return Promise.resolve();
  }

  /**
   * 获取所有模板
   */
  getAll(): Promise<NotificationTemplate[]> {
    return Promise.resolve(Array.from(this.templates.values()).map((t) => ({ ...t })));
  }

  /**
   * 按类型获取模板
   */
  getByType(type: NotificationType): Promise<NotificationTemplate[]> {
    return Promise.resolve(
      Array.from(this.templates.values())
        .filter((t) => t.type === type)
        .map((t) => ({ ...t }))
    );
  }
}

// ============================================================================
// 模板渲染引擎
// ============================================================================

/**
 * 转义 HTML 特殊字符
 *
 * @param str - 原始字符串
 * @returns 转义后的字符串
 */
function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * 获取嵌套对象的值
 *
 * @param obj - 对象
 * @param path - 路径（如 "user.name"）
 * @returns 值
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * 内置过滤器
 */
const builtinFilters: Record<string, (value: unknown) => string> = {
  /** 大写 */
  upper: (value) => String(value).toUpperCase(),
  /** 小写 */
  lower: (value) => String(value).toLowerCase(),
  /** 首字母大写 */
  capitalize: (value) => {
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  /** 截断 */
  truncate: (value) => {
    const str = String(value);
    return str.length > 100 ? str.slice(0, 100) + "..." : str;
  },
  /** 日期格式化 */
  date: (value) => {
    const date = new Date(value as string | number);
    return date.toLocaleDateString();
  },
  /** 时间格式化 */
  time: (value) => {
    const date = new Date(value as string | number);
    return date.toLocaleTimeString();
  },
  /** 日期时间格式化 */
  datetime: (value) => {
    const date = new Date(value as string | number);
    return date.toLocaleString();
  },
  /** JSON 格式化 */
  json: (value) => JSON.stringify(value),
  /** 数字格式化 */
  number: (value) => Number(value).toLocaleString(),
  /** 货币格式化 */
  currency: (value) => `¥${Number(value).toFixed(2)}`,
};

/**
 * 渲染模板字符串
 *
 * 支持的语法：
 * - {{variable}} - 变量替换
 * - {{variable|filter}} - 变量过滤器
 * - {{#if condition}}...{{/if}} - 条件渲染
 * - {{#each array}}...{{/each}} - 循环渲染
 *
 * @param template - 模板字符串
 * @param data - 数据对象
 * @param options - 渲染选项
 * @returns 渲染后的字符串
 */
export function renderTemplateString(
  template: string,
  data: Record<string, unknown>,
  options: RenderOptions = {}
): string {
  // 安全默认：开启 HTML 转义防止 XSS 攻击
  const { escapeHtml: shouldEscape = true, defaultValue = "", filters = {} } = options;
  const allFilters = { ...builtinFilters, ...filters };

  let result = template;

  // 处理条件渲染 {{#if condition}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, condition, content) => {
      const value = getNestedValue(data, condition);
      return value ? content : "";
    }
  );

  // 处理 else {{#if condition}}...{{else}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, condition, ifContent, elseContent) => {
      const value = getNestedValue(data, condition);
      return value ? ifContent : elseContent;
    }
  );

  // 处理循环渲染 {{#each array}}...{{/each}}
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, arrayName, itemTemplate) => {
      const array = getNestedValue(data, arrayName);
      if (!Array.isArray(array)) {
        return "";
      }
      return array
        .map((item, index) => {
          let itemResult = itemTemplate;
          // 替换 {{this}} 为当前项
          itemResult = itemResult.replace(/\{\{this\}\}/g, String(item));
          // 替换 {{@index}} 为索引
          itemResult = itemResult.replace(/\{\{@index\}\}/g, String(index));
          // 如果 item 是对象，可以访问其属性
          if (typeof item === "object" && item !== null) {
            itemResult = renderTemplateString(
              itemResult,
              item as Record<string, unknown>,
              options
            );
          }
          return itemResult;
        })
        .join("");
    }
  );

  // 处理变量替换 {{variable}} 或 {{variable|filter}}
  result = result.replace(
    /\{\{(\w+(?:\.\w+)*?)(?:\|(\w+))?\}\}/g,
    (_match, path, filterName) => {
      let value = getNestedValue(data, path);

      if (value === undefined || value === null) {
        return defaultValue;
      }

      // 应用过滤器
      if (filterName && allFilters[filterName]) {
        value = allFilters[filterName](value);
      }

      let strValue = String(value);

      // HTML 转义
      if (shouldEscape) {
        strValue = escapeHtml(strValue);
      }

      return strValue;
    }
  );

  return result;
}

// ============================================================================
// 模板管理器
// ============================================================================

/**
 * 模板管理器
 *
 * @example
 * ```typescript
 * const manager = new TemplateManager({
 *   store: new MemoryTemplateStore(),
 * });
 *
 * // 注册模板
 * await manager.register({
 *   id: "welcome",
 *   name: "欢迎邮件",
 *   type: "email",
 *   subject: "欢迎 {{name}} 加入",
 *   html: "<h1>欢迎 {{name}}</h1>",
 * });
 *
 * // 渲染模板
 * const result = await manager.render("welcome", { name: "张三" });
 * console.log(result.subject); // "欢迎 张三 加入"
 * ```
 */
export class TemplateManager {
  private store: TemplateStore;
  private defaultLocale: string;
  private customFilters: Record<string, (value: unknown) => string> = {};

  constructor(options: {
    store: TemplateStore;
    defaultLocale?: string;
  }) {
    this.store = options.store;
    this.defaultLocale = options.defaultLocale || "zh-CN";
  }

  /**
   * 注册模板
   *
   * @param template - 模板
   */
  async register(template: NotificationTemplate): Promise<void> {
    await this.store.save(template);
  }

  /**
   * 批量注册模板
   *
   * @param templates - 模板列表
   */
  async registerBatch(templates: NotificationTemplate[]): Promise<void> {
    for (const template of templates) {
      await this.store.save(template);
    }
  }

  /**
   * 获取模板
   *
   * @param id - 模板 ID
   * @param locale - 语言代码
   * @returns 模板
   */
  async get(id: string, locale?: string): Promise<NotificationTemplate | null> {
    return await this.store.get(id, locale || this.defaultLocale);
  }

  /**
   * 删除模板
   *
   * @param id - 模板 ID
   */
  async remove(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * 获取所有模板
   */
  async getAll(): Promise<NotificationTemplate[]> {
    return await this.store.getAll();
  }

  /**
   * 按类型获取模板
   *
   * @param type - 通知类型
   */
  async getByType(type: NotificationType): Promise<NotificationTemplate[]> {
    return await this.store.getByType(type);
  }

  /**
   * 注册自定义过滤器
   *
   * @param name - 过滤器名称
   * @param fn - 过滤器函数
   */
  registerFilter(name: string, fn: (value: unknown) => string): void {
    this.customFilters[name] = fn;
  }

  /**
   * 渲染模板
   *
   * @param templateId - 模板 ID
   * @param data - 渲染数据
   * @param options - 渲染选项
   * @returns 渲染结果
   */
  async render(
    templateId: string,
    data: Record<string, unknown>,
    options: RenderOptions = {}
  ): Promise<RenderResult> {
    const locale = options.locale || this.defaultLocale;
    const template = await this.store.get(templateId, locale);

    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    const renderOptions: RenderOptions = {
      ...options,
      filters: { ...this.customFilters, ...options.filters },
    };

    const result: RenderResult = {};

    if (template.title) {
      result.title = renderTemplateString(template.title, data, renderOptions);
    }

    if (template.body) {
      result.body = renderTemplateString(template.body, data, renderOptions);
    }

    if (template.html) {
      result.html = renderTemplateString(template.html, data, {
        ...renderOptions,
        escapeHtml: false, // HTML 模板不转义
      });
    }

    if (template.subject) {
      result.subject = renderTemplateString(template.subject, data, renderOptions);
    }

    return result;
  }

  /**
   * 渲染模板字符串（不需要注册）
   *
   * @param template - 模板字符串
   * @param data - 渲染数据
   * @param options - 渲染选项
   * @returns 渲染后的字符串
   */
  renderString(
    template: string,
    data: Record<string, unknown>,
    options: RenderOptions = {}
  ): string {
    return renderTemplateString(template, data, {
      ...options,
      filters: { ...this.customFilters, ...options.filters },
    });
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建模板管理器
 *
 * @param options - 管理器选项
 * @returns 模板管理器实例
 */
export function createTemplateManager(options?: {
  store?: TemplateStore;
  defaultLocale?: string;
}): TemplateManager {
  return new TemplateManager({
    store: options?.store || new MemoryTemplateStore(),
    defaultLocale: options?.defaultLocale,
  });
}

// ============================================================================
// 预定义模板
// ============================================================================

/**
 * 验证码邮件模板
 */
export const VERIFICATION_CODE_EMAIL_TEMPLATE: NotificationTemplate = {
  id: "verification_code_email",
  name: "验证码邮件",
  type: "email",
  subject: "【{{appName}}】验证码",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">验证码</h2>
      <p style="color: #666;">您的验证码是：</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 8px;">{{code}}</span>
      </div>
      <p style="color: #999; font-size: 14px;">
        验证码 {{expiresIn}} 分钟内有效，请勿泄露给他人。
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        此邮件由 {{appName}} 自动发送，请勿回复。
      </p>
    </div>
  `,
};

/**
 * 验证码短信模板
 */
export const VERIFICATION_CODE_SMS_TEMPLATE: NotificationTemplate = {
  id: "verification_code_sms",
  name: "验证码短信",
  type: "sms",
  body: "【{{appName}}】您的验证码是 {{code}}，{{expiresIn}} 分钟内有效。",
};

/**
 * 欢迎邮件模板
 */
export const WELCOME_EMAIL_TEMPLATE: NotificationTemplate = {
  id: "welcome_email",
  name: "欢迎邮件",
  type: "email",
  subject: "欢迎加入 {{appName}}",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">欢迎加入 {{appName}}！</h2>
      {{#if username}}
      <p style="color: #666;">尊敬的 {{username}}：</p>
      {{/if}}
      <p style="color: #666;">感谢您注册成为我们的用户。您的账号已创建成功！</p>
      {{#if loginLink}}
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{loginLink}}" 
           style="background: #28a745; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          立即登录
        </a>
      </div>
      {{/if}}
      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        此邮件由 {{appName}} 自动发送，请勿回复。
      </p>
    </div>
  `,
};

/**
 * 密码重置邮件模板
 */
export const PASSWORD_RESET_EMAIL_TEMPLATE: NotificationTemplate = {
  id: "password_reset_email",
  name: "密码重置邮件",
  type: "email",
  subject: "【{{appName}}】密码重置",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">密码重置</h2>
      {{#if username}}
      <p style="color: #666;">尊敬的 {{username}}：</p>
      {{/if}}
      <p style="color: #666;">您正在重置密码，请点击下方按钮完成操作：</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{resetLink}}" 
           style="background: #007bff; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          重置密码
        </a>
      </div>
      <p style="color: #999; font-size: 14px;">
        此链接 {{expiresIn}} 分钟内有效。如果您没有请求重置密码，请忽略此邮件。
      </p>
      <p style="color: #999; font-size: 12px;">
        如果按钮无法点击，请复制以下链接到浏览器：<br>
        <a href="{{resetLink}}" style="color: #007bff;">{{resetLink}}</a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        此邮件由 {{appName}} 自动发送，请勿回复。
      </p>
    </div>
  `,
};

/**
 * 新消息推送模板
 */
export const NEW_MESSAGE_PUSH_TEMPLATE: NotificationTemplate = {
  id: "new_message_push",
  name: "新消息推送",
  type: "webpush",
  title: "{{senderName}} 发来消息",
  body: "{{messagePreview}}",
};
