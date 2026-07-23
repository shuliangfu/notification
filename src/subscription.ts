/**
 * @fileoverview 订阅管理模块
 *
 * 提供通知订阅的存储和管理功能：
 * - 订阅存储接口
 * - 内存存储实现
 * - 用户订阅管理
 */

import type { NotificationType, PushSubscription } from "./types.ts";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 订阅记录
 */
export interface SubscriptionRecord {
  /** 订阅 ID */
  id: string;
  /** 用户 ID */
  userId: string;
  /** 通知类型 */
  type: NotificationType;
  /** 订阅目标（邮箱、手机号、Webhook URL、Push 订阅） */
  target: string | PushSubscription;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 是否启用 */
  enabled: boolean;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 订阅存储接口
 */
export interface SubscriptionStore {
  /**
   * 保存订阅
   *
   * @param record - 订阅记录
   */
  save(record: SubscriptionRecord): Promise<void>;

  /**
   * 获取订阅
   *
   * @param id - 订阅 ID
   * @returns 订阅记录
   */
  get(id: string): Promise<SubscriptionRecord | null>;

  /**
   * 删除订阅
   *
   * @param id - 订阅 ID
   */
  delete(id: string): Promise<void>;

  /**
   * 获取用户的所有订阅
   *
   * @param userId - 用户 ID
   * @param type - 可选的通知类型过滤
   * @returns 订阅记录列表
   */
  getByUser(
    userId: string,
    type?: NotificationType,
  ): Promise<SubscriptionRecord[]>;

  /**
   * 获取指定类型的所有订阅
   *
   * @param type - 通知类型
   * @returns 订阅记录列表
   */
  getByType(type: NotificationType): Promise<SubscriptionRecord[]>;

  /**
   * 更新订阅
   *
   * @param id - 订阅 ID
   * @param updates - 更新字段
   */
  update(
    id: string,
    updates: Partial<Omit<SubscriptionRecord, "id" | "userId" | "createdAt">>,
  ): Promise<void>;

  /**
   * 检查订阅是否存在
   *
   * @param id - 订阅 ID
   */
  has(id: string): Promise<boolean>;

  /**
   * 清空所有订阅
   */
  clear(): Promise<void>;
}

/**
 * 订阅管理器配置
 */
export interface SubscriptionManagerOptions {
  /** 订阅存储 */
  store: SubscriptionStore;
  /** 是否自动清理过期订阅 */
  autoCleanup?: boolean;
  /** 清理间隔（毫秒，默认 1 小时） */
  cleanupInterval?: number;
}

// ============================================================================
// 内存订阅存储
// ============================================================================

/**
 * 内存订阅存储
 *
 * 适用于开发和测试环境
 */
export class MemorySubscriptionStore implements SubscriptionStore {
  /** 订阅存储 */
  private subscriptions: Map<string, SubscriptionRecord> = new Map();

  /**
   * 保存订阅
   * 注：返回 Promise 是为了与异步存储实现（如数据库）保持接口一致
   */
  save(record: SubscriptionRecord): Promise<void> {
    this.subscriptions.set(record.id, { ...record });
    return Promise.resolve();
  }

  /**
   * 获取订阅
   */
  get(id: string): Promise<SubscriptionRecord | null> {
    const record = this.subscriptions.get(id);
    return Promise.resolve(record ? { ...record } : null);
  }

  /**
   * 删除订阅
   */
  delete(id: string): Promise<void> {
    this.subscriptions.delete(id);
    return Promise.resolve();
  }

  /**
   * 获取用户的所有订阅
   */
  getByUser(
    userId: string,
    type?: NotificationType,
  ): Promise<SubscriptionRecord[]> {
    const results: SubscriptionRecord[] = [];

    for (const record of this.subscriptions.values()) {
      if (record.userId === userId) {
        if (!type || record.type === type) {
          results.push({ ...record });
        }
      }
    }

    return Promise.resolve(results);
  }

  /**
   * 获取指定类型的所有订阅
   */
  getByType(type: NotificationType): Promise<SubscriptionRecord[]> {
    const results: SubscriptionRecord[] = [];

    for (const record of this.subscriptions.values()) {
      if (record.type === type && record.enabled) {
        results.push({ ...record });
      }
    }

    return Promise.resolve(results);
  }

  /**
   * 更新订阅
   */
  update(
    id: string,
    updates: Partial<Omit<SubscriptionRecord, "id" | "userId" | "createdAt">>,
  ): Promise<void> {
    const record = this.subscriptions.get(id);
    if (record) {
      this.subscriptions.set(id, {
        ...record,
        ...updates,
        updatedAt: Date.now(),
      });
    }
    return Promise.resolve();
  }

  /**
   * 检查订阅是否存在
   */
  has(id: string): Promise<boolean> {
    return Promise.resolve(this.subscriptions.has(id));
  }

  /**
   * 清空所有订阅
   */
  clear(): Promise<void> {
    this.subscriptions.clear();
    return Promise.resolve();
  }

  /**
   * 获取所有订阅（测试用）
   */
  getAll(): SubscriptionRecord[] {
    return Array.from(this.subscriptions.values()).map((r) => ({ ...r }));
  }
}

// ============================================================================
// 订阅管理器
// ============================================================================

/**
 * 订阅管理器
 *
 * 提供统一的订阅管理接口
 *
 * @example
 * ```typescript
 * const manager = new SubscriptionManager({
 *   store: new MemorySubscriptionStore(),
 * });
 *
 * // 添加 Push 订阅
 * await manager.addPushSubscription("user123", subscription);
 *
 * // 添加邮箱订阅
 * await manager.addEmailSubscription("user123", "user@example.com");
 *
 * // 获取用户的所有 Push 订阅
 * const pushSubs = await manager.getUserSubscriptions("user123", "webpush");
 * ```
 */
export class SubscriptionManager {
  private store: SubscriptionStore;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(options: SubscriptionManagerOptions) {
    this.store = options.store;

    // 自动清理
    if (options.autoCleanup) {
      const interval = options.cleanupInterval || 3600000; // 默认 1 小时
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, interval);
    }
  }

  /**
   * 生成订阅 ID
   */
  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * 添加 Push 订阅
   *
   * @param userId - 用户 ID
   * @param subscription - Push 订阅
   * @param metadata - 元数据
   * @returns 订阅 ID
   */
  async addPushSubscription(
    userId: string,
    subscription: PushSubscription,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    await this.store.save({
      id,
      userId,
      type: "webpush",
      target: subscription,
      createdAt: now,
      updatedAt: now,
      enabled: true,
      metadata,
    });

    return id;
  }

  /**
   * 添加邮箱订阅
   *
   * @param userId - 用户 ID
   * @param email - 邮箱地址
   * @param metadata - 元数据
   * @returns 订阅 ID
   */
  async addEmailSubscription(
    userId: string,
    email: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    await this.store.save({
      id,
      userId,
      type: "email",
      target: email,
      createdAt: now,
      updatedAt: now,
      enabled: true,
      metadata,
    });

    return id;
  }

  /**
   * 添加短信订阅
   *
   * @param userId - 用户 ID
   * @param phone - 手机号
   * @param metadata - 元数据
   * @returns 订阅 ID
   */
  async addSmsSubscription(
    userId: string,
    phone: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    await this.store.save({
      id,
      userId,
      type: "sms",
      target: phone,
      createdAt: now,
      updatedAt: now,
      enabled: true,
      metadata,
    });

    return id;
  }

  /**
   * 添加 Webhook 订阅
   *
   * @param userId - 用户 ID
   * @param url - Webhook URL
   * @param metadata - 元数据
   * @returns 订阅 ID
   */
  async addWebhookSubscription(
    userId: string,
    url: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    await this.store.save({
      id,
      userId,
      type: "webhook",
      target: url,
      createdAt: now,
      updatedAt: now,
      enabled: true,
      metadata,
    });

    return id;
  }

  /**
   * 获取订阅
   *
   * @param id - 订阅 ID
   * @returns 订阅记录
   */
  async getSubscription(id: string): Promise<SubscriptionRecord | null> {
    return await this.store.get(id);
  }

  /**
   * 获取用户的所有订阅
   *
   * @param userId - 用户 ID
   * @param type - 可选的类型过滤
   * @returns 订阅列表
   */
  async getUserSubscriptions(
    userId: string,
    type?: NotificationType,
  ): Promise<SubscriptionRecord[]> {
    return await this.store.getByUser(userId, type);
  }

  /**
   * 获取用户的 Push 订阅
   *
   * @param userId - 用户 ID
   * @returns Push 订阅列表
   */
  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const records = await this.store.getByUser(userId, "webpush");
    return records
      .filter((r) => r.enabled)
      .map((r) => r.target as PushSubscription);
  }

  /**
   * 删除订阅
   *
   * @param id - 订阅 ID
   */
  async removeSubscription(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * 删除用户的所有订阅
   *
   * @param userId - 用户 ID
   * @param type - 可选的类型过滤
   */
  async removeUserSubscriptions(
    userId: string,
    type?: NotificationType,
  ): Promise<void> {
    const records = await this.store.getByUser(userId, type);
    for (const record of records) {
      await this.store.delete(record.id);
    }
  }

  /**
   * 启用订阅
   *
   * @param id - 订阅 ID
   */
  async enableSubscription(id: string): Promise<void> {
    await this.store.update(id, { enabled: true });
  }

  /**
   * 禁用订阅
   *
   * @param id - 订阅 ID
   */
  async disableSubscription(id: string): Promise<void> {
    await this.store.update(id, { enabled: false });
  }

  /**
   * 更新订阅元数据
   *
   * @param id - 订阅 ID
   * @param metadata - 元数据
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const record = await this.store.get(id);
    if (record) {
      await this.store.update(id, {
        metadata: { ...record.metadata, ...metadata },
      });
    }
  }

  /**
   * 获取所有指定类型的订阅
   *
   * @param type - 通知类型
   * @returns 订阅列表
   */
  async getAllByType(type: NotificationType): Promise<SubscriptionRecord[]> {
    return await this.store.getByType(type);
  }

  /**
   * 清理过期或无效的订阅
   *
   * 这个方法应该由外部定期调用，或者通过 autoCleanup 选项自动执行
   * 注：返回 Promise 是为了支持子类实现异步清理逻辑
   */
  cleanup(): Promise<void> {
    // 默认实现不做任何事，子类或具体实现可以覆盖
    // 例如：删除过期的 Push 订阅
    return Promise.resolve();
  }

  /**
   * 停止自动清理
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建订阅管理器
 *
 * @param options - 管理器选项
 * @returns 订阅管理器实例
 */
export function createSubscriptionManager(
  options: SubscriptionManagerOptions,
): SubscriptionManager {
  return new SubscriptionManager(options);
}

/**
 * 创建内存订阅管理器
 *
 * @returns 使用内存存储的订阅管理器
 */
export function createMemorySubscriptionManager(): SubscriptionManager {
  return new SubscriptionManager({
    store: new MemorySubscriptionStore(),
  });
}
