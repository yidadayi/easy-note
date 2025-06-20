/**
 * Firebase 服务模块
 * 提供Firebase认证和数据存储功能
 */

/**
 * Firebase服务类
 * 提供认证和数据存储功能
 */
class FirebaseServiceClass {
  constructor() {
    this.auth = null;
    this.db = null;
    this.initialized = false;
    this.currentUser = null;
  }

  /**
   * 初始化Firebase
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // 已初始化，跳过
      if (this.initialized) return;
      
      console.log('[FirebaseService] 初始化Firebase开始');
      
      // 检查Firebase SDK是否正确加载
      if (typeof firebase === 'undefined') {
        console.error('[FirebaseService] Firebase SDK未加载');
        throw new Error('Firebase SDK未正确加载，请检查网络连接并刷新页面');
      }
      
      // 使用window.FIREBASE_CONFIG或firebaseConfig
      const config = window.FIREBASE_CONFIG || window.firebaseConfig;
      if (!config) {
        console.error('[FirebaseService] Firebase配置未找到');
        throw new Error('找不到Firebase配置信息');
      }
      
      console.log('[FirebaseService] 配置信息:', JSON.stringify({
        authDomain: config.authDomain,
        projectId: config.projectId
      }));
      
      try {
        this.app = firebase.initializeApp(config);
      } catch (initError) {
        // 如果已经初始化，尝试获取已有的实例
        if (initError.code === 'app/duplicate-app') {
          console.warn('[FirebaseService] Firebase应用已存在，获取已有实例');
          this.app = firebase.app();
        } else {
          throw initError;
        }
      }
      
      try {
        this.auth = firebase.auth();
        
        // 检查auth对象
        if (!this.auth) {
          throw new Error('Firebase认证服务初始化失败');
        }
      } catch (authError) {
        console.error('[FirebaseService] 认证服务初始化失败:', authError);
        throw new Error('Firebase认证服务初始化失败: ' + authError.message);
      }
      
      try {
        this.db = firebase.firestore();
        
        // 检查db对象
        if (!this.db) {
          throw new Error('Firebase数据库服务初始化失败');
        }
      } catch (dbError) {
        console.error('[FirebaseService] 数据库服务初始化失败:', dbError);
        throw new Error('Firebase数据库服务初始化失败: ' + dbError.message);
      }

      // 增加登录持久性，避免移动端刷新后丢失登录状态
      try {
        await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('[FirebaseService] 已设置登录持久性为LOCAL');
      } catch (persistenceError) {
        console.error('[FirebaseService] 设置登录持久性失败:', persistenceError);
        // 继续执行，不抛出异常
      }

      // 检查是否有待处理的重定向登录
      const redirectPending = localStorage.getItem('auth_redirect_pending') === 'true';
      const redirectTime = parseInt(localStorage.getItem('auth_redirect_time') || '0');
      const currentTime = Date.now();
      const redirectTimeout = 10 * 60 * 1000; // 10分钟超时
      
      // 如果重定向时间超过10分钟，认为重定向失败，清除状态
      if (redirectPending && (currentTime - redirectTime > redirectTimeout)) {
        console.warn('[FirebaseService] 检测到过期的重定向状态，自动清除');
        localStorage.removeItem('auth_redirect_pending');
        localStorage.removeItem('auth_redirect_time');
      } else if (redirectPending) {
        console.log('[FirebaseService] 检测到待处理的重定向登录，尝试获取结果');
        try {
          const result = await this.auth.getRedirectResult();
          console.log('[FirebaseService] 重定向结果:', result ? '已接收' : '未接收');
          
          // 清除重定向状态
          localStorage.removeItem('auth_redirect_pending');
          localStorage.removeItem('auth_redirect_time');
          
          if (result && result.user) {
            console.log('[FirebaseService] 重定向登录成功，用户:', result.user.email);
            this.currentUser = result.user;
            this.saveCurrentUser(result.user);
            
            // 显式强制设置云同步为启用
            localStorage.setItem('easy_note_cloud_sync', 'true');
            console.log('[FirebaseService] 已设置云同步为启用状态');
            
            // 触发登录成功事件
            window.dispatchEvent(new CustomEvent('auth:login', { 
              detail: { user: result.user }
            }));
            
            // 显示成功消息
            setTimeout(() => {
              alert('Google登录成功!');
            }, 1000);
          } else {
            console.log('[FirebaseService] 重定向登录未返回用户，检查当前登录状态');
            // 即使重定向结果中没有用户，仍然检查当前的认证状态
            const currentUser = this.auth.currentUser;
            if (currentUser) {
              console.log('[FirebaseService] 但当前已有登录用户:', currentUser.email);
              this.currentUser = currentUser;
              this.saveCurrentUser(currentUser);
              localStorage.setItem('easy_note_cloud_sync', 'true');
              
              window.dispatchEvent(new CustomEvent('auth:login', { 
                detail: { user: currentUser } 
              }));
            } else {
              console.warn('[FirebaseService] 重定向后没有检测到用户，可能登录失败');
              
              // 检查是否是从内网IP访问
              const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(window.location.hostname);
              if (isLocalIP) {
                console.warn('[FirebaseService] 检测到从内网IP访问，这可能是失败的原因');
                setTimeout(() => {
                  alert('Google登录失败。在内网环境下通过IP地址访问时，Google认证可能不可用。请考虑使用公网域名或localhost。');
                }, 1000);
              }
            }
          }
        } catch (redirectError) {
          console.error('[FirebaseService] 处理重定向结果出错:', redirectError);
          localStorage.removeItem('auth_redirect_pending');
          localStorage.removeItem('auth_redirect_time');
          
          if (redirectError.code === 'auth/network-request-failed') {
            setTimeout(() => {
              alert('Google登录失败: 网络请求失败，请检查您的网络连接');
            }, 1000);
          } else {
            // 显示错误消息
            setTimeout(() => {
              alert('Google登录失败: ' + redirectError.message);
            }, 1000);
          }
        }
      }

      // 监听认证状态变化
      this.auth.onAuthStateChanged((user) => {
        console.log('[FirebaseService] 认证状态变化', user ? '已登录' : '未登录');
        
        if (user) {
          console.log(`[FirebaseService] 用户已登录: ${user.email}`);
          this.currentUser = user;
          
          // 确保云同步设置为启用
          localStorage.setItem('easy_note_cloud_sync', 'true');
          console.log('[FirebaseService] 已将云同步标记设为启用');
          
          // 触发登录事件
          window.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));
          
          // 显示历史笔记链接
          const userHistoryBar = document.getElementById('userHistoryBar');
          if (userHistoryBar) {
            userHistoryBar.classList.remove('d-none');
          } else {
            console.warn('[FirebaseService] 找不到userHistoryBar元素');
          }
        } else {
          console.log('[FirebaseService] 用户未登录');
          this.currentUser = null;
          
          // 触发登出事件
          window.dispatchEvent(new CustomEvent('auth:logout'));
          
          // 隐藏历史笔记链接
          const userHistoryBar = document.getElementById('userHistoryBar');
          if (userHistoryBar) {
            userHistoryBar.classList.add('d-none');
          } else {
            console.warn('[FirebaseService] 找不到userHistoryBar元素');
          }
        }
      });

      this.initialized = true;
      console.log('[FirebaseService] 初始化Firebase完成');
    } catch (error) {
      console.error('[FirebaseService] 初始化失败', error);
      this.initialized = false; // 确保标记为未初始化
      throw error;
    }
  }

  /**
   * 检查云存储是否启用
   * @returns {boolean} 云存储是否启用
   */
  isEnabled() {
    // 检查URL参数是否强制本地模式
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('local') === 'true') {
      console.log('[FirebaseService] 强制本地模式');
      return false;
    }
    
    // 检查本地设置
    const cloudSyncEnabled = localStorage.getItem('easy_note_cloud_sync') === 'true';
    
    // 检查当前登录状态 - 如果已登录但未启用云同步，则自动启用
    const firebaseUser = this.auth?.currentUser;
    if (firebaseUser && !cloudSyncEnabled) {
      console.log('[FirebaseService] 检测到用户已登录但云同步未启用，自动启用云同步');
      localStorage.setItem('easy_note_cloud_sync', 'true');
      return true;
    }
    
    if (!cloudSyncEnabled) {
      console.log('[FirebaseService] 云同步未在本地设置中启用');
      return false;
    }
    
    // 检查用户是否已登录
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.log('[FirebaseService] 用户未登录，云同步停用');
      return false;
    }
    
    // 检查Firebase是否已初始化
    if (!this.initialized || !this.auth || !this.db) {
      console.log('[FirebaseService] Firebase服务未初始化，尝试初始化');
      try {
        this.init();
        if (!this.initialized) {
          console.error('[FirebaseService] Firebase初始化失败，云同步停用');
          return false;
        }
      } catch (error) {
        console.error('[FirebaseService] Firebase初始化错误:', error);
        return false;
      }
    }
    
    // 检查网络连接状态
    if (!navigator.onLine) {
      console.log('[FirebaseService] 设备离线，云同步停用');
      return false;
    }
    
    console.log(`[FirebaseService] 云同步已启用，用户ID: ${currentUser.uid}`);
    return true;
  }

  /**
   * 检查云存储是否启用 (兼容别名)
   * @returns {boolean} 云存储是否启用
   */
  isCloudEnabled() {
    return this.isEnabled();
  }

  /**
   * 获取当前登录用户
   * @returns {Object|null} 用户信息或null
   */
  getCurrentUser() {
    try {
      // 从Firebase获取
      const firebaseUser = this.auth?.currentUser;
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email
        };
        
        // 更新本地存储
        this.saveCurrentUser(userData);
        console.log('[FirebaseService] 使用Firebase当前登录用户', userData.email);
        return userData;
      }
      
      // 从localStorage获取
      const userJson = localStorage.getItem(window.STORAGE_KEY_USER);
      if (userJson) {
        try {
          const storedUser = JSON.parse(userJson);
          console.log('[FirebaseService] 使用本地存储的用户', storedUser.email);
          
          // 验证本地存储的用户是否仍然有效
          if (this.auth?.currentUser && this.auth.currentUser.uid !== storedUser.uid) {
            console.warn('[FirebaseService] 本地存储的用户与当前登录用户不符，清除本地用户');
            this.clearUserData();
            return null;
          }
          
          return storedUser;
        } catch (e) {
          console.error('[FirebaseService] 解析用户数据失败', e);
          this.clearUserData();
        }
      }
      
      return null;
    } catch (error) {
      console.error('[FirebaseService] 获取用户信息失败', error);
      return null;
    }
  }

  /**
   * 保存用户信息到本地
   * @param {Object} user 用户信息
   */
  saveCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(window.STORAGE_KEY_USER);
      return;
    }
    
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    };
    
    localStorage.setItem(window.STORAGE_KEY_USER, JSON.stringify(userData));
  }

  /**
   * 清除用户数据
   */
  clearUserData() {
    localStorage.removeItem(window.STORAGE_KEY_USER);
  }

  /**
   * 用户注册
   * @param {string} email 邮箱
   * @param {string} password 密码
   * @returns {Promise<Object>} 注册结果
   */
  async register(email, password) {
    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      console.log('[FirebaseService] 用户注册成功', result.user);
      this.saveCurrentUser(result.user);
      return {
        success: true,
        user: {
          uid: result.user.uid,
          email: result.user.email
        }
      };
    } catch (error) {
      console.error('[FirebaseService] 注册失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 用户登录
   * @param {string} email 邮箱
   * @param {string} password 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(email, password) {
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      console.log('[FirebaseService] 用户登录成功', result.user);
      this.saveCurrentUser(result.user);
      return {
        success: true,
        user: {
          uid: result.user.uid,
          email: result.user.email
        }
      };
    } catch (error) {
      console.error('[FirebaseService] 登录失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Google账号登录
   * @returns {Promise<Object>} 登录结果
   */
  async loginWithGoogle() {
    try {
      console.log('[FirebaseService] 开始Google登录流程');
      
      // 创建Google提供者
      const provider = new firebase.auth.GoogleAuthProvider();
      
      // 添加附加OAuth范围
      provider.addScope('profile');
      provider.addScope('email');
      
      // 设置自定义参数以改善用户体验
      provider.setCustomParameters({
        'prompt': 'select_account',
        'login_hint': this.currentUser?.email || ''
      });
      
      // 检测是否为移动设备和平台
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent);
      
      console.log(`[FirebaseService] 设备信息: 移动=${isMobile}, Android=${isAndroid}, Chrome=${isChrome}`);
      console.log(`[FirebaseService] 用户代理: ${navigator.userAgent}`);
      console.log(`[FirebaseService] 当前URL: ${window.location.href}`);
      console.log(`[FirebaseService] Firebase配置: authDomain=${window.FIREBASE_CONFIG.authDomain}`);
      
      // 确保Firebase已初始化
      if (!this.initialized || !this.auth) {
        console.log('[FirebaseService] Firebase未初始化，先进行初始化');
        await this.init();
      }
      
      // 检查当前网络状态
      if (!navigator.onLine) {
        console.error('[FirebaseService] 设备当前离线，无法进行Google登录');
        return {
          success: false,
          error: '网络连接不可用，请检查您的网络连接后重试'
        };
      }
      
      // 检查是否为本地IP或域名
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(window.location.hostname);
      const isIPAddress = isLocalIP || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
      
      // 对于Android设备，始终使用弹窗方式登录
      if (isAndroid) {
        console.log('[FirebaseService] 检测到Android设备，使用弹窗方式登录');
        
        try {
          // 确保使用正确的authDomain
          if (window.FIREBASE_CONFIG.authDomain !== window.location.hostname && 
              window.location.hostname !== 'localhost' && 
              window.location.hostname !== '127.0.0.1') {
            console.log('[FirebaseService] 更新authDomain为当前主机名');
            // 临时更新配置中的authDomain为当前主机名
            window.FIREBASE_CONFIG.authDomain = window.location.hostname;
            
            // 重新初始化Firebase以应用新的authDomain
            try {
              await this.auth.app.delete();
              this.app = firebase.initializeApp(window.FIREBASE_CONFIG);
              this.auth = this.app.auth();
              console.log('[FirebaseService] 使用更新后的authDomain重新初始化Firebase');
            } catch (reInitError) {
              console.error('[FirebaseService] 重新初始化Firebase失败:', reInitError);
            }
          }
          
          // 显式使用弹窗方法
          console.log('[FirebaseService] 尝试使用signInWithPopup方法');
          const result = await this.auth.signInWithPopup(provider);
          
          if (result && result.user) {
            console.log('[FirebaseService] Google登录成功，用户：', result.user.email);
            this.saveCurrentUser(result.user);
            
            // 确保云同步启用
            localStorage.setItem('easy_note_cloud_sync', 'true');
            
            return {
              success: true,
              user: {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
              }
            };
          } else {
            console.error('[FirebaseService] Google登录结果无效');
            return {
              success: false,
              error: '登录结果无效'
            };
          }
        } catch (error) {
          console.error('[FirebaseService] Android弹窗登录失败', error);
          
          // 如果弹窗方法失败，尝试使用重定向方法
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            console.log('[FirebaseService] 弹窗被阻止或关闭，尝试使用重定向方法');
            try {
              // 保存当前URL到localStorage，以便登录后返回
              localStorage.setItem('auth_return_url', window.location.href);
              
              // 保存状态，以便重定向回来后恢复
              localStorage.setItem('auth_redirect_pending', 'true');
              localStorage.setItem('auth_redirect_time', Date.now().toString());
              
              // 使用重定向方法登录
              await this.auth.signInWithRedirect(provider);
              
              return { success: true, pending: true };
            } catch (redirectError) {
              console.error('[FirebaseService] 重定向方法也失败了', redirectError);
              return {
                success: false,
                error: `登录失败: ${redirectError.message || '未知错误'}`,
                errorCode: redirectError.code
              };
            }
          }
          
          // 提供更具体的错误信息
          let errorMessage = '登录失败';
          if (error.code === 'auth/popup-blocked') {
            errorMessage = '登录弹窗被浏览器阻止。请允许弹窗后重试，或尝试使用其他浏览器。';
          } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = '登录弹窗被关闭。请完成登录过程。';
          } else if (error.code === 'auth/network-request-failed') {
            errorMessage = '网络请求失败，请检查您的网络连接并重试。';
          } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = '当前域名未被授权使用Firebase认证。请确保已在Firebase控制台添加此域名到授权域列表。';
            console.error(`[FirebaseService] 当前域名 ${window.location.hostname} 未在Firebase授权域名列表中`);
          } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = '登录请求已取消。请重新尝试。';
          } else if (error.code === 'auth/user-disabled') {
            errorMessage = '此用户账号已被禁用。请联系管理员。';
          } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Google登录方式未在Firebase控制台中启用。';
          } else {
            errorMessage = `登录失败: ${error.message || '未知错误'}`;
          }
          
          return {
            success: false,
            error: errorMessage,
            errorCode: error.code
          };
        }
      }
      
      // 其他设备使用原来的逻辑：手机设备使用重定向方式，桌面设备使用弹窗方式
      if (isMobile && !isAndroid) {
        // 在非Android手机设备上使用重定向方法
        console.log('[FirebaseService] 使用重定向方式登录');
        
        // 保存当前URL到localStorage，以便登录后返回
        localStorage.setItem('auth_return_url', window.location.href);
        
        // 保存状态，以便重定向回来后恢复
        localStorage.setItem('auth_redirect_pending', 'true');
        localStorage.setItem('auth_redirect_time', Date.now().toString());
        
        try {
          // 使用重定向方法登录
          console.log('[FirebaseService] 执行重定向登录，即将跳转...');
          
          // 使用更明确的错误处理
          try {
            await this.auth.signInWithRedirect(provider);
            // 注意：这里之后的代码通常不会立即执行，因为页面会重定向
            console.log('[FirebaseService] 重定向API调用成功，但页面未重定向？');
          } catch (redirectError) {
            console.error('[FirebaseService] 重定向方法失败，尝试弹窗方法', redirectError);
            
            // 如果重定向失败，尝试使用弹窗方法
            try {
              const result = await this.auth.signInWithPopup(provider);
              if (result && result.user) {
                console.log('[FirebaseService] 弹窗登录成功，用户：', result.user.email);
                this.saveCurrentUser(result.user);
                localStorage.setItem('easy_note_cloud_sync', 'true');
                return {
                  success: true,
                  user: {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL
                  }
                };
              }
            } catch (popupError) {
              console.error('[FirebaseService] 弹窗方法也失败了', popupError);
              throw new Error(`登录失败: ${redirectError.message} 和 ${popupError.message}`);
            }
          }
        } catch (error) {
          console.error('[FirebaseService] 登录过程中发生错误:', error);
          throw error;
        }
        
        return { success: true, pending: true };
      } else {
        // 在桌面设备上使用弹窗方法
        console.log('[FirebaseService] 使用弹窗方式登录');
        try {
          const result = await this.auth.signInWithPopup(provider);
          
          if (result && result.user) {
            console.log('[FirebaseService] Google登录成功，用户：', result.user.email);
            this.saveCurrentUser(result.user);
            
            // 确保云同步启用
            localStorage.setItem('easy_note_cloud_sync', 'true');
            
            return {
              success: true,
              user: {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
              }
            };
          } else {
            console.error('[FirebaseService] Google登录结果无效');
            return {
              success: false,
              error: '登录结果无效'
            };
          }
        } catch (error) {
          console.error('[FirebaseService] 桌面设备弹窗登录失败', error);
          
          // 提供更具体的错误信息
          let errorMessage = '登录失败';
          if (error.code === 'auth/popup-blocked') {
            errorMessage = '登录弹窗被浏览器阻止。请允许弹窗后重试。';
          } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = '登录弹窗被关闭。请完成登录过程。';
          } else {
            errorMessage = `登录失败: ${error.message || '未知错误'}`;
          }
          
          return {
            success: false,
            error: errorMessage,
            errorCode: error.code
          };
        }
      }
    } catch (error) {
      console.error('[FirebaseService] Google登录失败', error);
      // 记录更详细的错误信息以便诊断
      if (error.code) {
        console.error(`[FirebaseService] 错误代码: ${error.code}`);
      }
      if (error.message) {
        console.error(`[FirebaseService] 错误消息: ${error.message}`);
      }
      
      return {
        success: false,
        error: `登录失败: ${error.message || '未知错误'}`,
        errorCode: error.code
      };
    }
  }

  /**
   * 用户登出
   * @returns {Promise<Object>} 登出结果
   */
  async logout() {
    try {
      await this.auth.signOut();
      this.clearUserData();
      console.log('[FirebaseService] 用户已登出');
      return { success: true };
    } catch (error) {
      console.error('[FirebaseService] 登出失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证连接
   * @returns {Promise<Object>} 验证结果
   */
  async validateConnection() {
    try {
      console.log('[FirebaseService] 验证连接...');
      
      // 检查用户是否已登录
      const user = this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: '用户未登录'
        };
      }

      // 检查网络连接
      if (!navigator.onLine) {
        return {
          success: false,
          error: '设备离线'
        };
      }
      
      // 添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase连接超时')), 5000);
      });
      
      // 尝试读取配置文件而不是写入数据
      // 这样可以避免写入权限问题
      const testPromise = this.db.collection('system').doc('config').get()
        .catch(err => {
          // 如果因为没有这个文档而失败也算成功
          // 因为我们只是测试连接，不是真的需要这个文档
          if (err && err.code === 'not-found') {
            return {exists: false};
          }
          throw err;
        });
      
      // 使用Promise.race进行超时控制
      await Promise.race([testPromise, timeoutPromise]);
      
      console.log('[FirebaseService] 连接验证成功');
      return {
        success: true,
        user: user
      };
    } catch (error) {
      console.error('[FirebaseService] 连接验证失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创建新笔记
   * @param {Object} noteData 笔记数据
   * @returns {Promise<Object>} 创建结果
   */
  async createNote(noteData) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      console.log('[FirebaseService] 创建新笔记', noteData);
      
      // 在Firestore中创建文档
      const notesRef = this.db.collection('users').doc(user.uid).collection('notes');
      const newNoteRef = notesRef.doc(); // 自动生成ID
      
      // 准备数据
      const noteWithMetadata = {
        ...noteData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // 保存到Firestore
      await newNoteRef.set(noteWithMetadata);
      
      console.log('[FirebaseService] 笔记创建成功', newNoteRef.id);
      
      return {
        success: true,
        noteId: newNoteRef.id,
        data: noteWithMetadata
      };
    } catch (error) {
      console.error('[FirebaseService] 创建笔记失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取笔记
   * @param {string} noteId 笔记ID
   * @param {number} [timestamp] 时间戳，用于防止缓存
   * @returns {Promise<Object>} 获取结果
   */
  async getNote(noteId, timestamp = null) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用', code: 'cloud_disabled' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录', code: 'not_logged_in' };
      }
      
      if (!noteId) {
        return { success: false, error: '无效的笔记ID', code: 'invalid_id' };
      }
      
      console.log(`[FirebaseService] 获取笔记: ${noteId}, 用户: ${user.uid}${timestamp ? ', 强制刷新' : ''}`);
      
      try {
        // 添加超时控制
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('获取笔记操作超时')), 8000);
        });
        
        // 创建一个带有缓存控制的查询选项
        const options = {};
        if (timestamp) {
          // 如果提供了时间戳参数，使用服务器数据（强制跳过缓存）
          options.source = 'server';
        }
        
        // 首先尝试从用户自己的笔记集合中获取
        const userNotePath = this.db.collection('users').doc(user.uid).collection('notes').doc(noteId);
        const sharedNotePath = this.db.collection('shared_notes').doc(noteId);
        
        // 并行请求用户笔记和共享笔记，使用缓存控制选项
        const [userNotePromise, sharedNotePromise] = [
          userNotePath.get(options).catch(err => {
            console.warn(`[FirebaseService] 获取用户笔记失败: ${err.message}`);
            return { exists: false };
          }),
          sharedNotePath.get(options).catch(err => {
            console.warn(`[FirebaseService] 获取共享笔记失败: ${err.message}`);
            return { exists: false };
          })
        ];
        
        // 使用Promise.race进行超时控制，但使用Promise.all获取所有结果
        const [userNoteDoc, sharedNoteDoc] = await Promise.race([
          Promise.all([userNotePromise, sharedNotePromise]),
          timeoutPromise
        ]);
        
        let noteDoc = null;
        let isSharedNote = false;
        
        // 优先使用用户自己的笔记
        if (userNoteDoc.exists) {
          noteDoc = userNoteDoc;
          console.log(`[FirebaseService] 找到用户笔记: ${noteId}`);
        } 
        // 如果用户笔记不存在，尝试使用共享笔记
        else if (sharedNoteDoc.exists) {
          noteDoc = sharedNoteDoc;
          isSharedNote = true;
          console.log(`[FirebaseService] 找到共享笔记: ${noteId}`);
        }
        
        // 如果都未找到笔记
        if (!noteDoc || !noteDoc.exists) {
          console.log(`[FirebaseService] 笔记 ${noteId} 未找到(用户笔记和共享笔记都未找到)`);
          return { 
            success: false, 
            error: '笔记未找到', 
            notFound: true,
            code: 'not_found' 
          };
        }
        
        // 获取笔记数据并验证数据结构
        const noteData = noteDoc.data();
        const validatedData = this.validateNoteData(noteData, noteId);
        
        console.log(`[FirebaseService] 成功获取${isSharedNote ? '共享' : ''}笔记 ${noteId}`);
        
        return {
          success: true,
          noteData: validatedData,
          isShared: isSharedNote,
          rawData: noteDoc
        };
      } catch (innerError) {
        console.error(`[FirebaseService] Firestore操作失败: ${innerError.message}`, innerError);
        return {
          success: false,
          error: `Firestore操作失败: ${innerError.message}`,
          code: 'firestore_error',
          originalError: innerError
        };
      }
    } catch (error) {
      console.error(`[FirebaseService] 获取笔记失败: ${noteId}`, error);
      return {
        success: false,
        error: error.message,
        code: 'general_error',
        originalError: error
      };
    }
  }
  
  /**
   * 验证笔记数据结构一致性
   * @param {Object} noteData 笔记数据
   * @param {string} noteId 笔记ID
   * @returns {Object} 经过验证和修复的笔记数据
   */
  validateNoteData(noteData, noteId) {
    // 如果没有数据，返回空对象
    if (!noteData) return { 
      content: '', 
      isEncrypted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const validatedData = {...noteData};
    
    // 确保基本字段存在
    if (typeof validatedData.content === 'undefined') {
      console.warn(`[FirebaseService] 笔记 ${noteId} 缺少content字段，使用空字符串`);
      validatedData.content = '';
    }
    
    if (typeof validatedData.isEncrypted === 'undefined') {
      validatedData.isEncrypted = false;
    }
    
    // 处理时间戳字段
    if (validatedData.createdAt && validatedData.createdAt.toDate) {
      // Firebase Timestamp对象转换为ISO字符串
      validatedData.createdAt = validatedData.createdAt.toDate().toISOString();
    } else if (!validatedData.createdAt) {
      validatedData.createdAt = new Date().toISOString();
    }
    
    if (validatedData.updatedAt && validatedData.updatedAt.toDate) {
      // Firebase Timestamp对象转换为ISO字符串
      validatedData.updatedAt = validatedData.updatedAt.toDate().toISOString();
    } else if (!validatedData.updatedAt) {
      validatedData.updatedAt = new Date().toISOString();
    }
    
    return validatedData;
  }

  /**
   * 更新笔记
   * @param {string} noteId 笔记ID
   * @param {Object} noteData 笔记数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateNote(noteId, noteData) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      if (!noteId) {
        return { success: false, error: '无效的笔记ID' };
      }
      
      console.log(`[FirebaseService] 更新笔记: ${noteId}`, noteData);
      
      // 准备更新数据
      const updateData = {
        ...noteData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // 先检查是否是我们自己的笔记
      const noteRef = this.db.collection('users').doc(user.uid).collection('notes').doc(noteId);
      
      try {
        // 先尝试获取笔记以确定它是否存在
        const doc = await noteRef.get();
        
        if (doc.exists) {
          // 笔记存在，执行更新
          await noteRef.update(updateData);
          console.log(`[FirebaseService] 笔记更新成功: ${noteId}`);
          return {
            success: true,
            noteId: noteId,
            data: updateData
          };
        } else {
          // 笔记不存在，检查是否为共享笔记
          const sharedNoteRef = this.db.collection('shared_notes').doc(noteId);
          const sharedDoc = await sharedNoteRef.get();
          
          if (sharedDoc.exists) {
            // 这是一个共享笔记，将它复制到用户的笔记中
            console.log(`[FirebaseService] 复制共享笔记到用户笔记: ${noteId}`);
            
            // 合并现有数据和更新数据
            const sharedData = sharedDoc.data();
            const createData = {
              ...this.validateNoteData(sharedData, noteId), // 确保数据结构一致
              ...updateData,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              copiedFromShared: true
            };
            
            // 保存到用户的笔记集合
            await noteRef.set(createData);
            console.log(`[FirebaseService] 共享笔记已复制并更新: ${noteId}`);
            
            return {
              success: true,
              noteId: noteId,
              data: createData,
              wasShared: true
            };
          }
          
          // 如果不是共享笔记，则创建新笔记
          console.log(`[FirebaseService] 创建新笔记: ${noteId}`);
          
          const createData = {
            ...noteData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          await noteRef.set(createData);
          
          console.log(`[FirebaseService] 新笔记创建成功: ${noteId}`);
          
          return {
            success: true,
            noteId: noteId,
            data: createData,
            wasCreated: true
          };
        }
      } catch (error) {
        if (error.code === 'permission-denied') {
          console.error(`[FirebaseService] 权限被拒绝，尝试创建新笔记: ${error.message}`);
          
          // 尝试创建新笔记
          try {
            const createData = {
              ...noteData,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await noteRef.set(createData);
            
            console.log(`[FirebaseService] 新笔记创建成功: ${noteId}`);
            
            return {
              success: true,
              noteId: noteId,
              data: createData,
              wasCreated: true
            };
          } catch (createError) {
            console.error(`[FirebaseService] 创建新笔记失败: ${createError.message}`);
            return {
              success: false,
              error: `权限错误，无法更新或创建笔记: ${createError.message}`,
              code: 'permission_denied'
            };
          }
        }
        
        throw error; // 其他错误重新抛出，由外层捕获
      }
    } catch (error) {
      console.error(`[FirebaseService] 更新/创建笔记失败: ${noteId}`, error);
      return {
        success: false,
        error: error.message,
        code: error.code || 'update_error'
      };
    }
  }

  /**
   * 删除笔记
   * @param {string} noteId 笔记ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteNote(noteId) {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      if (!noteId) {
        return { success: false, error: '无效的笔记ID' };
      }
      
      console.log(`[FirebaseService] 删除笔记: ${noteId}`);
      
      // 从Firestore删除文档
      const noteRef = this.db.collection('users').doc(user.uid).collection('notes').doc(noteId);
      await noteRef.delete();
      
      console.log('[FirebaseService] 笔记删除成功', noteId);
      
      return {
        success: true,
        noteId: noteId
      };
    } catch (error) {
      console.error(`[FirebaseService] 删除笔记失败: ${noteId}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户所有笔记
   * @returns {Promise<Object>} 获取结果
   */
  async getAllNotes() {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: '云存储未启用' };
      }
      
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: '用户未登录' };
      }
      
      console.log('[FirebaseService] 获取所有笔记');
      
      // 从Firestore获取所有笔记
      const notesRef = this.db.collection('users').doc(user.uid).collection('notes');
      const snapshot = await notesRef.orderBy('updatedAt', 'desc').get();
      
      const notes = [];
      snapshot.forEach(doc => {
        notes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('[FirebaseService] 获取所有笔记成功', notes.length);
      
      return {
        success: true,
        notes: notes
      };
    } catch (error) {
      console.error('[FirebaseService] 获取所有笔记失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户笔记列表
   * @returns {Promise<{success: boolean, notes: Array, error: string}>} 请求结果
   */
  async getUserNotes() {
    try {
      if (!this.isEnabled()) {
        return { success: false, notes: [], error: '未启用云服务或未登录' };
      }

      // 获取当前用户
      const user = this.auth.currentUser;
      if (!user) {
        return { success: false, notes: [], error: '未登录' };
      }

      // 获取该用户创建的笔记
      const snapshot = await this.db.collection('notes')
        .where('createdBy', '==', user.uid)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();

      const notes = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          title: this.extractNoteTitle(data.content),
          content: data.content,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          isEncrypted: !!data.isEncrypted
        });
      });

      return { success: true, notes };
    } catch (error) {
      console.error('[FirebaseService] 获取用户笔记列表失败', error);
      return { success: false, notes: [], error: error.message };
    }
  }
  
  /**
   * 提取笔记标题（从内容中提取第一行作为标题）
   * @param {string} content 笔记内容
   * @returns {string} 笔记标题
   */
  extractNoteTitle(content) {
    if (!content) return '无标题笔记';
    
    // 获取第一行内容作为标题
    const firstLine = content.split('\n')[0].trim();
    
    // 如果第一行为空，或者只有空格，返回默认标题
    if (!firstLine) return '无标题笔记';
    
    // 截取前30个字符作为标题
    return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
  }

  /**
   * 初始化Firebase (兼容旧方法名)
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      await this.init();
      return true;
    } catch (error) {
      console.error('[FirebaseService] 初始化失败', error);
      return false;
    }
  }
}

// 创建单例实例
const FirebaseService = new FirebaseServiceClass();

// 导出服务 - 使用全局变量
window.FirebaseService = FirebaseService; 