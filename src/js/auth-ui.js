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
    this.loginForm = null;
    this.registerForm = null;
    this.googleLoginBtn = null;
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
      
      this.loginForm = document.getElementById('loginForm');
      this.registerForm = document.getElementById('registerForm');
      this.googleLoginBtn = document.getElementById('googleLoginBtn');
      
      if (!this.loginForm) console.error('[AuthUI] 找不到loginForm元素');
      if (!this.registerForm) console.error('[AuthUI] 找不到registerForm元素');
      if (!this.googleLoginBtn) console.error('[AuthUI] 找不到googleLoginBtn元素');
      
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
    // 登录表单提交
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleEmailLogin();
      });
    }
    
    // 注册表单提交
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleRegistration();
      });
    }
    
    // Google登录按钮点击
    if (this.googleLoginBtn) {
      this.googleLoginBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.handleGoogleLogin();
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
    
    // 获取当前用户
    this.currentUser = window.FirebaseService.getCurrentUser();
    
    // 更新UI
    this.updateAuthUI();
  }

  /**
   * 更新认证UI
   */
  updateAuthUI() {
    const syncStatus = document.getElementById('syncStatus');
    
    if (this.currentUser) {
      // 用户已登录
      syncStatus.innerHTML = `<i class="bi bi-cloud-check"></i> ${this.currentUser.email || '已同步'}`;
      syncStatus.classList.remove('text-warning');
      syncStatus.classList.add('text-success');
      syncStatus.title = '已启用云同步';
      
      // 启用云同步
      localStorage.setItem('easy_note_cloud_sync', 'true');
    } else {
      // 用户未登录
      syncStatus.innerHTML = '<i class="bi bi-cloud-slash"></i> 本地模式';
      syncStatus.classList.remove('text-success');
      syncStatus.classList.add('text-warning');
      syncStatus.title = '点击设置云存储';
      
      // 禁用云同步
      localStorage.setItem('easy_note_cloud_sync', 'false');
    }
  }

  /**
   * 打开登录模态框
   */
  showAuthModal() {
    // 如果模态框实例已存在，直接使用
    if (this.authModal) {
      this.authModal.show();
    } else {
      // 否则重新创建模态框实例
      const modalElement = document.getElementById('firebaseAuthModal');
      if (modalElement) {
        this.authModal = new bootstrap.Modal(modalElement);
        this.authModal.show();
      } else {
        console.error('[AuthUI] 找不到firebaseAuthModal元素');
        alert('错误: 找不到登录模态框元素');
        return;
      }
    }
    
    // 检查Firebase服务是否已初始化
    if (!window.FirebaseService.initialized) {
      try {
        window.FirebaseService.init();
      } catch (error) {
        console.error('[AuthUI] Firebase初始化失败', error);
        document.getElementById('authErrorMessage').textContent = '初始化Firebase失败: ' + error.message;
      }
    }
    
    // 重置表单和错误信息
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    document.getElementById('authErrorMessage').textContent = '';
  }

  /**
   * 处理邮箱登录
   */
  async handleEmailLogin() {
    try {
      // 获取表单数据
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      // 表单验证
      if (!email || !password) {
        this.showError('请输入邮箱和密码');
        return;
      }
      
      console.log('[AuthUI] 尝试邮箱登录', email);
      
      // 禁用表单
      this.setFormLoading(true);
      
      // 调用登录API
      const result = await window.FirebaseService.login(email, password);
      
      if (result.success) {
        console.log('[AuthUI] 登录成功');
        this.currentUser = result.user;
        this.authModal.hide();
        this.updateAuthUI();
        this.showSuccess('登录成功');
        
        // 触发登录成功事件
        window.dispatchEvent(new CustomEvent('auth:login', { detail: result.user }));
      } else {
        console.error('[AuthUI] 登录失败', result.error);
        this.showError('登录失败: ' + result.error);
      }
    } catch (error) {
      console.error('[AuthUI] 登录过程中发生错误', error);
      this.showError('登录过程中发生错误: ' + error.message);
    } finally {
      // 启用表单
      this.setFormLoading(false);
    }
  }

  /**
   * 处理用户注册
   */
  async handleRegistration() {
    try {
      // 获取表单数据
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // 表单验证
      if (!email || !password) {
        this.showError('请输入邮箱和密码');
        return;
      }
      
      if (password !== confirmPassword) {
        this.showError('两次输入的密码不一致');
        return;
      }
      
      if (password.length < 6) {
        this.showError('密码长度至少为6个字符');
        return;
      }
      
      console.log('[AuthUI] 尝试注册', email);
      
      // 禁用表单
      this.setFormLoading(true);
      
      // 调用注册API
      const result = await window.FirebaseService.register(email, password);
      
      if (result.success) {
        console.log('[AuthUI] 注册成功');
        this.currentUser = result.user;
        this.authModal.hide();
        this.updateAuthUI();
        this.showSuccess('注册成功，已自动登录');
        
        // 触发登录成功事件
        window.dispatchEvent(new CustomEvent('auth:login', { detail: result.user }));
      } else {
        console.error('[AuthUI] 注册失败', result.error);
        this.showError('注册失败: ' + result.error);
      }
    } catch (error) {
      console.error('[AuthUI] 注册过程中发生错误', error);
      this.showError('注册过程中发生错误: ' + error.message);
    } finally {
      // 启用表单
      this.setFormLoading(false);
    }
  }

  /**
   * 处理Google登录
   */
  async handleGoogleLogin() {
    try {
      console.log('[AuthUI] 尝试Google登录');
      
      // 禁用表单和按钮
      this.setFormLoading(true);
      this.googleLoginBtn.disabled = true;
      this.googleLoginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 登录中...';
      
      // 调用Google登录API
      const result = await window.FirebaseService.loginWithGoogle();
      
      if (result.success) {
        if (result.pending) {
          // 在移动设备上，这里不会立即执行，因为页面会重定向
          console.log('[AuthUI] Google登录重定向中，等待重定向完成');
          // 不需要做任何事，页面会重定向，之后的代码会在重定向回来后执行
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
        this.showError('Google登录失败: ' + result.error);
      }
    } catch (error) {
      console.error('[AuthUI] Google登录过程中发生错误', error);
      this.showError('Google登录过程中发生错误: ' + error.message);
    } finally {
      // 启用表单和按钮
      this.setFormLoading(false);
      this.googleLoginBtn.disabled = false;
      this.googleLoginBtn.innerHTML = '<i class="bi bi-google"></i> 使用 Google 账户登录';
    }
  }

  /**
   * 处理用户登出
   */
  async handleLogout() {
    try {
      console.log('[AuthUI] 尝试登出');
      
      const result = await window.FirebaseService.logout();
      
      if (result.success) {
        console.log('[AuthUI] 登出成功');
        this.currentUser = null;
        this.updateAuthUI();
        this.showSuccess('已成功登出');
        
        // 触发登出成功事件
        window.dispatchEvent(new CustomEvent('auth:logout'));
      } else {
        console.error('[AuthUI] 登出失败', result.error);
        this.showError('登出失败: ' + result.error);
      }
    } catch (error) {
      console.error('[AuthUI] 登出过程中发生错误', error);
      this.showError('登出过程中发生错误: ' + error.message);
    }
  }

  /**
   * 设置表单加载状态
   * @param {boolean} isLoading 是否加载中
   */
  setFormLoading(isLoading) {
    const forms = [this.loginForm, this.registerForm];
    
    forms.forEach(form => {
      if (!form) return;
      
      const inputs = form.querySelectorAll('input, button');
      inputs.forEach(input => {
        input.disabled = isLoading;
      });
    });
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
    // 简单弹窗提示
    alert(message);
  }
}

// 创建单例实例
const AuthUI = new AuthUIClass();

// 导出服务 - 使用全局变量
window.AuthUI = AuthUI; 