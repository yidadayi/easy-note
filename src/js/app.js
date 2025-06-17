/**
 * Easy Note 应用主文件
 * 负责初始化和协调各个模块
 */

// 确保DOM加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Easy Note 应用初始化');
  
  try {
    // 初始化Firebase服务
    window.FirebaseService = new FirebaseService();
    await window.FirebaseService.init();
    console.log('Firebase服务初始化完成');
    
    // 初始化UI控制器
    window.UIController = new UIControllerClass();
    window.UIController.initialize();
    console.log('UI控制器初始化完成');
    
    // 初始化笔记服务
    window.NoteService = new NoteService();
    console.log('笔记服务初始化完成');
    
    // 获取URL参数中的笔记ID
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id') || generateId();
    console.log(`笔记ID: ${noteId}`);
    
    // 加载指定ID的笔记或创建新笔记
    await window.NoteService.loadNote(noteId);
    
    // 初始化UI事件 - 确保在所有依赖服务初始化后再绑定事件
    window.UIController.initUIEvents();
    console.log('UI事件初始化完成');
    
    console.log('Easy Note 应用初始化完成');
  } catch (error) {
    console.error('应用初始化失败:', error);
    alert('应用初始化失败: ' + error.message);
  }
});

/**
 * 检查必要的依赖是否加载
 */
function checkDependencies() {
  console.log('检查依赖...');
  
  // 检查Firebase
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK未加载');
  }
  
  // 检查Bootstrap
  if (typeof bootstrap === 'undefined') {
    throw new Error('Bootstrap未加载');
  }
  
  // 检查CryptoJS
  if (typeof CryptoJS === 'undefined') {
    throw new Error('CryptoJS未加载');
  }
  
  console.log('所有依赖已加载');
}

/**
 * 初始化应用
 */
function initializeApp() {
  console.log('初始化应用...');
  
  try {
    // 初始化Firebase服务
    window.FirebaseService.init();
    
    // 初始化认证UI
    window.AuthUI.initialize();
    
    // 初始化笔记服务
    window.NoteService.initialize();
    
    // 初始化UI控制器
    window.UIController.initialize();
    
    // 设置自动保存
    setupAutoSave();
    
    console.log('应用初始化完成');
  } catch (error) {
    console.error('初始化模块失败:', error);
    showFatalError('初始化模块失败: ' + error.message);
  }
}

/**
 * 设置自动保存
 */
function setupAutoSave() {
  // 监听笔记内容变化
  const noteContent = document.getElementById('noteContent');
  if (noteContent) {
    let typingTimer;
    const doneTypingInterval = 1000; // 1秒后保存
    
    noteContent.addEventListener('input', function() {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(function() {
        // 用户停止输入后保存
        if (noteContent.value.trim()) {
          console.log('自动保存...');
          window.NoteService.saveNote(noteContent.value);
        }
      }, doneTypingInterval);
    });
  }
}

/**
 * 显示致命错误
 * @param {string} message 错误消息
 */
function showFatalError(message) {
  document.body.innerHTML = `
    <div class="container mt-5">
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">应用错误</h4>
        <p>${message}</p>
        <hr>
        <p class="mb-0">请刷新页面或稍后再试。如果问题持续存在，请联系支持。</p>
        <button class="btn btn-primary mt-3" onclick="location.reload()">刷新页面</button>
      </div>
    </div>
  `;
}

/**
 * 生成随机ID
 * @returns {string} 随机ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 10);
} 