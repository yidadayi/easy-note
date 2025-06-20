/**
 * 认证UI模块
 * 处理登录、注册和用户界面交互
 */

/**
 * 认证UI类
 * 管理登录、注册和用户界面
 */
class AuthUIClass {
  constructor() {
    this.initialized = false;
    this.authModal = null;
    this.googleLoginBtn = null;
    this.logoutBtn = null;
    this.currentUser = null;
  }

  /**
   * 初始化认证UI
   */
  initialize() {
    if (this.initialized) return;

    console.log('[AuthUI] 初始化认证UI');
    
    try {
      // 获取DOM元素
      const firebaseAuthModalElement = document.getElementById('firebaseAuthModal');
      if (!firebaseAuthModalElement) {
        console.error('[AuthUI] 找不到firebaseAuthModal元素');
        alert('错误: 找不到登录模态框元素');
        return;
      }
      
      try {
        this.authModal = new bootstrap.Modal(firebaseAuthModalElement);
        console.log('[AuthUI] 模态框初始化成功');
      } catch (error) {
        console.error('[AuthUI] 模态框初始化失败:', error);
        alert('错误: 模态框初始化失败: ' + error.message);
        return;
      }
      
      // 获取登录和登出按钮
      this.googleLoginBtn = document.getElementById('googleLoginBtn');
      this.logoutBtn = document.getElementById('logoutBtn');
      
      if (!this.googleLoginBtn) console.error('[AuthUI] 找不到googleLoginBtn元素');
      if (!this.logoutBtn) console.error('[AuthUI] 找不到logoutBtn元素');
      
      // 设置事件监听器
      this.setupEventListeners();
      
      // 检查用户登录状态
      this.checkUserStatus();
      
      this.initialized = true;
      console.log('[AuthUI] 认证UI初始化完成');
    } catch (error) {
      console.error('[AuthUI] 初始化过程中发生错误:', error);
      alert('初始化认证UI失败: ' + error.message);
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // Google登录按钮点击
    if (this.googleLoginBtn) {
      this.googleLoginBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.handleGoogleLogin();
      });
    }
    
    // 登出按钮点击
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.handleLogout();
      });
    }
    
    // 同步状态点击
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
      console.log('[AuthUI] 添加syncStatus点击事件');
      syncStatus.addEventListener('click', () => {
        console.log('[AuthUI] syncStatus被点击');
        try {
          this.showAuthModal();
        } catch (error) {
          console.error('[AuthUI] 显示认证模态框失败:', error);
          alert('显示登录窗口失败: ' + error.message);
          
          // 尝试直接打开模态框
          if (this.authModal) {
            try {
              this.authModal.show();
            } catch (modalError) {
              console.error('[AuthUI] 直接显示模态框失败:', modalError);
            }
          }
        }
      });
    } else {
      console.error('[AuthUI] 找不到syncStatus元素');
    }
  }

  /**
   * 检查用户登录状态
   */
  checkUserStatus() {
    // 初始化Firebase服务
    if (!window.FirebaseService.initialized) {
      try {
        window.FirebaseService.init();
      } catch (error) {
        console.error('[AuthUI] Firebase初始化失败', error);
        this.showError('Firebase服务初始化失败，请刷新页面重试');
        return;
      }
    }
    
    // 检测是否为Android设备
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // 获取当前用户
    this.currentUser = window.FirebaseService.getCurrentUser();
    
    // 如果有重定向登录处理中，设置一个标志，等待处理完成
    if (localStorage.getItem('auth_redirect_pending') === 'true') {
      console.log('[AuthUI] 检测到重定向登录处理中，等待完成...');
      
      // 针对Android设备使用更长的等待时间和多次检查
      if (isAndroid) {
        console.log('[AuthUI] Android设备，使用多次检查策略');
        this.checkAndroidRedirectResult();
      } else {
        // 其他设备使用简单延迟
        setTimeout(() => {
          console.log('[AuthUI] 重定向处理完成后检查用户状态');
          this.currentUser = window.FirebaseService.getCurrentUser();
          this.updateAuthUI();
        }, 3000);
      }
    } else {
      // 更新UI
      this.updateAuthUI();
    }
  }
  
  /**
   * 针对Android设备的多次检查策略
   * 在一段时间内多次检查登录状态
   */
  checkAndroidRedirectResult() {
    // 执行多次检查，间隔1秒
    let attempts = 0;
    const maxAttempts = 5;
    
    const checkStatus = () => {
      attempts++;
      console.log(`[AuthUI] Android重定向检查 (${attempts}/${maxAttempts})`);
      
      // 获取最新用户状态
      this.currentUser = window.FirebaseService.getCurrentUser();
      
      // 如果已经找到用户或者已经尝试足够次数，更新UI
      if (this.currentUser || attempts >= maxAttempts) {
        console.log('[AuthUI] Android重定向检查完成', this.currentUser ? '已找到用户' : '未找到用户');
        
        // 如果找到了用户，确保启用云同步
        if (this.currentUser) {
          localStorage.setItem('easy_note_cloud_sync', 'true');
        }
        
        this.updateAuthUI();
        
        // 如果仍然没有用户但Firebase可能有，尝试最后的检查
        if (!this.currentUser && window.FirebaseService.auth?.currentUser) {
          console.log('[AuthUI] 发现Firebase有用户但本地检测不到，强制刷新状态');
          this.currentUser = {
            uid: window.FirebaseService.auth.currentUser.uid,
            email: window.FirebaseService.auth.currentUser.email,
            displayName: window.FirebaseService.auth.currentUser.displayName
          };
          localStorage.setItem('easy_note_cloud_sync', 'true');
          this.updateAuthUI();
        }
        
        return;
      }
      
      // 继续检查
      setTimeout(checkStatus, 1000);
    };
    
    // 开始检查
    setTimeout(checkStatus, 1000);
  }

  /**
   * 更新认证UI
   */
  updateAuthUI() {
    const syncStatus = document.getElementById('syncStatus');
    const loginStatus = document.getElementById('loginStatus');
    const loginButtonContainer = document.getElementById('loginButtonContainer');
    const logoutButtonContainer = document.getElementById('logoutButtonContainer');
    const userAvatar = document.getElementById('userAvatar');
    const userInfo = document.getElementById('userInfo');
    const userDisplayName = document.getElementById('userDisplayName');
    const userEmail = document.getElementById('userEmail');
    const userAvatarImg = document.getElementById('userAvatarImg');
    
    if (this.currentUser) {
      // 用户已登录
      if (syncStatus) {
        syncStatus.innerHTML = `<i class="bi bi-cloud-check"></i> ${this.currentUser.email || '已同步'}`;
        syncStatus.classList.remove('text-warning');
        syncStatus.classList.add('text-success');
        syncStatus.title = '已启用云同步';
      }
      
      // 更新登录状态
      if (loginStatus) {
        loginStatus.textContent = '已登录';
      }
      
      // 显示用户信息
      if (userInfo) {
        userInfo.classList.remove('d-none');
        if (userDisplayName) {
          userDisplayName.textContent = this.currentUser.displayName || '用户';
        }
        if (userEmail) {
          userEmail.textContent = this.currentUser.email || '';
        }
      }
      
      // 显示用户头像
      if (userAvatar && this.currentUser.photoURL) {
        userAvatar.classList.remove('d-none');
        if (userAvatarImg) {
          userAvatarImg.src = this.currentUser.photoURL;
        }
      }
      
      // 显示登出按钮，隐藏登录按钮
      if (loginButtonContainer) {
        loginButtonContainer.classList.add('d-none');
      }
      if (logoutButtonContainer) {
        logoutButtonContainer.classList.remove('d-none');
      }
      
      // 启用云同步
      localStorage.setItem('easy_note_cloud_sync', 'true');
      
      console.log('[AuthUI] 用户已登录，已更新UI为已同步状态');
      
      // 显示历史笔记链接
      const userHistoryBar = document.getElementById('userHistoryBar');
      if (userHistoryBar) {
        userHistoryBar.classList.remove('d-none');
      }
    } else {
      // 用户未登录
      if (syncStatus) {
        syncStatus.innerHTML = '<i class="bi bi-cloud-slash"></i> 本地模式';
        syncStatus.classList.remove('text-success');
        syncStatus.classList.add('text-warning');
        syncStatus.title = '点击设置云存储';
      }
      
      // 更新登录状态
      if (loginStatus) {
        loginStatus.textContent = '未登录';
      }
      
      // 隐藏用户信息
      if (userInfo) {
        userInfo.classList.add('d-none');
      }
      
      // 隐藏用户头像
      if (userAvatar) {
        userAvatar.classList.add('d-none');
      }
      
      // 显示登录按钮，隐藏登出按钮
      if (loginButtonContainer) {
        loginButtonContainer.classList.remove('d-none');
      }
      if (logoutButtonContainer) {
        logoutButtonContainer.classList.add('d-none');
      }
      
      // 禁用云同步
      localStorage.setItem('easy_note_cloud_sync', 'false');
      
      console.log('[AuthUI] 用户未登录，已更新UI为本地模式');
      
      // 隐藏历史笔记链接
      const userHistoryBar = document.getElementById('userHistoryBar');
      if (userHistoryBar) {
        userHistoryBar.classList.add('d-none');
      }
    }
    
    // 更新网络状态
    const networkStatus = document.getElementById('networkStatus');
    if (networkStatus) {
      const isOnline = navigator.onLine;
      networkStatus.textContent = isOnline ? '在线' : '离线';
      networkStatus.className = isOnline ? 'text-success' : 'text-danger';
    }
  }

  /**
   * 打开登录模态框
   */
  showAuthModal() {
    if (!this.authModal) {
      console.error('[AuthUI] 模态框未初始化');
      return;
    }
    
    // 显示模态框前更新UI
    this.updateAuthUI();
    
    // 检查是否为内网环境下的Android设备
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(window.location.hostname);
    const isIPAddress = isLocalIP || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
    
    // 显示Android设备在IP地址上的警告
    const androidLoginOptions = document.getElementById('androidLoginOptions');
    if (androidLoginOptions) {
      if (isAndroid && isChrome && isIPAddress && !isLocalhost) {
        androidLoginOptions.classList.remove('d-none');
      } else {
        androidLoginOptions.classList.add('d-none');
      }
    }
    
    this.authModal.show();
    console.log('[AuthUI] 显示登录模态框');
  }

  /**
   * 处理Google登录
   */
  async handleGoogleLogin() {
    try {
      console.log('[AuthUI] 尝试Google登录');
      
      // 检查设备类型
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent);
      console.log(`[AuthUI] 设备类型: 移动=${isMobile}, Android=${isAndroid}, Chrome=${isChrome}`);
      
      // 检查Firebase服务状态
      if (!window.FirebaseService || !window.FirebaseService.initialized) {
        console.log('[AuthUI] Firebase服务未初始化，尝试初始化');
        try {
          await window.FirebaseService.init();
        } catch (initError) {
          console.error('[AuthUI] Firebase初始化失败', initError);
          this.showError('Firebase服务初始化失败，无法登录: ' + initError.message);
          return;
        }
      }
      
      // 检查网络状态
      if (!navigator.onLine) {
        console.error('[AuthUI] 设备离线，无法进行Google登录');
        this.showError('您的设备当前处于离线状态，请连接网络后重试');
        return;
      }
      
      // 检查本地运行环境
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(window.location.hostname);
      const isIPAddress = isLocalIP || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
      
      // 提前检查Android Chrome在IP地址上的限制
      if (isAndroid && isChrome && isIPAddress && !isLocalhost) {
        console.warn('[AuthUI] Android Chrome在IP地址上不支持Google登录，显示警告并建议替代方案');
        this.showError('Android Chrome不支持在IP地址上进行Google登录。请尝试使用localhost访问或使用桌面浏览器。');
        
        // 显示替代登录选项
        const androidLoginOptions = document.getElementById('androidLoginOptions');
        if (androidLoginOptions) {
          androidLoginOptions.classList.remove('d-none');
        }
        
        // 不继续执行Google登录流程
        return;
      }
      
      // 禁用按钮
      if (this.googleLoginBtn) {
        this.googleLoginBtn.disabled = true;
        this.googleLoginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 登录中...';
      }
      
      // 在Android设备上显示特殊说明
      if (isAndroid && isChrome) {
        // 通知用户可能会跳转到Google登录页面
        this.showToast('即将跳转到Google登录页面，登录成功后会自动返回。如果长时间未返回，请手动返回此页面。', 5000);
      }
      
      // 清除之前可能存在的登录状态
      localStorage.removeItem('auth_redirect_pending');
      localStorage.removeItem('auth_redirect_time');
      
      // 调用Google登录API
      console.log('[AuthUI] 调用Firebase服务的Google登录方法');
      const result = await window.FirebaseService.loginWithGoogle();
      
      if (result.success) {
        if (result.pending) {
          // 在移动设备上，这里不会立即执行，因为页面会重定向
          console.log('[AuthUI] Google登录重定向中，等待重定向完成');
          
          // 对于Android设备，检查是否实际上未发生重定向
          if (isAndroid) {
            // 如果代码执行到这里，可能意味着重定向没有发生
            console.warn('[AuthUI] 检测到Android设备上重定向可能未发生');
            
            // 给用户一些反馈
            setTimeout(() => {
              const redirectPending = localStorage.getItem('auth_redirect_pending') === 'true';
              if (redirectPending) {
                console.warn('[AuthUI] 重定向标志仍然存在，但未离开页面，可能是重定向失败');
                this.showError('Google登录失败：重定向未能完成。请检查您的网络连接或浏览器设置。');
                
                if (this.googleLoginBtn) {
                  this.googleLoginBtn.disabled = false;
                  this.googleLoginBtn.innerHTML = '<i class="bi bi-google"></i> 使用 Google 账户登录';
                }
                
                // 清除失败的重定向状态
                localStorage.removeItem('auth_redirect_pending');
                localStorage.removeItem('auth_redirect_time');
              }
            }, 5000);
          }
        } else {
          // 桌面设备上的弹窗登录
          console.log('[AuthUI] Google登录成功');
          this.currentUser = result.user;
          this.authModal.hide();
          this.updateAuthUI();
          this.showSuccess('Google登录成功');
          
          // 触发登录成功事件
          window.dispatchEvent(new CustomEvent('auth:login', { detail: result.user }));
        }
      } else {
        console.error('[AuthUI] Google登录失败', result.error);
        
        // 处理特定错误代码
        if (result.errorCode === 'android_ip_restriction') {
          console.warn('[AuthUI] Android Chrome设备在IP地址上不支持Google登录');
          
          // 显示替代登录选项
          const androidLoginOptions = document.getElementById('androidLoginOptions');
          if (androidLoginOptions) {
            androidLoginOptions.classList.remove('d-none');
          }
          
          this.showError(result.error);
        } else {
          this.showError('Google登录失败: ' + result.error);
        }
        
        // 如果是授权域问题，提供更具体的指导
        if (result.error.includes('unauthorized-domain')) {
          this.showError('当前网址未被Firebase授权，请在Firebase控制台中添加此域名到授权域列表中。');
          console.error(`[AuthUI] 当前域名 ${window.location.hostname} 未在Firebase授权域名列表中`);
        }
      }
    } catch (error) {
      console.error('[AuthUI] Google登录过程中发生错误', error);
      this.showError('Google登录过程中发生错误: ' + error.message);
      
      // 检查特定错误类型
      if (error.code === 'auth/popup-blocked') {
        this.showError('登录弹窗被浏览器阻止，请允许弹窗后重试');
      } else if (error.code === 'auth/popup-closed-by-user') {
        this.showError('登录弹窗被关闭');
      } else if (error.code === 'auth/cancelled-popup-request') {
        this.showError('登录请求已取消');
      } else if (error.code === 'auth/network-request-failed') {
        this.showError('网络请求失败，请检查您的网络连接');
      } else if (error.code === 'auth/unauthorized-domain') {
        this.showError('当前域名未被授权使用Firebase认证');
      }
    } finally {
      // 启用按钮
      if (this.googleLoginBtn) {
        this.googleLoginBtn.disabled = false;
        this.googleLoginBtn.innerHTML = '<i class="bi bi-google"></i> 使用 Google 账户登录';
      }
    }
  }

  /**
   * 处理用户登出
   */
  async handleLogout() {
    try {
      console.log('[AuthUI] 尝试登出');
      
      // 禁用登出按钮
      if (this.logoutBtn) {
        this.logoutBtn.disabled = true;
        this.logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 退出中...';
      }
      
      const result = await window.FirebaseService.logout();
      
      if (result.success) {
        console.log('[AuthUI] 登出成功');
        this.currentUser = null;
        this.updateAuthUI();
        this.showSuccess('已成功登出');
        
        // 关闭模态框
        this.authModal.hide();
        
        // 触发登出成功事件
        window.dispatchEvent(new CustomEvent('auth:logout'));
      } else {
        console.error('[AuthUI] 登出失败', result.error);
        this.showError('登出失败: ' + result.error);
      }
    } catch (error) {
      console.error('[AuthUI] 登出过程中发生错误', error);
      this.showError('登出过程中发生错误: ' + error.message);
    } finally {
      // 启用登出按钮
      if (this.logoutBtn) {
        this.logoutBtn.disabled = false;
        this.logoutBtn.innerHTML = '<i class="bi bi-box-arrow-right"></i> 退出登录';
      }
    }
  }

  /**
   * 显示错误消息
   * @param {string} message 错误消息
   */
  showError(message) {
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    
    // 先尝试设置全局错误提示
    if (errorMessage && errorToast) {
      errorMessage.textContent = message;
      const toast = new bootstrap.Toast(errorToast);
      toast.show();
    }
    
    // 同时更新认证模块的错误信息
    const authErrorMessage = document.getElementById('authErrorMessage');
    if (authErrorMessage) {
      authErrorMessage.textContent = message;
      authErrorMessage.classList.remove('d-none');
      
      // 5秒后自动隐藏
      setTimeout(() => {
        authErrorMessage.classList.add('d-none');
      }, 5000);
    } else {
      console.error('[AuthUI] authErrorMessage元素不存在');
    }
  }

  /**
   * 显示成功消息
   * @param {string} message 成功消息
   */
  showSuccess(message) {
    this.showToast(message);
  }
  
  /**
   * 显示提示消息
   * @param {string} message 消息内容
   * @param {number} duration 显示时长(毫秒)
   */
  showToast(message, duration = 3000) {
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    
    const toastEl = document.createElement('div');
    toastEl.className = 'toast show';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.innerText = message;
    
    toastEl.appendChild(toastBody);
    toastContainer.appendChild(toastEl);
    document.body.appendChild(toastContainer);
    
    setTimeout(() => {
      toastContainer.remove();
    }, duration);
  }
}

// 创建全局实例
window.AuthUI = new AuthUIClass(); 