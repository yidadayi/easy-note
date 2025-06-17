/**
 * Firebase配置文件
 * 包含Firebase应用程序的配置信息
 */

// Firebase配置对象
const firebaseConfig = {
    apiKey: "AIzaSyDYgQwMxfGQPBqEdTIQnz2BYlkA__mA7jQ",
    authDomain: "easy-note-60097.firebaseapp.com",
    projectId: "easy-note-60097",
    storageBucket: "easy-note-60097.firebasestorage.app",
    messagingSenderId: "43306977967",
    appId: "1:43306977967:web:a9098fc06d7a075584a25a"
};

// 将配置对象暴露给全局作用域
window.FIREBASE_CONFIG = firebaseConfig;

// 定义存储键名常量
window.STORAGE_KEY_USER = 'easy_note_user';
window.STORAGE_KEY_CLOUD_SYNC = 'easy_note_cloud_sync'; 