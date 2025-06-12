// Firebase 云存储模块 - 替代 GitHub Gist 的更可靠解决方案
// 该模块完全独立，不依赖于app.js中的任何变量

// Firebase 配置
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 存储键
const STORAGE_KEY_USER = 'easy_note_firebase_user';

// 导出的云存储模块
const FirebaseStorage = {
  // 初始化 Firebase
  initialize: function() {
    try {
      // 检查 Firebase 是否已加载
      if (!window.firebase) {
        console.error('[FirebaseStorage] Firebase SDK 未加载');
        return false;
      }
      
      // 初始化 Firebase
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      
      console.log('[FirebaseStorage] Firebase 初始化成功');
      return true;
    } catch (error) {
      console.error('[FirebaseStorage] 初始化失败', error);
      return false;
    }
  },
  
  // 检查是否启用云存储
  isEnabled: function() {
    // 检查URL是否强制本地模式
    const urlParams = new URLSearchParams(window.location.search);
    const localParam = urlParams.get('local');
    if (localParam === 'true') {
      console.log('[FirebaseStorage] 强制本地模式');
      return false;
    }
    
    // 检查本地设置
    const cloudSyncEnabled = localStorage.getItem('easy_note_cloud_sync') === 'true';
    if (!cloudSyncEnabled) {
      console.log('[FirebaseStorage] 云同步未启用');
      return false;
    }
    
    // 检查用户是否已登录
    if (!this.getCurrentUser()) {
      console.log('[FirebaseStorage] 用户未登录');
      return false;
    }
    
    return true;
  },
  
  // 获取当前用户
  getCurrentUser: function() {
    // 先从 localStorage 获取
    const userJson = localStorage.getItem(STORAGE_KEY_USER);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (e) {
        console.error('[FirebaseStorage] 解析用户数据失败', e);
      }
    }
    
    // 如果 localStorage 没有，检查 Firebase Auth
    const user = this.auth?.currentUser;
    if (user) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
      return userData;
    }
    
    return null;
  },
  
  // 保存当前用户信息
  saveCurrentUser: function(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY_USER);
      return;
    }
    
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    };
    
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
  },
  
  // 清除用户信息
  clearUserData: function() {
    localStorage.removeItem(STORAGE_KEY_USER);
  },
  
  // 用邮箱密码注册
  register: async function(email, password) {
    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      console.log('[FirebaseStorage] 用户注册成功', result.user);
      this.saveCurrentUser(result.user);
      return {
        success: true,
        user: {
          uid: result.user.uid,
          email: result.user.email
        }
      };
    } catch (error) {
      console.error('[FirebaseStorage] 注册失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 用邮箱密码登录
  login: async function(email, password) {
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      console.log('[FirebaseStorage] 用户登录成功', result.user);
      this.saveCurrentUser(result.user);
      return {
        success: true,
        user: {
          uid: result.user.uid,
          email: result.user.email
        }
      };
    } catch (error) {
      console.error('[FirebaseStorage] 登录失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Google 登录
  loginWithGoogle: async function() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.auth.signInWithPopup(provider);
      console.log('[FirebaseStorage] Google 登录成功', result.user);
      this.saveCurrentUser(result.user);
      return {
        success: true,
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName
        }
      };
    } catch (error) {
      console.error('[FirebaseStorage] Google 登录失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 登出
  logout: async function() {
    try {
      await this.auth.signOut();
      this.clearUserData();
      console.log('[FirebaseStorage] 用户已登出');
      return { success: true };
    } catch (error) {
      console.error('[FirebaseStorage] 登出失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 验证连接
  validateConnection: async function() {
    try {
      console.log('[FirebaseStorage] 验证连接...');
      
      // 检查用户是否已登录
      const user = this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: '用户未登录'
        };
      }
      
      // 验证 Firestore 连接
      const testRef = this.db.collection('connection_test').doc(user.uid);
      await testRef.set({
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        success: true,
        user: user
      };
    } catch (error) {
      console.error('[FirebaseStorage] 连接验证失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 创建新笔记
  createNote: async function(noteData) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      console.log('[FirebaseStorage] 创建新笔记', noteData);
      
      // 在 Firestore 中创建文档
      const notesRef = this.db.collection('users').doc(user.uid).collection('notes');
      const newNoteRef = notesRef.doc(); // 自动生成 ID
      
      // 准备数据
      const noteWithMetadata = {
        ...noteData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // 保存到 Firestore
      await newNoteRef.set(noteWithMetadata);
      
      console.log('[FirebaseStorage] 笔记创建成功', newNoteRef.id);
      
      return {
        success: true,
        noteId: newNoteRef.id,
        data: noteWithMetadata
      };
    } catch (error) {
      console.error('[FirebaseStorage] 创建笔记失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 获取笔记
  getNote: async function(noteId) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      if (!noteId) {
        return { success: false, error: '无效的笔记 ID' };
      }
      
      console.log(`[FirebaseStorage] 获取笔记: ${noteId}`);
      
      // 从 Firestore 获取文档
      const noteRef = this.db.collection('users').doc(user.uid).collection('notes').doc(noteId);
      const doc = await noteRef.get();
      
      if (!doc.exists) {
        return { success: false, error: '笔记未找到', notFound: true };
      }
      
      const noteData = doc.data();
      
      return {
        success: true,
        noteData: noteData,
        rawData: doc
      };
    } catch (error) {
      console.error(`[FirebaseStorage] 获取笔记失败: ${noteId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 更新笔记
  updateNote: async function(noteId, noteData) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      if (!noteId) {
        return { success: false, error: '无效的笔记 ID' };
      }
      
      console.log(`[FirebaseStorage] 更新笔记: ${noteId}`, noteData);
      
      // 准备更新数据
      const updateData = {
        ...noteData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // 更新 Firestore 文档
      const noteRef = this.db.collection('users').doc(user.uid).collection('notes').doc(noteId);
      await noteRef.update(updateData);
      
      console.log('[FirebaseStorage] 笔记更新成功', noteId);
      
      return {
        success: true,
        noteId: noteId,
        data: updateData
      };
    } catch (error) {
      // 如果文档不存在，尝试创建
      if (error.code === 'not-found') {
        console.log(`[FirebaseStorage] 笔记不存在，创建新笔记`);
        return await this.createNote(noteData);
      }
      
      console.error(`[FirebaseStorage] 更新笔记失败: ${noteId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 保存笔记 (自动创建或更新)
  saveNote: async function(noteId, noteData) {
    if (noteId) {
      return await this.updateNote(noteId, noteData);
    } else {
      return await this.createNote(noteData);
    }
  },
  
  // 列出用户的所有笔记
  listNotes: async function() {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      console.log('[FirebaseStorage] 列出用户笔记');
      
      // 查询用户的所有笔记
      const notesRef = this.db.collection('users').doc(user.uid).collection('notes');
      const snapshot = await notesRef.orderBy('updatedAt', 'desc').get();
      
      const notes = [];
      snapshot.forEach(doc => {
        notes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        notes: notes
      };
    } catch (error) {
      console.error('[FirebaseStorage] 列出笔记失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 删除笔记
  deleteNote: async function(noteId) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      if (!noteId) {
        return { success: false, error: '无效的笔记 ID' };
      }
      
      console.log(`[FirebaseStorage] 删除笔记: ${noteId}`);
      
      // 删除 Firestore 文档
      const noteRef = this.db.collection('users').doc(user.uid).collection('notes').doc(noteId);
      await noteRef.delete();
      
      console.log('[FirebaseStorage] 笔记删除成功', noteId);
      
      return {
        success: true,
        noteId: noteId
      };
    } catch (error) {
      console.error(`[FirebaseStorage] 删除笔记失败: ${noteId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// 导出模块
window.FirebaseStorage = FirebaseStorage; 