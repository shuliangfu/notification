# @dreamer/notification 示例

本目录包含 `@dreamer/notification` 包的使用示例。

## 示例列表

| 文件                         | 说明                                           |
| ---------------------------- | ---------------------------------------------- |
| [email.ts](./email.ts)       | 邮件发送：SMTP 配置、HTML 邮件、附件、批量发送 |
| [sms.ts](./sms.ts)           | 短信发送：阿里云、腾讯云、验证码               |
| [webhook.ts](./webhook.ts)   | Webhook 通知：签名生成、验证、时间戳防重放     |
| [template.ts](./template.ts) | 模板系统：变量替换、条件、循环、过滤器         |
| [webpush.ts](./webpush.ts)   | Web Push：VAPID 密钥、订阅、推送通知           |

## 运行示例

```bash
# 运行邮件示例
deno run -A examples/email.ts

# 运行短信示例
deno run -A examples/sms.ts

# 运行 Webhook 示例
deno run -A examples/webhook.ts

# 运行模板示例
deno run -A examples/template.ts

# 运行 Web Push 示例
deno run -A examples/webpush.ts
```

## 功能概览

### 邮件发送

- SMTP 配置（支持 SSL/TLS）
- HTML 邮件
- 附件支持
- 模板邮件
- 批量发送（并发处理）
- 验证码邮件

### 短信发送

- 阿里云短信
- 腾讯云短信
- 自定义短信服务
- 验证码短信
- 国际短信

### Webhook 通知

- 签名生成（HMAC-SHA256）
- 签名验证
- 时间戳验证（防重放攻击）
- 重试机制
- 支持 Slack、钉钉、企业微信

### 模板系统

- 变量替换 `{{variable}}`
- 条件渲染 `{{#if}}...{{/if}}`
- 循环渲染 `{{#each}}...{{/each}}`
- 内置过滤器（uppercase、date、currency 等）
- 自定义过滤器
- HTML 转义（XSS 防护）
- 多语言支持

### Web Push

- VAPID 密钥生成
- 推送通知发送
- 操作按钮
- 批量推送
- 订阅管理
