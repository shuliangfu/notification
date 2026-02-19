/**
 * @fileoverview 通知模板系统示例
 *
 * 展示模板创建、渲染、管理等功能
 */

import {
  MemoryTemplateStore,
  type NotificationTemplate,
  renderTemplateString,
  TemplateManager,
} from "../src/mod.ts";

// ============================================================================
// 模板字符串渲染
// ============================================================================

console.log("=== 模板字符串渲染 ===\n");

// 基本变量替换
const template1 = "你好，{{username}}！欢迎来到 {{appName}}。";
const result1 = renderTemplateString(template1, {
  username: "张三",
  appName: "我的应用",
});
console.log("基本替换:", result1);

// 嵌套对象访问
const template2 = "订单号：{{order.id}}，金额：{{order.amount}} 元";
const result2 = renderTemplateString(template2, {
  order: {
    id: "ORD-001",
    amount: 299.99,
  },
});
console.log("嵌套对象:", result2);

// ============================================================================
// 条件渲染
// ============================================================================

console.log("\n=== 条件渲染 ===\n");

const conditionalTemplate = `
{{#if isPremium}}
尊贵的 VIP 会员，您享有专属优惠！
{{else}}
升级为 VIP 会员，享受更多优惠！
{{/if}}
`;

console.log("VIP 用户:");
console.log(renderTemplateString(conditionalTemplate, { isPremium: true }));

console.log("普通用户:");
console.log(renderTemplateString(conditionalTemplate, { isPremium: false }));

// ============================================================================
// 循环渲染
// ============================================================================

console.log("=== 循环渲染 ===\n");

const loopTemplate = `
您的订单包含以下商品：
{{#each items}}
- {{this.name}} x {{this.quantity}}
{{/each}}
`;

const loopResult = renderTemplateString(loopTemplate, {
  items: [
    { name: "商品A", quantity: 2 },
    { name: "商品B", quantity: 1 },
    { name: "商品C", quantity: 3 },
  ],
});
console.log("循环结果:", loopResult);

// ============================================================================
// 过滤器
// ============================================================================

console.log("=== 过滤器 ===\n");

const filterTemplate = `
大写: {{name|uppercase}}
小写: {{name|lowercase}}
首字母大写: {{name|capitalize}}
日期: {{timestamp|date}}
货币: {{amount|currency}}
截断: {{longText|truncate}}
`;

const filterResult = renderTemplateString(filterTemplate, {
  name: "hello World",
  timestamp: Date.now(),
  amount: 1234.56,
  longText: "这是一段很长的文本，需要被截断显示以节省空间。",
});
console.log("过滤器结果:", filterResult);

// ============================================================================
// HTML 转义（XSS 防护）
// ============================================================================

console.log("=== HTML 转义 ===\n");

const xssTemplate = "用户输入: {{userInput}}";

// 默认开启转义
const safeResult = renderTemplateString(xssTemplate, {
  userInput: '<script>alert("XSS")</script>',
});
console.log("安全渲染（默认）:", safeResult);

// 关闭转义（谨慎使用）
const unsafeResult = renderTemplateString(
  xssTemplate,
  { userInput: "<b>粗体</b>" },
  { escapeHtml: false },
);
console.log("不转义（HTML 模板）:", unsafeResult);

// ============================================================================
// 模板管理器
// ============================================================================

console.log("\n=== 模板管理器 ===\n");

// 创建模板存储
const store = new MemoryTemplateStore();

// 创建模板管理器
const manager = new TemplateManager({ store });

// 注册模板
await manager.register({
  id: "welcome",
  name: "欢迎邮件",
  type: "email",
  subject: "欢迎加入 {{appName}}！",
  title: "欢迎，{{username}}！",
  body: "感谢您注册 {{appName}}。点击下方链接激活账号。",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1>欢迎，{{username}}！</h1>
      <p>感谢您注册 {{appName}}。</p>
      <a href="{{activationLink}}" style="
        display: inline-block;
        padding: 10px 20px;
        background: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 4px;
      ">激活账号</a>
    </div>
  `,
});

console.log("模板 'welcome' 已注册");

// 渲染模板
const rendered = await manager.render("welcome", {
  username: "张三",
  appName: "我的应用",
  activationLink: "https://example.com/activate/abc123",
});

console.log("\n渲染结果:");
console.log("Subject:", rendered.subject);
console.log("Title:", rendered.title);
console.log("Body:", rendered.body);
console.log("HTML:", rendered.html?.slice(0, 100) + "...");

// ============================================================================
// 多语言模板
// ============================================================================

console.log("\n=== 多语言模板 ===\n");

// 注册中文模板
await manager.register({
  id: "order-confirm",
  name: "订单确认",
  type: "email",
  locale: "zh-CN",
  subject: "订单确认 - {{orderId}}",
  body: "您的订单 {{orderId}} 已确认，预计 {{deliveryDate}} 送达。",
});

// 注册英文模板
await manager.register({
  id: "order-confirm",
  name: "Order Confirmation",
  type: "email",
  locale: "en-US",
  subject: "Order Confirmation - {{orderId}}",
  body:
    "Your order {{orderId}} has been confirmed. Estimated delivery: {{deliveryDate}}.",
});

// 渲染中文
const zhResult = await manager.render(
  "order-confirm",
  { orderId: "ORD-001", deliveryDate: "2024-01-20" },
  { locale: "zh-CN" },
);
console.log("中文:", zhResult.body);

// 渲染英文
const enResult = await manager.render(
  "order-confirm",
  { orderId: "ORD-001", deliveryDate: "Jan 20, 2024" },
  { locale: "en-US" },
);
console.log("英文:", enResult.body);

// ============================================================================
// 自定义过滤器
// ============================================================================

console.log("\n=== 自定义过滤器 ===\n");

// 注册自定义过滤器
manager.registerFilter("phone", (value) => {
  const str = String(value);
  return str.slice(0, 3) + "****" + str.slice(-4);
});

manager.registerFilter("money", (value) => {
  return "¥" + Number(value).toFixed(2);
});

// 使用自定义过滤器渲染
const customResult = manager.renderString(
  "手机号: {{phone|phone}}, 金额: {{amount|money}}",
  { phone: "13812345678", amount: 1234.5 },
);
console.log("自定义过滤器:", customResult);

// ============================================================================
// 预定义模板
// ============================================================================

console.log("\n=== 预定义模板 ===\n");

// 常用模板定义
const templates: NotificationTemplate[] = [
  {
    id: "verify-code",
    name: "验证码",
    type: "sms",
    body: "您的验证码是 {{code}}，{{expireMinutes}} 分钟内有效。",
  },
  {
    id: "password-reset",
    name: "密码重置",
    type: "email",
    subject: "密码重置请求",
    body: "点击链接重置密码: {{resetLink}}",
    html: `<a href="{{resetLink}}">重置密码</a>`,
  },
  {
    id: "order-shipped",
    name: "订单发货",
    type: "webpush",
    title: "订单已发货",
    body: "您的订单 {{orderId}} 已发货，快递单号: {{trackingNo}}",
  },
];

// 批量注册
for (const t of templates) {
  await manager.register(t);
  console.log(`模板 '${t.id}' (${t.type}) 已注册`);
}

// 获取所有模板
const allTemplates = await manager.getAll();
console.log(`\n共有 ${allTemplates.length} 个模板`);
