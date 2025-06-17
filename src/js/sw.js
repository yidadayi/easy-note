/**
 * Service Worker for Easy Note
 * 提供离线访问功能
 */

// 缓存名称和版本
const CACHE_NAME = 'easy-note-cache-v1';

// 需要缓存的资源列表
const CACHE_URLS = [
  '/',
  '/index.html',
  '/src/css/styles.css',
  '/src/js/app.js',
  '/src/js/firebase-config.js',
  '/src/js/firebase-service.js',
  '/src/js/auth-ui.js',
  '/src/js/note-service.js',
  '/src/js/ui-controller.js',
  '/src/assets/offline.html',
  '/src/assets/favicon.ico',
  '/src/assets/icons/icon-192.png',
  '/src/assets/icons/icon-512.png',
  '/src/assets/manifest.json'
];

// 安装事件 - 预缓存资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存资源');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] 安装完成');
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] 激活完成');
      return self.clients.claim();
    })
  );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果在缓存中找到匹配的响应，则返回
        if (response) {
          return response;
        }
        
        // 否则尝试从网络获取
        return fetch(event.request)
          .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应（因为响应流只能使用一次）
            const responseToCache = response.clone();
            
            // 将新获取的资源添加到缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // 如果网络请求失败，返回离线页面
            if (event.request.mode === 'navigate') {
              return caches.match('/src/assets/offline.html');
            }
          });
      })
  );
}); 