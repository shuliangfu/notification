/**
 * @fileoverview Web Push 通知示例
 *
 * 展示 Web Push 通知的发送和订阅管理
 */

import {
  generateVapidKeys,
  type PushSubscription,
  WebPushSender,
} from "../src/mod.ts";

// ============================================================================
// 生成 VAPID 密钥
// ============================================================================

console.log("=== 生成 VAPID 密钥 ===\n");

const vapidKeys = await generateVapidKeys();

console.log("VAPID 密钥对:");
console.log("Public Key:", vapidKeys.publicKey);
console.log("Private Key:", vapidKeys.privateKey);

// ============================================================================
// 创建 Web Push 发送器
// ============================================================================

console.log("\n=== 创建 Web Push 发送器 ===\n");

const _sender = new WebPushSender({
  publicKey: vapidKeys.publicKey,
  privateKey: vapidKeys.privateKey,
  contact: "mailto:admin@example.com",
});

console.log("Web Push 发送器创建成功");

// ============================================================================
// 模拟订阅数据
// ============================================================================

console.log("\n=== 订阅数据结构 ===\n");

// 浏览器端获取的订阅数据格式
const subscription: PushSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/xxx",
  keys: {
    p256dh:
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

console.log("订阅数据:");
console.log(JSON.stringify(subscription, null, 2));

// ============================================================================
// 发送推送通知
// ============================================================================

console.log("\n=== 发送推送通知（示例代码）===\n");

console.log(`
// 发送简单通知
const result = await sender.send(subscription, {
  title: "新消息",
  body: "您有一条新消息",
  icon: "/icons/notification.png",
  badge: "/icons/badge.png",
});

if (result.success) {
  console.log("推送成功:", result.id);
} else {
  console.error("推送失败:", result.error);
}
`);

// ============================================================================
// 丰富的通知选项
// ============================================================================

console.log("=== 丰富的通知选项（示例代码）===\n");

console.log(`
// 带操作按钮的通知
const result = await sender.send(subscription, {
  title: "新订单",
  body: "您有一个新订单需要处理",
  icon: "/icons/order.png",
  image: "/images/product.jpg",
  badge: "/icons/badge.png",
  tag: "order-notification",
  data: {
    orderId: "ORD-001",
    url: "/orders/ORD-001",
  },
  actions: [
    {
      action: "view",
      title: "查看",
      icon: "/icons/view.png",
    },
    {
      action: "dismiss",
      title: "忽略",
      icon: "/icons/dismiss.png",
    },
  ],
  requireInteraction: true, // 需要用户交互才消失
  vibrate: [200, 100, 200], // 震动模式
});
`);

// ============================================================================
// 批量推送
// ============================================================================

console.log("=== 批量推送（示例代码）===\n");

console.log(`
// 批量推送给多个订阅者
const subscriptions: PushSubscription[] = [
  // 用户订阅列表...
];

const results = await sender.sendBatch(
  subscriptions,
  {
    title: "系统公告",
    body: "系统将于今晚 22:00 进行维护",
  }
);

console.log(\`成功: \${results.filter(r => r.success).length}\`);
console.log(\`失败: \${results.filter(r => !r.success).length}\`);
`);

// ============================================================================
// 前端订阅代码
// ============================================================================

console.log("=== 前端订阅代码 ===\n");

console.log(`
// 浏览器端代码

// 1. 注册 Service Worker
const registration = await navigator.serviceWorker.register('/sw.js');

// 2. 请求通知权限
const permission = await Notification.requestPermission();
if (permission !== 'granted') {
  console.error('通知权限被拒绝');
  return;
}

// 3. 订阅推送
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
});

// 4. 发送订阅到服务器
await fetch('/api/push/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(subscription),
});

// Base64 转换函数
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, c => c.charCodeAt(0));
}
`);

// ============================================================================
// Service Worker 处理
// ============================================================================

console.log("=== Service Worker 代码 ===\n");

console.log(`
// sw.js - Service Worker

// 接收推送事件
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body: data.body,
    icon: data.icon || '/icons/default.png',
    badge: data.badge,
    image: data.image,
    tag: data.tag,
    data: data.data,
    actions: data.actions,
    requireInteraction: data.requireInteraction,
    vibrate: data.vibrate,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'view' || !action) {
    // 打开相关页面
    event.waitUntil(
      clients.openWindow(data?.url || '/')
    );
  }
});
`);

// ============================================================================
// 订阅管理
// ============================================================================

console.log("=== 订阅管理（示例代码）===\n");

console.log(`
// 取消订阅
const subscription = await registration.pushManager.getSubscription();
if (subscription) {
  await subscription.unsubscribe();
  
  // 通知服务器
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
}

// 检查订阅状态
const currentSub = await registration.pushManager.getSubscription();
console.log('当前订阅状态:', currentSub ? '已订阅' : '未订阅');
`);
