/**
 * @fileoverview 通知队列模块
 *
 * 提供通知的异步发送和队列管理功能：
 * - 任务队列
 * - 重试机制
 * - 批量发送
 * - 发送统计
 */

import type {
  EmailOptions,
  NotificationContent,
  NotificationResult,
  NotificationType,
  PushSubscription,
  SmsOptions,
} from "./types.ts";

import { createErrorResult, generateNotificationId } from "./utils.ts";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 任务状态
 */
export type TaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * 任务优先级
 */
export type TaskPriority = "low" | "normal" | "high" | "urgent";

/**
 * 通知任务
 */
export interface NotificationTask {
  /** 任务 ID */
  id: string;
  /** 通知类型 */
  type: NotificationType;
  /** 接收者（邮箱、手机号、订阅等） */
  recipient: string | string[] | PushSubscription | PushSubscription[];
  /** 通知内容或选项 */
  payload:
    | NotificationContent
    | EmailOptions
    | SmsOptions
    | Record<string, unknown>;
  /** 任务状态 */
  status: TaskStatus;
  /** 优先级 */
  priority: TaskPriority;
  /** 创建时间 */
  createdAt: number;
  /** 计划执行时间（延迟发送） */
  scheduledAt?: number;
  /** 开始处理时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 上次错误信息 */
  lastError?: string;
  /** 发送结果 */
  result?: NotificationResult;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 任务存储接口
 */
export interface TaskStore {
  /**
   * 添加任务
   */
  add(task: NotificationTask): Promise<void>;

  /**
   * 获取任务
   */
  get(id: string): Promise<NotificationTask | null>;

  /**
   * 更新任务
   */
  update(id: string, updates: Partial<NotificationTask>): Promise<void>;

  /**
   * 删除任务
   */
  delete(id: string): Promise<void>;

  /**
   * 获取待处理任务
   */
  getPending(limit?: number): Promise<NotificationTask[]>;

  /**
   * 获取失败任务（可重试）
   */
  getRetryable(limit?: number): Promise<NotificationTask[]>;

  /**
   * 获取任务统计
   */
  getStats(): Promise<TaskStats>;

  /**
   * 清理已完成任务
   */
  cleanup(olderThan: number): Promise<number>;
}

/**
 * 任务统计
 */
export interface TaskStats {
  /** 待处理 */
  pending: number;
  /** 处理中 */
  processing: number;
  /** 已完成 */
  completed: number;
  /** 失败 */
  failed: number;
  /** 已取消 */
  cancelled: number;
  /** 总数 */
  total: number;
}

/**
 * 发送器接口
 */
export interface NotificationSender {
  /**
   * 发送通知
   */
  send(task: NotificationTask): Promise<NotificationResult>;
}

/**
 * 队列配置
 */
export interface QueueConfig {
  /** 任务存储 */
  store: TaskStore;
  /** 发送器映射 */
  senders: Partial<Record<NotificationType, NotificationSender>>;
  /** 并发数（默认：5） */
  concurrency?: number;
  /** 批处理大小（默认：10） */
  batchSize?: number;
  /** 处理间隔（毫秒，默认：1000） */
  pollInterval?: number;
  /** 默认最大重试次数（默认：3） */
  defaultMaxRetries?: number;
  /** 重试延迟（毫秒，默认：5000） */
  retryDelay?: number;
  /** 失败回调 */
  onFailed?: (task: NotificationTask, error: Error) => void;
  /** 成功回调 */
  onCompleted?: (task: NotificationTask, result: NotificationResult) => void;
}

// ============================================================================
// 内存任务存储
// ============================================================================

/**
 * 内存任务存储
 */
export class MemoryTaskStore implements TaskStore {
  private tasks: Map<string, NotificationTask> = new Map();

  /**
   * 添加任务
   * 注：返回 Promise 是为了与异步存储实现（如数据库）保持接口一致
   */
  add(task: NotificationTask): Promise<void> {
    this.tasks.set(task.id, { ...task });
    return Promise.resolve();
  }

  /**
   * 获取任务
   */
  get(id: string): Promise<NotificationTask | null> {
    const task = this.tasks.get(id);
    return Promise.resolve(task ? { ...task } : null);
  }

  /**
   * 更新任务
   */
  update(id: string, updates: Partial<NotificationTask>): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.set(id, { ...task, ...updates });
    }
    return Promise.resolve();
  }

  /**
   * 删除任务
   */
  delete(id: string): Promise<void> {
    this.tasks.delete(id);
    return Promise.resolve();
  }

  /**
   * 获取待处理任务
   */
  getPending(limit = 100): Promise<NotificationTask[]> {
    const now = Date.now();
    const pending: NotificationTask[] = [];

    for (const task of this.tasks.values()) {
      if (task.status === "pending") {
        // 检查是否到达计划执行时间
        if (!task.scheduledAt || task.scheduledAt <= now) {
          pending.push({ ...task });
        }
      }
    }

    // 按优先级和创建时间排序
    pending.sort((a, b) => {
      const priorityOrder: Record<TaskPriority, number> = {
        urgent: 0,
        high: 1,
        normal: 2,
        low: 3,
      };

      const priorityDiff = priorityOrder[a.priority] -
        priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return a.createdAt - b.createdAt;
    });

    return Promise.resolve(pending.slice(0, limit));
  }

  /**
   * 获取可重试任务
   */
  getRetryable(limit = 100): Promise<NotificationTask[]> {
    const retryable: NotificationTask[] = [];

    for (const task of this.tasks.values()) {
      if (task.status === "failed" && task.retryCount < task.maxRetries) {
        retryable.push({ ...task });
      }
    }

    return Promise.resolve(retryable.slice(0, limit));
  }

  /**
   * 获取任务统计
   */
  getStats(): Promise<TaskStats> {
    const stats: TaskStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    };

    for (const task of this.tasks.values()) {
      stats.total++;
      stats[task.status]++;
    }

    return Promise.resolve(stats);
  }

  /**
   * 清理已完成任务
   */
  cleanup(olderThan: number): Promise<number> {
    const cutoff = Date.now() - olderThan;
    let count = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (
        (task.status === "completed" || task.status === "cancelled") &&
        task.completedAt &&
        task.completedAt < cutoff
      ) {
        this.tasks.delete(id);
        count++;
      }
    }

    return Promise.resolve(count);
  }

  /**
   * 获取所有任务（测试用）
   */
  getAll(): NotificationTask[] {
    return Array.from(this.tasks.values()).map((t) => ({ ...t }));
  }
}

// ============================================================================
// 通知队列
// ============================================================================

/**
 * 通知队列
 *
 * @example
 * ```typescript
 * const queue = new NotificationQueue({
 *   store: new MemoryTaskStore(),
 *   senders: {
 *     email: emailSender,
 *     sms: smsSender,
 *     webpush: pushSender,
 *   },
 * });
 *
 * // 添加任务
 * const taskId = await queue.enqueue({
 *   type: "email",
 *   recipient: "user@example.com",
 *   payload: {
 *     subject: "测试",
 *     html: "<h1>测试邮件</h1>",
 *   },
 * });
 *
 * // 启动处理
 * queue.start();
 *
 * // 停止处理
 * queue.stop();
 * ```
 */
export class NotificationQueue {
  private config: Required<QueueConfig>;
  private running = false;
  private pollTimer?: number;
  private processingCount = 0;

  constructor(config: QueueConfig) {
    this.config = {
      store: config.store,
      senders: config.senders,
      concurrency: config.concurrency ?? 5,
      batchSize: config.batchSize ?? 10,
      pollInterval: config.pollInterval ?? 1000,
      defaultMaxRetries: config.defaultMaxRetries ?? 3,
      retryDelay: config.retryDelay ?? 5000,
      onFailed: config.onFailed ?? (() => {}),
      onCompleted: config.onCompleted ?? (() => {}),
    };
  }

  /**
   * 添加任务到队列
   *
   * @param options - 任务选项
   * @returns 任务 ID
   */
  async enqueue(options: {
    type: NotificationType;
    recipient: string | string[] | PushSubscription | PushSubscription[];
    payload:
      | NotificationContent
      | EmailOptions
      | SmsOptions
      | Record<string, unknown>;
    priority?: TaskPriority;
    scheduledAt?: number | Date;
    maxRetries?: number;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = generateNotificationId("task");
    const now = Date.now();

    const task: NotificationTask = {
      id,
      type: options.type,
      recipient: options.recipient,
      payload: options.payload,
      status: "pending",
      priority: options.priority || "normal",
      createdAt: now,
      scheduledAt: options.scheduledAt
        ? options.scheduledAt instanceof Date
          ? options.scheduledAt.getTime()
          : options.scheduledAt
        : undefined,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
      metadata: options.metadata,
    };

    await this.config.store.add(task);
    return id;
  }

  /**
   * 批量添加任务
   *
   * @param tasks - 任务列表
   * @returns 任务 ID 列表
   */
  async enqueueBatch(
    tasks: Array<{
      type: NotificationType;
      recipient: string | string[] | PushSubscription | PushSubscription[];
      payload:
        | NotificationContent
        | EmailOptions
        | SmsOptions
        | Record<string, unknown>;
      priority?: TaskPriority;
      scheduledAt?: number | Date;
      maxRetries?: number;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const task of tasks) {
      const id = await this.enqueue(task);
      ids.push(id);
    }
    return ids;
  }

  /**
   * 获取任务
   *
   * @param id - 任务 ID
   * @returns 任务
   */
  async getTask(id: string): Promise<NotificationTask | null> {
    return await this.config.store.get(id);
  }

  /**
   * 取消任务
   *
   * @param id - 任务 ID
   * @returns 是否成功取消
   */
  async cancelTask(id: string): Promise<boolean> {
    const task = await this.config.store.get(id);
    if (!task || task.status !== "pending") {
      return false;
    }

    await this.config.store.update(id, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return true;
  }

  /**
   * 重试失败任务
   *
   * @param id - 任务 ID
   * @returns 是否成功重新入队
   */
  async retryTask(id: string): Promise<boolean> {
    const task = await this.config.store.get(id);
    if (!task || task.status !== "failed") {
      return false;
    }

    await this.config.store.update(id, {
      status: "pending",
      retryCount: task.retryCount + 1,
      lastError: undefined,
    });

    return true;
  }

  /**
   * 启动队列处理
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.poll();
  }

  /**
   * 停止队列处理
   */
  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 轮询处理任务
   */
  private async poll(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      await this.processBatch();
    } catch (error) {
      console.error("队列处理错误:", error);
    }

    // 安排下一次轮询（仅在仍运行时安排，避免 stop() 后产生孤儿定时器导致内存泄漏）
    if (this.running) {
      this.pollTimer = setTimeout(() => {
        this.poll();
      }, this.config.pollInterval) as unknown as number;
    }
  }

  /**
   * 处理一批任务
   */
  private async processBatch(): Promise<void> {
    // 检查并发限制
    const availableSlots = this.config.concurrency - this.processingCount;
    if (availableSlots <= 0) {
      return;
    }

    // 获取待处理任务
    const tasks = await this.config.store.getPending(
      Math.min(availableSlots, this.config.batchSize),
    );

    if (tasks.length === 0) {
      // 检查可重试任务
      const retryableTasks = await this.config.store.getRetryable(
        Math.min(availableSlots, this.config.batchSize),
      );

      for (const task of retryableTasks) {
        await this.config.store.update(task.id, {
          status: "pending",
          retryCount: task.retryCount + 1,
        });
      }

      return;
    }

    // 并发处理任务
    await Promise.all(tasks.map((task) => this.processTask(task)));
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: NotificationTask): Promise<void> {
    this.processingCount++;

    try {
      // 更新状态为处理中
      await this.config.store.update(task.id, {
        status: "processing",
        startedAt: Date.now(),
      });

      // 获取发送器
      const sender = this.config.senders[task.type];
      if (!sender) {
        throw new Error(`未配置 ${task.type} 类型的发送器`);
      }

      // 发送通知
      const result = await sender.send(task);

      if (result.success) {
        // 成功
        await this.config.store.update(task.id, {
          status: "completed",
          completedAt: Date.now(),
          result,
        });

        this.config.onCompleted(task, result);
      } else {
        // 失败
        throw new Error(result.error || "发送失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      // 检查是否可以重试
      if (task.retryCount < task.maxRetries) {
        await this.config.store.update(task.id, {
          status: "pending",
          retryCount: task.retryCount + 1,
          lastError: errorMessage,
          // 延迟重试
          scheduledAt: Date.now() + this.config.retryDelay,
        });
      } else {
        // 标记为失败
        await this.config.store.update(task.id, {
          status: "failed",
          completedAt: Date.now(),
          lastError: errorMessage,
          result: createErrorResult(errorMessage),
        });

        this.config.onFailed(task, new Error(errorMessage));
      }
    } finally {
      this.processingCount--;
    }
  }

  /**
   * 获取队列统计
   */
  async getStats(): Promise<TaskStats & { processingCount: number }> {
    const stats = await this.config.store.getStats();
    return {
      ...stats,
      processingCount: this.processingCount,
    };
  }

  /**
   * 清理已完成任务
   *
   * @param olderThan - 清理多久之前的任务（毫秒，默认 24 小时）
   * @returns 清理的任务数量
   */
  async cleanup(olderThan = 24 * 60 * 60 * 1000): Promise<number> {
    return await this.config.store.cleanup(olderThan);
  }

  /**
   * 立即处理队列（不等待轮询）
   */
  async flush(): Promise<void> {
    while (true) {
      const stats = await this.config.store.getStats();
      if (stats.pending === 0 && stats.processing === 0) {
        break;
      }
      await this.processBatch();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建通知队列
 *
 * @param config - 队列配置
 * @returns 通知队列实例
 */
export function createNotificationQueue(
  config: QueueConfig,
): NotificationQueue {
  return new NotificationQueue(config);
}

/**
 * 创建内存通知队列
 *
 * @param senders - 发送器映射
 * @returns 使用内存存储的通知队列
 */
export function createMemoryNotificationQueue(
  senders: Partial<Record<NotificationType, NotificationSender>>,
): NotificationQueue {
  return new NotificationQueue({
    store: new MemoryTaskStore(),
    senders,
  });
}
