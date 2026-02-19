/**
 * @fileoverview 邮件发送示例
 *
 * 展示邮件发送的各种用法
 */

import {
  createEmailSender,
  EmailSender,
  isValidEmail,
  validateEmails,
} from "../src/mod.ts";

// ============================================================================
// 邮箱验证
// ============================================================================

console.log("=== 邮箱验证 ===\n");

const emails = [
  "user@example.com",
  "admin@company.org",
  "invalid-email",
  "test@",
  "hello.world@domain.co.uk",
];

for (const email of emails) {
  console.log(`${email}: ${isValidEmail(email) ? "✓ 有效" : "✗ 无效"}`);
}

// 批量验证
const { valid, invalid } = validateEmails(emails);
console.log("\n有效邮箱:", valid);
console.log("无效邮箱:", invalid);

// ============================================================================
// 创建邮件发送器
// ============================================================================

console.log("\n=== 创建邮件发送器 ===\n");

// 方式一：使用 createEmailSender 工厂函数
const _sender1 = createEmailSender({
  host: "smtp.example.com",
  port: 587,
  username: "noreply@example.com",
  password: "your-password",
  secure: false, // 使用 STARTTLS
  from: "noreply@example.com",
  fromName: "我的应用",
});

console.log("邮件发送器创建成功（工厂函数）");

// 方式二：直接实例化 EmailSender
const _sender2 = new EmailSender({
  host: "smtp.gmail.com",
  port: 465,
  username: "your-email@gmail.com",
  password: "your-app-password",
  secure: true, // 使用 SSL
  from: "your-email@gmail.com",
  fromName: "通知服务",
});

console.log("邮件发送器创建成功（直接实例化）");

// ============================================================================
// 发送简单邮件
// ============================================================================

console.log("\n=== 发送简单邮件（示例代码）===\n");

console.log(`
// 发送纯文本邮件
const result = await sender.send({
  to: "recipient@example.com",
  subject: "测试邮件",
  text: "这是一封测试邮件的正文内容。",
});

if (result.success) {
  console.log("发送成功，ID:", result.id);
} else {
  console.error("发送失败:", result.error);
}
`);

// ============================================================================
// 发送 HTML 邮件
// ============================================================================

console.log("=== 发送 HTML 邮件（示例代码）===\n");

console.log(`
// 发送 HTML 邮件
const result = await sender.send({
  to: "recipient@example.com",
  subject: "欢迎注册",
  text: "欢迎注册我们的服务！", // 纯文本备用
  html: \`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { padding: 20px; font-family: Arial, sans-serif; }
        .header { color: #333; font-size: 24px; }
        .button { 
          background: #007bff; 
          color: white; 
          padding: 10px 20px; 
          text-decoration: none;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="header">欢迎加入！</h1>
        <p>感谢您注册我们的服务。</p>
        <a href="https://example.com/verify" class="button">验证邮箱</a>
      </div>
    </body>
    </html>
  \`,
});
`);

// ============================================================================
// 发送带附件的邮件
// ============================================================================

console.log("=== 发送带附件的邮件（示例代码）===\n");

console.log(`
// 发送带附件的邮件
const result = await sender.send({
  to: "recipient@example.com",
  subject: "附件测试",
  text: "请查收附件。",
  attachments: [
    {
      filename: "report.pdf",
      content: pdfBuffer, // Uint8Array
      contentType: "application/pdf",
    },
    {
      filename: "image.png",
      content: imageBuffer,
      contentType: "image/png",
    },
  ],
});
`);

// ============================================================================
// 使用模板发送
// ============================================================================

console.log("=== 使用模板发送（示例代码）===\n");

console.log(`
// 发送模板邮件
const result = await sender.sendTemplate({
  to: "user@example.com",
  templateId: "welcome-email",
  variables: {
    username: "张三",
    activationLink: "https://example.com/activate/abc123",
    expiresIn: "24小时",
  },
});
`);

// ============================================================================
// 批量发送
// ============================================================================

console.log("=== 批量发送（示例代码）===\n");

console.log(`
// 批量发送邮件（并发处理）
const emails = [
  { to: "user1@example.com", subject: "通知1", text: "内容1" },
  { to: "user2@example.com", subject: "通知2", text: "内容2" },
  { to: "user3@example.com", subject: "通知3", text: "内容3" },
];

const result = await sender.sendBatch(emails, {
  batchSize: 10,    // 每批 10 封
  delay: 1000,       // 批次间隔 1 秒
  continueOnError: true, // 失败时继续
});

console.log(\`总数: \${result.total}\`);
console.log(\`成功: \${result.success}\`);
console.log(\`失败: \${result.failed}\`);
`);

// ============================================================================
// 发送验证码邮件
// ============================================================================

console.log("=== 发送验证码邮件（示例代码）===\n");

console.log(`
// 使用内置的验证码邮件方法
const result = await sender.sendVerificationCode(
  "user@example.com",
  "123456",
  {
    subject: "您的验证码",
    expiresIn: "5分钟",
  }
);
`);

// ============================================================================
// 连接管理
// ============================================================================

console.log("=== 连接管理 ===\n");

console.log(`
// 手动管理连接（可选，发送时会自动连接）

// 连接
await sender.connect();
console.log("SMTP 连接成功");

// 发送多封邮件...
await sender.send({ ... });
await sender.send({ ... });

// 断开连接
await sender.disconnect();
console.log("SMTP 连接已断开");
`);
