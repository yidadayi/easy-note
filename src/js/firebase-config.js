/**
 * Firebase 配置文件
 * 包含Firebase初始化所需的配置信息
 */

// Firebase 配置
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDYgQwMxfGQPBqEdTIQnz2BYlkA__mA7jQ",
  authDomain: "easy-note-60097.firebaseapp.com",
  projectId: "easy-note-60097",
  storageBucket: "easy-note-60097.appspot.com",
  messagingSenderId: "43306977967",
  appId: "1:43306977967:web:a9098fc06d7a075584a25a"
};

// 存储键常量
const STORAGE_KEY_USER = 'easy_note_firebase_user';
const STORAGE_KEY_PROVIDER = 'easy_note_storage_provider';

// 导出配置 - 使用全局变量
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.STORAGE_KEY_USER = STORAGE_KEY_USER;
window.STORAGE_KEY_PROVIDER = STORAGE_KEY_PROVIDER; 