/**
 * @fileoverview 短信发送示例
 *
 * 展示短信发送的各种用法
 */

import {
  createAliyunSmsSender,
  createTencentSmsSender,
  isValidPhoneNumber,
} from "../src/mod.ts";

// ============================================================================
// 手机号验证
// ============================================================================

console.log("=== 手机号验证 ===\n");

const phoneNumbers = [
  "13800138000",
  "15912345678",
  "12345678",      // 无效
  "1234567890123", // 太长
  "08612345678",   // 无效格式
];

for (const phone of phoneNumbers) {
  console.log(`${phone}: ${isValidPhoneNumber(phone) ? "✓ 有效" : "✗ 无效"}`);
}

// ============================================================================
// 创建阿里云短信发送器
// ============================================================================

console.log("\n=== 阿里云短信 ===\n");

const _aliyunSender = createAliyunSmsSender(
  "your-access-key-id",
  "your-access-key-secret",
  "我的应用"
);

console.log("阿里云短信发送器创建成功");

// 发送示例
console.log(`
// 发送验证码短信
const result = await aliyunSender.send({
  to: "13800138000",
  templateParams: {
    code: "123456",
  },
});

if (result.success) {
  console.log("发送成功:", result.id);
} else {
  console.error("发送失败:", result.error);
}
`);

// ============================================================================
// 创建腾讯云短信发送器
// ============================================================================

console.log("=== 腾讯云短信 ===\n");

const _tencentSender = createTencentSmsSender(
  "your-secret-id",
  "your-secret-key",
  "1400000000",
  "我的应用"
);

console.log("腾讯云短信发送器创建成功");

// 发送示例
console.log(`
// 发送短信
const result = await tencentSender.send({
  to: "13800138000",
  templateParams: ["123456", "5"], // 模板参数
});
`);

// ============================================================================
// Twilio 短信发送器
// ============================================================================

console.log("=== Twilio 短信 ===\n");

console.log(`
// 创建 Twilio 短信发送器
const twilioSender = new SmsSender({
  provider: "twilio",
  accountSid: "your-account-sid",
  authToken: "your-auth-token",
  fromNumber: "+1234567890",
});
`);

console.log("Twilio 短信发送器示例");

// ============================================================================
// 发送验证码
// ============================================================================

console.log("=== 发送验证码（示例代码）===\n");

console.log(`
// 生成随机验证码
function generateCode(length = 6): string {
  return Math.random().toString().slice(2, 2 + length);
}

const code = generateCode();

// 发送验证码短信
const result = await aliyunSender.send({
  to: "13800138000",
  templateCode: "SMS_VERIFY_CODE",
  templateParams: {
    code: code,
    expireMinutes: "5",
  },
});

// 存储验证码（Redis 或内存）
await redis.setex(\`sms:code:\${phone}\`, 300, code);
`);

// ============================================================================
// 批量发送
// ============================================================================

console.log("=== 批量发送（示例代码）===\n");

console.log(`
// 批量发送短信
const phones = [
  "13800138001",
  "13800138002",
  "13800138003",
];

const results = await Promise.all(
  phones.map(phone => 
    sender.send({
      to: phone,
      templateParams: { code: generateCode() },
    })
  )
);

const success = results.filter(r => r.success).length;
console.log(\`发送结果: \${success}/\${phones.length} 成功\`);
`);

// ============================================================================
// 国际短信
// ============================================================================

console.log("=== 国际短信（示例代码）===\n");

console.log(`
// 发送国际短信（需要提供国家代码）
const result = await sender.send({
  to: "+1234567890",  // 美国号码
  countryCode: "1",
  templateParams: {
    code: "123456",
  },
});
`);

// ============================================================================
// 短信模板管理
// ============================================================================

console.log("=== 短信模板（示例代码）===\n");

console.log(`
// 常用短信模板

// 验证码模板
const VERIFY_CODE_TEMPLATE = "SMS_VERIFY_CODE";
// 模板内容: 您的验证码是\${code}，有效期\${minutes}分钟。

// 订单通知模板
const ORDER_NOTIFY_TEMPLATE = "SMS_ORDER_NOTIFY";
// 模板内容: 您的订单\${orderId}已\${status}。

// 物流通知模板
const SHIPPING_TEMPLATE = "SMS_SHIPPING";
// 模板内容: 您的包裹已由\${company}发出，单号\${trackingNo}。

// 使用不同模板
await sender.send({
  to: phone,
  templateCode: ORDER_NOTIFY_TEMPLATE,
  templateParams: {
    orderId: "202401150001",
    status: "发货",
  },
});
`);

// ============================================================================
// 错误处理
// ============================================================================

console.log("=== 错误处理（示例代码）===\n");

console.log(`
// 短信发送错误处理
try {
  const result = await sender.send({
    to: phone,
    templateParams: { code: "123456" },
  });

  if (!result.success) {
    // 发送失败但没有抛出异常
    switch (result.error) {
      case "INVALID_PHONE":
        console.error("手机号格式错误");
        break;
      case "TEMPLATE_NOT_FOUND":
        console.error("短信模板不存在");
        break;
      case "QUOTA_EXCEEDED":
        console.error("发送配额超限");
        break;
      case "FREQUENCY_LIMIT":
        console.error("发送频率限制");
        break;
      default:
        console.error("发送失败:", result.error);
    }
  }
} catch (error) {
  // 网络错误等
  console.error("发送异常:", error.message);
}
`);
