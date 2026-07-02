importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Populated at runtime via /api/v1/notifications/fcm/config
// The service worker reads the config from the client via postMessage
let messaging = null;

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        firebase.initializeApp(event.data.config);
        messaging = firebase.messaging();

        messaging.onBackgroundMessage(payload => {
            const { title, body } = payload.notification || {};
            self.registration.showNotification(title || 'BigBankBonus', {
                body: body || '',
                icon: '/icon-192.png',
                badge: '/icon-72.png',
                data: payload.data || {},
            });
        });
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.link || 'https://bigbankbonus.com/command-center.html';
    event.waitUntil(clients.openWindow(url));
});
