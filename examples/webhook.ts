/**
 * @fileoverview Webhook 通知示例
 *
 * 展示 Webhook 发送和签名验证
 */

import {
  WebhookSender,
  createWebhookSender,
  createWebhookSignature,
  verifyWebhookSignature,
  createWebhookPayload,
} from "../src/mod.ts";

// ============================================================================
// 创建 Webhook 发送器
// ============================================================================

console.log("=== 创建 Webhook 发送器 ===\n");

// 方式一：使用工厂函数
const _sender = createWebhookSender({
  url: "https://api.example.com/webhook",
  secret: "your-webhook-secret",
  method: "POST",
  headers: {
    "X-Custom-Header": "custom-value",
  },
});

console.log("Webhook 发送器创建成功");

// 方式二：直接实例化
const _sender2 = new WebhookSender({
  url: "https://hooks.slack.com/services/xxx",
  // Slack 不需要签名
});

console.log("Slack Webhook 发送器创建成功");

// ============================================================================
// 发送 Webhook 通知
// ============================================================================

console.log("\n=== 发送 Webhook 通知（示例代码）===\n");

console.log(`
// 发送通知
const result = await sender.send({
  title: "新订单通知",
  body: "您有一个新订单需要处理",
  data: {
    orderId: "ORD-20240115-001",
    amount: 299.99,
    customer: "张三",
    items: [
      { name: "商品A", quantity: 2 },
      { name: "商品B", quantity: 1 },
    ],
  },
});

if (result.success) {
  console.log("Webhook 发送成功:", result.id);
} else {
  console.error("Webhook 发送失败:", result.error);
}
`);

// ============================================================================
// Webhook 签名
// ============================================================================

console.log("=== Webhook 签名 ===\n");

const payload = JSON.stringify({
  event: "order.created",
  data: { orderId: "123" },
  timestamp: Date.now(),
});

const secret = "webhook-secret-key";

// 创建签名
const signature = await createWebhookSignature(payload, secret);
console.log("Payload:", payload);
console.log("Signature:", signature);

// ============================================================================
// 验证 Webhook 签名（接收方）
// ============================================================================

console.log("\n=== 验证 Webhook 签名 ===\n");

// 验证正确的签名
const validResult = await verifyWebhookSignature(payload, signature, secret);
console.log("正确签名验证结果:", validResult);

// 验证错误的签名
const invalidResult = await verifyWebhookSignature(payload, "wrong-signature", secret);
console.log("错误签名验证结果:", invalidResult);

// 验证带时间戳的签名（防重放攻击）
console.log("\n带时间戳验证:");

const timestampValidResult = await verifyWebhookSignature(
  payload,
  signature,
  secret,
  "SHA-256",
  {
    timestamp: Date.now(),
    maxAge: 300000, // 5 分钟有效期
  }
);
console.log("有效时间戳:", timestampValidResult);

const expiredResult = await verifyWebhookSignature(
  payload,
  signature,
  secret,
  "SHA-256",
  {
    timestamp: Date.now() - 600000, // 10 分钟前
    maxAge: 300000,
  }
);
console.log("过期时间戳:", expiredResult);

// ============================================================================
// 创建标准 Webhook Payload
// ============================================================================

console.log("\n=== 创建标准 Payload ===\n");

const webhookPayload = createWebhookPayload(
  {
    title: "系统告警",
    body: "CPU 使用率超过 90%",
    data: {
      metric: "cpu",
      value: 92.5,
      threshold: 90,
    },
  },
  {
    timeout: 30000,
    retries: 3,
  }
);

console.log("Webhook Payload:");
console.log(JSON.stringify(webhookPayload, null, 2));

// ============================================================================
// 批量发送
// ============================================================================

console.log("\n=== 批量发送（示例代码）===\n");

console.log(`
// 批量发送 Webhook
const contents = [
  { title: "通知1", body: "内容1" },
  { title: "通知2", body: "内容2" },
  { title: "通知3", body: "内容3" },
];

const results = await sender.sendBatch(contents);

console.log(\`成功: \${results.filter(r => r.success).length}\`);
console.log(\`失败: \${results.filter(r => !r.success).length}\`);
`);

// ============================================================================
// 重试机制
// ============================================================================

console.log("=== 重试机制（示例代码）===\n");

console.log(`
// 配置重试
const result = await sender.send(
  { title: "重要通知", body: "内容" },
  {
    timeout: 10000,  // 10 秒超时
    retries: 5,       // 最多重试 5 次
  }
);
`);

// ============================================================================
// 不同平台的 Webhook
// ============================================================================

console.log("=== 不同平台的 Webhook ===\n");

// Slack Webhook
console.log("Slack Webhook:");
console.log(`
const slackSender = createWebhookSender({
  url: "https://hooks.slack.com/services/T00/B00/XXX",
});

await slackSender.send({
  title: "新消息",
  body: "这是一条来自系统的消息",
  data: {
    // Slack 特定格式
    text: "新消息通知",
    attachments: [{
      color: "#36a64f",
      title: "订单已完成",
      text: "订单 #123 已成功完成",
    }],
  },
});
`);

// 钉钉 Webhook
console.log("\n钉钉 Webhook:");
console.log(`
const dingTalkSender = createWebhookSender({
  url: "https://oapi.dingtalk.com/robot/send?access_token=XXX",
});

await dingTalkSender.send({
  title: "告警",
  body: "服务器异常",
  data: {
    msgtype: "text",
    text: {
      content: "【告警】服务器 CPU 使用率过高",
    },
  },
});
`);

// 企业微信 Webhook
console.log("\n企业微信 Webhook:");
console.log(`
const wechatWorkSender = createWebhookSender({
  url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=XXX",
});

await wechatWorkSender.send({
  title: "通知",
  body: "内容",
  data: {
    msgtype: "text",
    text: {
      content: "这是一条企业微信通知",
    },
  },
});
`);

// ============================================================================
// Webhook 接收端示例
// ============================================================================

console.log("\n=== Webhook 接收端示例 ===\n");

console.log(`
// Deno/Oak 接收 Webhook
import { Application, Router } from "oak";

const app = new Application();
const router = new Router();

router.post("/webhook", async (ctx) => {
  const body = await ctx.request.body().value;
  const signature = ctx.request.headers.get("X-Signature");
  const timestamp = ctx.request.headers.get("X-Timestamp");

  // 验证签名
  const result = await verifyWebhookSignature(
    JSON.stringify(body),
    signature!,
    "your-secret",
    "SHA-256",
    { timestamp: parseInt(timestamp!), maxAge: 300000 }
  );

  if (!result.valid) {
    ctx.response.status = 401;
    ctx.response.body = { error: result.error };
    return;
  }

  // 处理 Webhook
  console.log("收到 Webhook:", body);

  ctx.response.body = { success: true };
});

app.use(router.routes());
await app.listen({ port: 3000 });
`);
