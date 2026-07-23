# Test Report – @dreamer/notification

**中文版**：[docs/zh-CN/TEST_REPORT.md](../zh-CN/TEST_REPORT.md)

## Overview

| Item                | Value                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| **Package version** | `@dreamer/notification@1.1.0`                                         |
| **Command**         | Deno: `deno test -A tests/` · Bun: `bun test tests/` · Node: `npm run test:node` |
| **Environment**     | Deno 2.9+ / Bun 1.3+ / Node.js 22+                                    |
| **Test framework**  | `@dreamer/test@^1.2.3`                                                |
| **Total tests**     | 117 (Deno) / 115 (Bun) / 115 (Node)                                   |
| **Passed**          | 117 / 115 / 115                                                       |
| **Failed**          | 0 / 0 / 0                                                             |

> The Deno test runner counts 2 framework teardown steps in the total, so Deno
> reports 117 while Bun/Node report 115; the business `it()` cases are identical
> across runtimes, all with 0 failures.

## Test file summary

| File                  | Count |
| --------------------- | ----- |
| `tests/email.test.ts` | 21    |
| `tests/mod.test.ts`   | 94    |

## Test case details

### Email validation (2 tests)

| Test name                             | Status |
| ------------------------------------- | ------ |
| Should return true for valid email    | ✅     |
| Should return false for invalid email | ✅     |

### Batch email validation (2 tests)

| Test name                                | Status |
| ---------------------------------------- | ------ |
| Should separate valid and invalid emails | ✅     |
| Should handle empty array                | ✅     |

### Email payload creation (4 tests)

| Test name                         | Status |
| --------------------------------- | ------ |
| Should create basic email payload | ✅     |
| Should handle multiple recipients | ✅     |
| Should handle CC and BCC          | ✅     |
| Should support HTML content       | ✅     |

### Success/error result creation (3 tests)

| Test name                       | Status |
| ------------------------------- | ------ |
| Should create success result    | ✅     |
| Should auto-generate message ID | ✅     |
| Should create error result      | ✅     |

### ID generation (2 tests)

| Test name                 | Status |
| ------------------------- | ------ |
| Should generate unique ID | ✅     |
| Should use custom prefix  | ✅     |

### EmailSender (8 tests)

| Test name                                       | Status |
| ----------------------------------------------- | ------ |
| Should create EmailSender instance              | ✅     |
| Should register template                        | ✅     |
| Should register templates in batch              | ✅     |
| Should remove template                          | ✅     |
| Should return error for invalid email           | ✅     |
| Should return error for multiple invalid emails | ✅     |
| Should return error for non-existent template   | ✅     |
| Should create EmailSender (factory)             | ✅     |

### Web Push payload creation (2 tests)

| Test name                   | Status |
| --------------------------- | ------ |
| Should create basic payload | ✅     |
| Should include options      | ✅     |

### Push subscription validation (2 tests)

| Test name                                    | Status |
| -------------------------------------------- | ------ |
| Should return true for valid subscription    | ✅     |
| Should return false for invalid subscription | ✅     |

### VAPID key generation (2 tests)

| Test name                                    | Status |
| -------------------------------------------- | ------ |
| Should generate key pair                     | ✅     |
| Should generate different key pair each time | ✅     |

### Web Push sender (2 tests)

| Test name                     | Status |
| ----------------------------- | ------ |
| Should create sender instance | ✅     |
| Should get public key         | ✅     |

### SMS payload creation (3 tests)

| Test name                             | Status |
| ------------------------------------- | ------ |
| Should create basic payload           | ✅     |
| Should support multiple phone numbers | ✅     |
| Should include template params        | ✅     |

### Phone number validation (3 tests)

| Test name                                   | Status |
| ------------------------------------------- | ------ |
| Should return true for Chinese number       | ✅     |
| Should return true for international format | ✅     |
| Should return false for invalid number      | ✅     |

### Phone number formatting (2 tests)

| Test name                         | Status |
| --------------------------------- | ------ |
| Should add Chinese region code    | ✅     |
| Should support custom region code | ✅     |

### SmsSender (5 tests)

| Test name                              | Status |
| -------------------------------------- | ------ |
| Should create Aliyun sender            | ✅     |
| Should create Tencent sender           | ✅     |
| Should create Twilio sender            | ✅     |
| Should validate invalid phone          | ✅     |
| Should validate invalid among multiple | ✅     |

### Webhook payload creation (1 test)

| Test name             | Status |
| --------------------- | ------ |
| Should create payload | ✅     |

### Webhook signature (3 tests)

| Test name                       | Status |
| ------------------------------- | ------ |
| Should create signature         | ✅     |
| Should verify correct signature | ✅     |
| Should reject wrong signature   | ✅     |

### MemorySubscriptionStore (9 tests)

| Test name                                        | Status |
| ------------------------------------------------ | ------ |
| Should save and get subscription                 | ✅     |
| Should get subscriptions by user                 | ✅     |
| Should update subscription                       | ✅     |
| Should check subscription exists                 | ✅     |
| Should delete subscription                       | ✅     |
| Should clear all subscriptions                   | ✅     |
| Should get subscriptions by type                 | ✅     |
| Should return only enabled subscriptions         | ✅     |
| Should return null for non-existent subscription | ✅     |

### SubscriptionManager (9 tests)

| Test name                            | Status |
| ------------------------------------ | ------ |
| Should add email subscription        | ✅     |
| Should add SMS subscription          | ✅     |
| Should remove subscription           | ✅     |
| Should enable/disable subscription   | ✅     |
| Should add WebPush subscription      | ✅     |
| Should add Webhook subscription      | ✅     |
| Should get user subscriptions        | ✅     |
| Should get user Push subscriptions   | ✅     |
| Should get all subscriptions by type | ✅     |

### renderTemplateString (10 tests)

| Test name                           | Status |
| ----------------------------------- | ------ |
| Should replace variables            | ✅     |
| Should support nested variables     | ✅     |
| Should support conditional          | ✅     |
| Should support loop                 | ✅     |
| Should support filters              | ✅     |
| Should handle undefined variable    | ✅     |
| Should handle empty loop            | ✅     |
| Should support deep nested variable | ✅     |
| Should handle basic array loop      | ✅     |
| Should handle if condition false    | ✅     |

### TemplateManager (9 tests)

| Test name                                     | Status |
| --------------------------------------------- | ------ |
| Should register and get template              | ✅     |
| Should render template                        | ✅     |
| Should register custom filter                 | ✅     |
| Should register templates in batch            | ✅     |
| Should remove template                        | ✅     |
| Should get all templates                      | ✅     |
| Should get templates by type                  | ✅     |
| Should throw for non-existent template render | ✅     |
| Should support multi-language templates       | ✅     |

### MemoryTemplateStore (5 tests)

| Test name                              | Status |
| -------------------------------------- | ------ |
| Should save and get template           | ✅     |
| Should support language versions       | ✅     |
| Should delete template and its locales | ✅     |
| Should get all templates               | ✅     |
| Should get templates by type           | ✅     |

### Predefined templates (5 tests)

| Test name                                     | Status |
| --------------------------------------------- | ------ |
| VERIFICATION_CODE_EMAIL_TEMPLATE should exist | ✅     |
| VERIFICATION_CODE_SMS_TEMPLATE should exist   | ✅     |
| WELCOME_EMAIL_TEMPLATE should exist           | ✅     |
| PASSWORD_RESET_EMAIL_TEMPLATE should exist    | ✅     |
| NEW_MESSAGE_PUSH_TEMPLATE should exist        | ✅     |

### MemoryTaskStore (11 tests)

| Test name                                | Status |
| ---------------------------------------- | ------ |
| Should add and get task                  | ✅     |
| Should get pending tasks                 | ✅     |
| Should sort by priority                  | ✅     |
| Should return task stats                 | ✅     |
| Should update task                       | ✅     |
| Should delete task                       | ✅     |
| Should get retryable tasks               | ✅     |
| Should cleanup completed tasks           | ✅     |
| Should return null for non-existent task | ✅     |
| Should exclude tasks not yet scheduled   | ✅     |
| Should sort by urgent priority           | ✅     |

### NotificationQueue (7 tests)

| Test name                                             | Status |
| ----------------------------------------------------- | ------ |
| Should add task                                       | ✅     |
| Should cancel task                                    | ✅     |
| Should support delayed send                           | ✅     |
| Should support priority                               | ✅     |
| Should get queue stats                                | ✅     |
| Should cleanup completed tasks                        | ✅     |
| Should return false when cancelling non-existent task | ✅     |

### getAvailableChannels (3 tests)

| Test name                                  | Status |
| ------------------------------------------ | ------ |
| Should return configured channels          | ✅     |
| Should return empty array for empty config | ✅     |
| Should return all channels                 | ✅     |

## Coverage

| Module          | Branch | Line  | Status     |
| --------------- | ------ | ----- | ---------- |
| mod.ts          | 100%   | 100%  | ✅ Done    |
| utils.ts        | 66.7%  | 96.7% | ✅ Done    |
| subscription.ts | 90%    | 81.7% | ✅ Done    |
| template.ts     | 79.5%  | 76.4% | ⚠️ Basic   |
| queue.ts        | 83.3%  | 51%   | ⚠️ Partial |
| webhook.ts      | 100%   | 45.5% | ⚠️ Partial |
| email.ts        | 47.8%  | 34.1% | ⚠️ Partial |
| sms.ts          | 50%    | 29.3% | ⚠️ Partial |
| webpush.ts      | 90.9%  | 16.8% | ⚠️ Partial |

### Coverage notes

- **email.ts / sms.ts / webpush.ts**: Lower line coverage because send logic
  requires real SMTP or API and is not covered in unit tests
- **webhook.ts**: Send logic requires a real HTTP endpoint
- **queue.ts**: Async and retry logic tests were removed due to timer leaks

## Conclusion

- ✅ All 114 tests pass
- ✅ Email validation and payload creation covered
- ✅ Web Push VAPID key and payload creation covered
- ✅ SMS validation and formatting covered
- ✅ Webhook signature creation and verification covered
- ✅ Subscription store covered
- ✅ Template render and management covered
- ✅ Notification queue basics covered
- ⚠️ Actual send paths need integration tests

---

_Report updated: 2026-01-30_
