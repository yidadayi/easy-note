/**
 * UI控制器模块
 * 处理用户界面交互和事件
 */

/**
 * UI控制器类
 * 管理用户界面交互和事件
 */
class UIControllerClass {
  constructor() {
    this.initialized = false;
    this.debugMode = false;
  }

  /**
   * 初始化UI控制器
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('[UIController] 初始化UI控制器');
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 检查调试模式
    this.checkDebugMode();
    
    // 初始化调试控制台
    this.initDebugConsole();
    
    this.initialized = true;
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 新建笔记按钮
    document.getElementById('newNoteBtn').addEventListener('click', () => {
      if (confirm('确定要创建新笔记吗？当前内容将会丢失。')) {
        window.NoteService.createNewNote();
      }
    });
    
    // 加密按钮
    document.getElementById('lockBtn').addEventListener('click', () => {
      window.NoteService.showPasswordDialog();
    });
    
    // 分享按钮
    document.getElementById('shareBtn').addEventListener('click', () => {
      this.showShareModal();
    });
    
    // 刷新按钮 - 从云端刷新当前笔记
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshCurrentNote();
    });
    
    // 笔记ID点击复制
    document.getElementById('noteIdDisplay').addEventListener('click', () => {
      this.copyNoteId();
    });
    
    // 调试按钮
    document.getElementById('debugConsoleBtn').addEventListener('click', () => {
      this.toggleDebugConsole();
    });
    
    // 清空控制台按钮
    document.getElementById('clearConsoleBtn').addEventListener('click', () => {
      this.clearConsole();
    });
    
    // 清除存储按钮
    document.getElementById('clearStorageBtn').addEventListener('click', () => {
      this.clearStorage();
    });
    
    // 监听认证事件
    window.addEventListener('auth:login', (event) => {
      console.log('[UIController] 用户登录事件', event.detail);
      this.refreshUI();
    });
    
    window.addEventListener('auth:logout', () => {
      console.log('[UIController] 用户登出事件');
      this.refreshUI();
    });
  }

  /**
   * 检查调试模式
   */
  checkDebugMode() {
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    this.debugMode = urlParams.get('debug') === 'true';
    
    if (this.debugMode) {
      console.log('[UIController] 调试模式已启用');
      document.getElementById('debugConsoleBtn').classList.remove('d-none');
      
      // 重写console方法以捕获日志
      this.interceptConsole();
    } else {
      document.getElementById('debugConsoleBtn').classList.add('d-none');
    }
  }

  /**
   * 初始化调试控制台
   */
  initDebugConsole() {
    // 显示本地存储数据
    this.updateStorageDisplay();
  }

  /**
   * 拦截控制台日志
   */
  interceptConsole() {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    const self = this;
    
    // 重写console.log
    console.log = function() {
      self.addConsoleLog('log', Array.from(arguments));
      originalConsole.log.apply(console, arguments);
    };
    
    // 重写console.warn
    console.warn = function() {
      self.addConsoleLog('warn', Array.from(arguments));
      originalConsole.warn.apply(console, arguments);
    };
    
    // 重写console.error
    console.error = function() {
      self.addConsoleLog('error', Array.from(arguments));
      originalConsole.error.apply(console, arguments);
    };
    
    // 重写console.info
    console.info = function() {
      self.addConsoleLog('info', Array.from(arguments));
      originalConsole.info.apply(console, arguments);
    };
  }

  /**
   * 添加控制台日志
   * @param {string} type 日志类型
   * @param {Array} args 日志参数
   */
  addConsoleLog(type, args) {
    if (!this.debugMode) return;
    
    const consoleOutput = document.getElementById('consoleOutput');
    if (!consoleOutput) return;
    
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    // 格式化日志内容
    let content = '';
    args.forEach(arg => {
      if (typeof arg === 'object') {
        try {
          content += JSON.stringify(arg, null, 2) + ' ';
        } catch (e) {
          content += arg + ' ';
        }
      } else {
        content += arg + ' ';
      }
    });
    
    // 创建日志元素
    const logElement = document.createElement('div');
    logElement.className = `log-entry log-${type}`;
    
    // 设置日志样式
    let color = 'white';
    switch (type) {
      case 'error':
        color = '#ff8080';
        break;
      case 'warn':
        color = '#ffcc80';
        break;
      case 'info':
        color = '#80ccff';
        break;
    }
    
    logElement.innerHTML = `<span style="color: #aaa;">[${timestamp}]</span> <span style="color: ${color};">${content}</span>`;
    
    // 添加到控制台
    consoleOutput.appendChild(logElement);
    
    // 自动滚动到底部
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  /**
   * 清空控制台
   */
  clearConsole() {
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
      consoleOutput.innerHTML = '';
    }
  }

  /**
   * 更新存储显示
   */
  updateStorageDisplay() {
    const localStorageData = document.getElementById('localStorageData');
    if (!localStorageData) return;
    
    // 获取所有本地存储数据
    const storageData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        storageData[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        storageData[key] = localStorage.getItem(key);
      }
    }
    
    // 显示数据
    localStorageData.textContent = JSON.stringify(storageData, null, 2);
  }

  /**
   * 清除存储
   */
  clearStorage() {
    if (confirm('确定要清除所有存储数据吗？这将删除所有本地笔记和设置。')) {
      localStorage.clear();
      this.updateStorageDisplay();
      alert('存储数据已清除');
      
      // 刷新页面
      window.location.href = window.location.pathname;
    }
  }

  /**
   * 复制笔记ID
   */
  copyNoteId() {
    const noteIdValue = document.getElementById('noteIdValue');
    if (!noteIdValue || !noteIdValue.textContent) return;
    
    // 创建临时输入框
    const tempInput = document.createElement('input');
    tempInput.value = noteIdValue.textContent;
    document.body.appendChild(tempInput);
    
    // 选择并复制
    tempInput.select();
    document.execCommand('copy');
    
    // 移除临时输入框
    document.body.removeChild(tempInput);
    
    // 显示提示
    alert('笔记ID已复制到剪贴板');
  }

  /**
   * 切换调试控制台
   */
  toggleDebugConsole() {
    const debugConsoleModal = new bootstrap.Modal(document.getElementById('debugConsoleModal'));
    debugConsoleModal.show();
    
    // 更新存储显示
    this.updateStorageDisplay();
  }

  /**
   * 刷新UI
   */
  refreshUI() {
    // 这里可以添加刷新UI的逻辑
    // 通常由其他模块调用
  }
  
  /**
   * 刷新当前笔记
   * 从云端重新加载当前笔记
   */
  refreshCurrentNote() {
    if (!window.NoteService || !window.NoteService.currentNote) {
      console.log('[UIController] 没有活动的笔记可刷新');
      return;
    }
    
    const noteId = window.NoteService.currentNote.id;
    if (!noteId) {
      console.log('[UIController] 当前笔记没有ID');
      return;
    }
    
    console.log(`[UIController] 刷新笔记: ${noteId}`);
    
    // 检查是否启用了云存储
    if (!window.NoteService.isCloudEnabled()) {
      alert('云存储未启用，请先登录以启用云同步功能。');
      return;
    }
    
    // 显示加载指示器
    const noteContent = document.getElementById('noteContent');
    if (noteContent) {
      noteContent.disabled = true;
    }
    
    // 从云端重新加载
    window.NoteService.loadNote(noteId)
      .then(() => {
        console.log('[UIController] 笔记刷新成功');
      })
      .catch(error => {
        console.error('[UIController] 笔记刷新失败', error);
        alert('刷新笔记失败: ' + error.message);
      })
      .finally(() => {
        if (noteContent) {
          noteContent.disabled = false;
        }
      });
  }

  /**
   * 初始化UI事件
   */
  initUIEvents() {
    // 新建笔记按钮
    document.getElementById('newNoteBtn').addEventListener('click', () => {
      window.NoteService.createNewNote();
    });
    
    // 分享按钮
    document.getElementById('shareBtn').addEventListener('click', () => {
      this.showShareModal();
    });
    
    // 加密按钮
    document.getElementById('lockBtn').addEventListener('click', () => {
      this.toggleEncryption();
    });
    
    // 历史按钮
    document.getElementById('historyBtn').addEventListener('click', () => {
      this.showHistoryModal();
    });
    
    // 历史链接
    const historyLink = document.getElementById('historyLink');
    if (historyLink) {
      historyLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSimpleHistoryList();
      });
    }
    
    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      await window.NoteService.refreshNote();
    });
    
    // 复制链接按钮
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
      this.copyShareLink();
    });
    
    // 刷新历史列表按钮
    document.getElementById('refreshHistoryBtn').addEventListener('click', () => {
      window.NoteService.loadHistoryNotes();
    });
    
    // 笔记ID显示区域点击复制
    const noteIdDisplay = document.getElementById('noteIdDisplay');
    if (noteIdDisplay) {
      noteIdDisplay.addEventListener('click', () => {
        const noteId = document.getElementById('noteIdValue').textContent;
        navigator.clipboard.writeText(noteId).then(() => {
          this.showToast('笔记ID已复制到剪贴板');
        });
      });
    }
    
    // 同步状态点击事件
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
      syncStatus.addEventListener('click', () => {
        // 打开Firebase认证模态框
        const modal = new bootstrap.Modal(document.getElementById('firebaseAuthModal'));
        modal.show();
      });
    }
    
    // 监听历史模态框显示事件
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
      historyModal.addEventListener('show.bs.modal', () => {
        window.NoteService.loadHistoryNotes();
      });
    }
  }
  
  /**
   * 显示历史笔记模态框
   */
  showHistoryModal() {
    if (!window.FirebaseService || !window.FirebaseService.isCloudEnabled()) {
      this.showFirebaseAuthModal();
      this.showToast('请先登录以查看您的笔记历史', 'warning');
      return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('historyModal'));
    modal.show();
  }

  /**
   * 显示分享模态框
   */
  showShareModal() {
    // 获取当前笔记ID
    if (!window.NoteService || !window.NoteService.currentNote) {
      console.log('[UIController] 没有活动的笔记可分享');
      return;
    }
    
    const noteId = window.NoteService.currentNote.id;
    if (!noteId) {
      console.log('[UIController] 当前笔记没有ID');
      return;
    }
    
    // 生成分享链接
    const currentUrl = window.location.origin + window.location.pathname;
    const shareLink = `${currentUrl}?id=${noteId}`;
    
    // 设置分享链接到输入框
    const shareLinkInput = document.getElementById('shareLink');
    if (shareLinkInput) {
      shareLinkInput.value = shareLink;
    }
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
  }
  
  /**
   * 复制分享链接
   */
  copyShareLink() {
    const shareLinkInput = document.getElementById('shareLink');
    if (!shareLinkInput || !shareLinkInput.value) return;
    
    // 选择并复制
    shareLinkInput.select();
    document.execCommand('copy');
    
    // 显示提示
    this.showToast('分享链接已复制到剪贴板');
  }
  
  /**
   * 切换加密状态
   */
  toggleEncryption() {
    if (!window.NoteService) return;
    
    window.NoteService.showPasswordDialog();
  }
  
  /**
   * 显示Firebase认证模态框
   */
  showFirebaseAuthModal() {
    const modal = new bootstrap.Modal(document.getElementById('firebaseAuthModal'));
    modal.show();
  }
  
  /**
   * 显示Toast提示
   * @param {string} message 提示消息
   * @param {string} type 提示类型 (success, warning, danger)
   */
  showToast(message, type = 'success') {
    // 使用Bootstrap toast或简单提示
    console.log(`[UIController] 提示: ${message} (${type})`);
    
    // 尝试使用现有的错误提示组件
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorToast && errorMessage) {
      // 设置消息
      errorMessage.textContent = message;
      
      // 根据类型设置样式
      errorToast.classList.remove('bg-danger', 'bg-warning', 'bg-success');
      switch (type) {
        case 'warning':
          errorToast.classList.add('bg-warning');
          break;
        case 'danger':
          errorToast.classList.add('bg-danger');
          break;
        default:
          errorToast.classList.add('bg-success');
      }
      
      // 显示提示
      const bsToast = new bootstrap.Toast(errorToast);
      bsToast.show();
    } else {
      // 降级到alert
      alert(message);
    }
  }

  /**
   * 显示简易历史笔记列表
   */
  async showSimpleHistoryList() {
    if (!window.FirebaseService || !window.FirebaseService.isCloudEnabled()) {
      this.showToast('请先登录Firebase账号以查看历史笔记', 'warning');
      return;
    }
    
    try {
      // 创建一个简单的浮动列表
      let listContainer = document.getElementById('historyListContainer');
      
      if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.id = 'historyListContainer';
        listContainer.style.position = 'fixed';
        listContainer.style.bottom = '80px';
        listContainer.style.left = '50%';
        listContainer.style.transform = 'translateX(-50%)';
        listContainer.style.width = '80%';
        listContainer.style.maxWidth = '500px';
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflowY = 'auto';
        listContainer.style.backgroundColor = 'white';
        listContainer.style.border = '1px solid #ddd';
        listContainer.style.borderRadius = '8px';
        listContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        listContainer.style.zIndex = '1050';
        listContainer.style.padding = '15px';
        document.body.appendChild(listContainer);
      }
      
      // 显示加载中
      listContainer.innerHTML = `
        <div class="text-center p-3">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
          <p class="mt-2">正在加载历史笔记...</p>
        </div>
      `;
      
      // 获取数据
      const result = await window.FirebaseService.getUserNotes();
      
      if (!result.success) {
        listContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-circle"></i> 加载失败: ${result.error}
            <button type="button" class="btn-close float-end" aria-label="Close" onclick="document.getElementById('historyListContainer').remove()"></button>
          </div>
        `;
        return;
      }
      
      const notes = result.notes || [];
      
      if (notes.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center p-3">
            <i class="bi bi-info-circle text-info fs-3"></i>
            <p>没有找到历史笔记</p>
            <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('historyListContainer').remove()">关闭</button>
          </div>
        `;
        return;
      }
      
      // 创建列表
      let listContent = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0">历史笔记 (${notes.length})</h6>
          <button type="button" class="btn-close" aria-label="Close" onclick="document.getElementById('historyListContainer').remove()"></button>
        </div>
        <div class="list-group">
      `;
      
      notes.forEach(note => {
        // 格式化更新时间
        const updatedAt = new Date(note.updatedAt);
        const formattedDate = `${updatedAt.getFullYear()}-${(updatedAt.getMonth()+1).toString().padStart(2, '0')}-${updatedAt.getDate().toString().padStart(2, '0')} ${updatedAt.getHours().toString().padStart(2, '0')}:${updatedAt.getMinutes().toString().padStart(2, '0')}`;
        
        listContent += `
          <a href="?id=${note.id}" class="list-group-item list-group-item-action">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">${note.title || '无标题笔记'}</h6>
              <small>${note.isEncrypted ? '<i class="bi bi-lock-fill text-danger"></i> ' : ''}${formattedDate}</small>
            </div>
            <small class="text-muted">${note.id}</small>
          </a>
        `;
      });
      
      listContent += `
        </div>
      `;
      
      listContainer.innerHTML = listContent;
      
    } catch (error) {
      console.error('[UIController] 显示历史列表出错', error);
      this.showToast('加载历史笔记失败: ' + error.message, 'danger');
    }
  }
}

// 创建单例实例
const UIController = new UIControllerClass();

// 导出服务 - 使用全局变量
window.UIController = UIController; 