// Firebase 集成模块
// 将 FirebaseStorage 与主应用集成

// 存储设置键
const STORAGE_KEY_PROVIDER = 'easy_note_storage_provider';

// 集成模块
const FirebaseIntegration = {
  // 初始化
  initialize: function() {
    console.log('[FirebaseIntegration] 初始化');
    
    // 检查是否选择了 Firebase 作为存储提供商
    const storageProvider = localStorage.getItem(STORAGE_KEY_PROVIDER);
    if (storageProvider !== 'firebase') {
      console.log('[FirebaseIntegration] 未选择 Firebase 作为存储提供商');
      return false;
    }
    
    // 检查 Firebase SDK 是否已加载
    if (!window.firebase) {
      console.error('[FirebaseIntegration] Firebase SDK 未加载，请在 HTML 中添加 Firebase SDK');
      this.showError('Firebase SDK 未加载，请确保已在页面中引入 Firebase SDK');
      return false;
    }
    
    // 初始化 Firebase 存储
    const initResult = FirebaseStorage.initialize();
    if (!initResult) {
      console.error('[FirebaseIntegration] Firebase 初始化失败');
      this.showError('Firebase 初始化失败，请检查配置');
      return false;
    }
    
    // 设置全局存储处理器
    window.CloudStorage = FirebaseStorage;
    
    // 添加登录/注册 UI
    this.setupAuthUI();
    
    console.log('[FirebaseIntegration] 初始化完成');
    return true;
  },
  
  // 设置身份验证 UI
  setupAuthUI: function() {
    console.log('[FirebaseIntegration] 设置身份验证 UI');
    
    // 创建登录模态框
    const modalHtml = `
      <div class="modal fade" id="firebaseAuthModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Firebase 账户</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <ul class="nav nav-tabs" id="authTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login-tab-pane" type="button" role="tab" aria-controls="login-tab-pane" aria-selected="true">登录</button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="register-tab" data-bs-toggle="tab" data-bs-target="#register-tab-pane" type="button" role="tab" aria-controls="register-tab-pane" aria-selected="false">注册</button>
                </li>
              </ul>
              <div class="tab-content pt-3" id="authTabContent">
                <div class="tab-pane fade show active" id="login-tab-pane" role="tabpanel" aria-labelledby="login-tab" tabindex="0">
                  <form id="loginForm">
                    <div class="mb-3">
                      <label for="loginEmail" class="form-label">邮箱</label>
                      <input type="email" class="form-control" id="loginEmail" required>
                    </div>
                    <div class="mb-3">
                      <label for="loginPassword" class="form-label">密码</label>
                      <input type="password" class="form-control" id="loginPassword" required>
                    </div>
                    <div class="d-grid gap-2">
                      <button type="submit" class="btn btn-primary">登录</button>
                      <button type="button" id="googleLoginBtn" class="btn btn-outline-danger">
                        <i class="bi bi-google"></i> 使用 Google 账户登录
                      </button>
                    </div>
                  </form>
                </div>
                <div class="tab-pane fade" id="register-tab-pane" role="tabpanel" aria-labelledby="register-tab" tabindex="0">
                  <form id="registerForm">
                    <div class="mb-3">
                      <label for="registerEmail" class="form-label">邮箱</label>
                      <input type="email" class="form-control" id="registerEmail" required>
                    </div>
                    <div class="mb-3">
                      <label for="registerPassword" class="form-label">密码</label>
                      <input type="password" class="form-control" id="registerPassword" required minlength="6">
                    </div>
                    <div class="mb-3">
                      <label for="confirmPassword" class="form-label">确认密码</label>
                      <input type="password" class="form-control" id="confirmPassword" required minlength="6">
                    </div>
                    <div class="d-grid">
                      <button type="submit" class="btn btn-primary">注册</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 绑定事件处理器
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
    
    document.getElementById('registerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });
    
    document.getElementById('googleLoginBtn').addEventListener('click', () => {
      this.handleGoogleLogin();
    });
  },
  
  // 处理登录
  handleLogin: async function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
      const result = await FirebaseStorage.login(email, password);
      if (result.success) {
        this.closeAuthModal();
        this.showSuccess('登录成功');
        localStorage.setItem('easy_note_cloud_sync', 'true');
        
        // 通知应用更新状态
        if (window.updateSyncStatus) {
          window.updateSyncStatus(true);
        }
      } else {
        this.showError(`登录失败: ${result.error}`);
      }
    } catch (error) {
      this.showError(`登录失败: ${error.message}`);
    }
  },
  
  // 处理注册
  handleRegister: async function() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
      this.showError('两次输入的密码不一致');
      return;
    }
    
    try {
      const result = await FirebaseStorage.register(email, password);
      if (result.success) {
        this.closeAuthModal();
        this.showSuccess('注册成功并已登录');
        localStorage.setItem('easy_note_cloud_sync', 'true');
        
        // 通知应用更新状态
        if (window.updateSyncStatus) {
          window.updateSyncStatus(true);
        }
      } else {
        this.showError(`注册失败: ${result.error}`);
      }
    } catch (error) {
      this.showError(`注册失败: ${error.message}`);
    }
  },
  
  // 处理 Google 登录
  handleGoogleLogin: async function() {
    try {
      const result = await FirebaseStorage.loginWithGoogle();
      if (result.success) {
        this.closeAuthModal();
        this.showSuccess('Google 登录成功');
        localStorage.setItem('easy_note_cloud_sync', 'true');
        
        // 通知应用更新状态
        if (window.updateSyncStatus) {
          window.updateSyncStatus(true);
        }
      } else {
        this.showError(`Google 登录失败: ${result.error}`);
      }
    } catch (error) {
      this.showError(`Google 登录失败: ${error.message}`);
    }
  },
  
  // 关闭认证模态框
  closeAuthModal: function() {
    const modalElement = document.getElementById('firebaseAuthModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  },
  
  // 显示认证模态框
  showAuthModal: function() {
    const modalElement = document.getElementById('firebaseAuthModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  },
  
  // 显示错误消息
  showError: function(message) {
    alert(`错误: ${message}`);
  },
  
  // 显示成功消息
  showSuccess: function(message) {
    alert(`成功: ${message}`);
  },
  
  // 检查用户是否已登录
  checkUserLoggedIn: function() {
    const user = FirebaseStorage.getCurrentUser();
    return !!user;
  },
  
  // 处理存储选项选择
  handleStorageSelection: function(storageType) {
    if (storageType === 'firebase') {
      localStorage.setItem(STORAGE_KEY_PROVIDER, 'firebase');
      
      // 检查用户是否已登录
      if (!this.checkUserLoggedIn()) {
        // 显示登录/注册模态框
        this.showAuthModal();
      } else {
        // 已登录，启用云同步
        localStorage.setItem('easy_note_cloud_sync', 'true');
        
        // 通知应用更新状态
        if (window.updateSyncStatus) {
          window.updateSyncStatus(true);
        }
      }
      
      return true;
    }
    
    return false;
  }
};

// 导出模块
window.FirebaseIntegration = FirebaseIntegration; 