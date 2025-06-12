// 重构应用程序初始化代码，确保只在一个地方进行初始化
// 全局变量和DOM元素引用
// 改为let，允许后续修改为备用API
let API_BASE_URL = 'https://api.github.com'; 
// 使用备用API作为默认API，避免CORS错误
API_BASE_URL = 'https://gh-api.onrender.com/api/v3';
const DEBUG_MODE = true; // 启用详细日志

// OAuth认证模式，不再使用静态令牌
// GITHUB_TOKEN 变量仍保留用于兼容，但其值来自OAuth
let GITHUB_TOKEN = null; 

// 检查OAuth认证状态，更新令牌
if (GitHubOAuth.hasValidOAuthToken()) {
    GITHUB_TOKEN = GitHubOAuth.getOAuthToken();
    logInfo('Auth', '从OAuth获取到有效令牌');
}

// 创建GitHub API授权头部函数
function getAuthHeaders(includeContentType = false) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    
    // 尝试获取最新的OAuth令牌
    if (GitHubOAuth.hasValidOAuthToken()) {
        GITHUB_TOKEN = GitHubOAuth.getOAuthToken();
    }
    
    if (!GITHUB_TOKEN) {
        console.error('尝试创建授权头部但OAuth令牌未设置');
        return headers;
    }
    
    // OAuth令牌统一使用Bearer前缀
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    
    // 添加Cache-Control头，防止缓存干扰
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    
    return headers;
}

// 删除JSONBin相关函数

let isEncrypted = false;
let lastSaved = null;
let isCloudSyncEnabled = false;
let forceLocalOnly = false;

// DOM元素引用
let noteContent, newNoteBtn, shareBtn, lockBtn, lastSavedEl, syncStatusEl, noteStatusEl, 
    shareModal, passwordModal, unlockModal, savePasswordBtn, unlockNoteBtn, copyLinkBtn,
    storageOptionsModal;

// 删除不需要的DOM元素引用

// 日志函数
function logInfo(category, message, data) {
    if (DEBUG_MODE) {
        const prefix = `[${category}]`;
        if (data !== undefined) {
            console.log(`%c${prefix} ${message}`, 'color: #2196F3;', data);
        } else {
            console.log(`%c${prefix} ${message}`, 'color: #2196F3;');
        }
    }
}

function logError(category, message, error) {
    const prefix = `[${category}]`;
    if (error) {
        console.error(`%c${prefix} ${message}`, 'color: #F44336;', error);
    } else {
        console.error(`%c${prefix} ${message}`, 'color: #F44336;');
    }
}

function logWarning(category, message, data) {
    const prefix = `[${category}]`;
    if (data !== undefined) {
        console.warn(`%c${prefix} ${message}`, 'color: #FF9800;', data);
    } else {
        console.warn(`%c${prefix} ${message}`, 'color: #FF9800;');
    }
}

// 显示错误信息函数
function showError(message, details = '') {
    logError('UI', message, details);
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('d-none');
        
        // 5秒后自动隐藏
        setTimeout(() => {
            errorEl.classList.add('d-none');
        }, 5000);
    } else {
        alert(message + (details ? '\n\n' + details : ''));
    }
}

// 显示调试信息提示函数
function showDebugAlert(message) {
    if (!DEBUG_MODE) return;
    
    // 检查是否已有提示框
    let debugAlert = document.getElementById('debugAlert');
    
    if (!debugAlert) {
        // 创建一个新的提示框
        debugAlert = document.createElement('div');
        debugAlert.id = 'debugAlert';
        debugAlert.className = 'debug-alert alert alert-info';
        debugAlert.style.position = 'fixed';
        debugAlert.style.bottom = '20px';
        debugAlert.style.right = '20px';
        debugAlert.style.zIndex = '9999';
        debugAlert.style.maxWidth = '300px';
        document.body.appendChild(debugAlert);
    }
    
    // 设置提示内容
    debugAlert.textContent = message;
    debugAlert.style.display = 'block';
    
    // 2秒后自动隐藏
    setTimeout(() => {
        debugAlert.style.display = 'none';
    }, 2000);
}

// 应用状态变量
let currentNoteId = '';

// 主文档加载事件 - 应用唯一入口点
document.addEventListener('DOMContentLoaded', function() {
    console.log('%c Easy Note 应用已启动 ', 'background: #4CAF50; color: white; padding: 5px; border-radius: 3px;');
    console.log('%c 调试模式: ' + (DEBUG_MODE ? '开启' : '关闭'), 'background: #2196F3; color: white; padding: 3px; border-radius: 3px;');
    
    try {
        // 初始化DOM元素引用
        initDOMReferences();
        
        // 打印环境信息，有助于跨浏览器调试
        const envInfo = {
            url: window.location.href,
            userAgent: navigator.userAgent,
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            cookiesEnabled: navigator.cookieEnabled,
            protocol: window.location.protocol,
            host: window.location.host
        };
        
        logInfo('Env', '浏览器环境信息', envInfo);
        
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            logWarning('Security', '应用运行在非HTTPS环境下，某些功能可能受限');
        }
        
        // 初始化模态框
        initModals();
        
        // 初始化应用
        init();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 错误消息点击处理
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.addEventListener('click', function() {
                errorEl.classList.add('d-none');
            });
        }
        
        // 打印所有按钮的状态
        logButtonStatus();
        
        logInfo('App', '应用初始化完成');
    } catch (error) {
        // 更详细地记录错误信息
        const errorDetails = {
            message: error?.message || '未知错误',
            stack: error?.stack,
            type: error?.constructor?.name || typeof error
        };
        console.error('初始化应用时出错:', errorDetails);
        
        // 显示用户友好的错误消息
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = '初始化应用失败，请刷新页面重试: ' + (error?.message || '未知错误');
            errorEl.classList.remove('d-none');
        } else {
            // 如果错误元素不存在，回退到alert
            alert('初始化应用失败，请刷新页面重试: ' + (error?.message || '未知错误'));
        }
    }
});

// 调试函数：输出所有按钮的状态
function logButtonStatus() {
    try {
        const buttons = {
            backBtn: document.getElementById('backBtn'),
            newNoteBtn: document.getElementById('newNoteBtn'),
            shareBtn: document.getElementById('shareBtn'),
            lockBtn: document.getElementById('lockBtn'),
            copyLinkBtn: document.getElementById('copyLinkBtn'),
            savePasswordBtn: document.getElementById('savePasswordBtn'),
            unlockNoteBtn: document.getElementById('unlockNoteBtn'),
            saveStorageOptionsBtn: document.getElementById('saveStorageOptionsBtn'),
            saveGithubTokenBtn: document.getElementById('saveGithubTokenBtn'),
            tokenDebugBtn: document.getElementById('tokenDebugBtn')
        };
        
        const status = {};
        
        for (const [name, element] of Object.entries(buttons)) {
            status[name] = {
                exists: !!element,
                visible: element ? !element.classList.contains('d-none') : false,
                disabled: element ? element.disabled : true,
                hasClickListener: element ? (element._hasClickListener || '未知') : false
            };
            
            // 尝试添加一个临时事件来检测是否已有点击事件
            if (element) {
                const origClick = element.onclick;
                element.onclick = function() {
                    console.log(`Button '${name}' was clicked`);
                    if (origClick) return origClick.apply(this, arguments);
                };
                element._hasClickListener = true;
            }
        }
        
        console.log('%c 按钮状态 ', 'background: #ff9800; color: white; padding: 3px; border-radius: 3px;', status);
        
        // 输出模态框状态
        const modals = {
            shareModal: document.getElementById('shareModal'),
            passwordModal: document.getElementById('passwordModal'),
            unlockModal: document.getElementById('unlockModal'),
            storageOptionsModal: document.getElementById('storageOptionsModal'),
            githubTokenModal: document.getElementById('githubTokenModal')
        };
        
        const modalStatus = {};
        
        for (const [name, element] of Object.entries(modals)) {
            modalStatus[name] = {
                exists: !!element,
                bootstrapInitialized: element ? (typeof bootstrap !== 'undefined' && !!bootstrap.Modal.getInstance(element)) : false
            };
        }
        
        console.log('%c 模态框状态 ', 'background: #9c27b0; color: white; padding: 3px; border-radius: 3px;', modalStatus);
    } catch (error) {
        console.error('记录按钮状态时出错:', error);
    }
}

// 初始化DOM元素引用
function initDOMReferences() {
    noteContent = document.getElementById('noteContent');
    newNoteBtn = document.getElementById('newNoteBtn');
    shareBtn = document.getElementById('shareBtn');
    lockBtn = document.getElementById('lockBtn');
    lastSavedEl = document.getElementById('lastSaved');
    syncStatusEl = document.getElementById('syncStatus');
    noteStatusEl = document.getElementById('noteStatus');
    copyLinkBtn = document.getElementById('copyLinkBtn');
    savePasswordBtn = document.getElementById('savePasswordBtn');
    unlockNoteBtn = document.getElementById('unlockNoteBtn');
    
    // 检查元素是否存在
    if (!noteContent) logError('Init', '找不到noteContent元素');
    if (!newNoteBtn) logError('Init', '找不到newNoteBtn元素');
    if (!shareBtn) logError('Init', '找不到shareBtn元素');
    if (!lockBtn) logError('Init', '找不到lockBtn元素');
    if (!lastSavedEl) logError('Init', '找不到lastSavedEl元素');
    if (!syncStatusEl) logError('Init', '找不到syncStatusEl元素');
    if (!noteStatusEl) logError('Init', '找不到noteStatusEl元素');
    if (!copyLinkBtn) logError('Init', '找不到copyLinkBtn元素');
    if (!savePasswordBtn) logError('Init', '找不到savePasswordBtn元素');
    if (!unlockNoteBtn) logError('Init', '找不到unlockNoteBtn元素');
    
    logInfo('Init', 'DOM元素引用初始化完成');
}

// 初始化Bootstrap模态框
function initModals() {
    try {
        logInfo('Init', '初始化模态框...');
        
        // 初始化分享和密码模态框
        const shareModalEl = document.getElementById('shareModal');
        if (shareModalEl) {
            shareModal = new bootstrap.Modal(shareModalEl);
            logInfo('Init', '分享模态框初始化成功');
        } else {
            logWarning('Init', '找不到分享模态框');
        }
        
        const passwordModalEl = document.getElementById('passwordModal');
        if (passwordModalEl) {
            passwordModal = new bootstrap.Modal(passwordModalEl);
            logInfo('Init', '密码模态框初始化成功');
        } else {
            logWarning('Init', '找不到密码模态框');
        }
        
        // 初始化存储选项模态框
        const storageOptionsModalEl = document.getElementById('storageOptionsModal');
        if (storageOptionsModalEl) {
            storageOptionsModal = new bootstrap.Modal(storageOptionsModalEl);
            logInfo('Init', '存储选项模态框初始化成功');
        } else {
            logWarning('Init', '找不到存储选项模态框');
        }
        
        // 初始化GitHub令牌模态框
        const githubTokenModalEl = document.getElementById('githubTokenModal');
        if (githubTokenModalEl) {
            githubTokenModal = new bootstrap.Modal(githubTokenModalEl);
            
            // 为GitHub令牌模态框添加token-alert容器
            const modalBody = githubTokenModalEl.querySelector('.modal-body');
            if (modalBody) {
                if (!modalBody.querySelector('.token-alert')) {
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert alert-warning token-alert';
                    alertDiv.style.display = 'none';
                    alertDiv.innerHTML = '<strong>权限问题:</strong> 您的GitHub令牌缺少必要的gist操作权限。请确保您的令牌具有正确的权限设置。';
                    modalBody.insertBefore(alertDiv, modalBody.firstChild);
                }
            }
            
            logInfo('Init', 'GitHub令牌模态框初始化成功');
        } else {
            logWarning('Init', '找不到GitHub令牌模态框');
        }
        
        // 初始化设置模态框
        const settingsModalEl = document.getElementById('githubTokenModal'); // 重用GitHub令牌模态框作为设置模态框
        if (settingsModalEl) {
            settingsModal = new bootstrap.Modal(settingsModalEl);
            logInfo('Init', '设置模态框初始化成功');
        } else {
            logWarning('Init', '找不到设置模态框');
        }
        
        // 初始化笔记解锁模态框
        const unlockModalEl = document.getElementById('unlockModal');
        if (unlockModalEl) {
            unlockModal = new bootstrap.Modal(unlockModalEl);
            logInfo('Init', '笔记解锁模态框初始化成功');
        } else {
            logWarning('Init', '找不到笔记解锁模态框');
        }
    } catch (error) {
        logError('Init', '初始化模态框时出错', error);
    }
}

// 设置事件监听器
function setupEventListeners() {
    try {
        logInfo('Init', '开始设置事件监听器');
        
        // 获取所有DOM元素引用
        const backBtn = document.getElementById('backBtn');
        const newNoteBtn = document.getElementById('newNoteBtn');
        const shareBtn = document.getElementById('shareBtn');
        const lockBtn = document.getElementById('lockBtn');
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        const savePasswordBtn = document.getElementById('savePasswordBtn');
        const unlockNoteBtn = document.getElementById('unlockNoteBtn');
        const saveStorageOptionsBtn = document.getElementById('saveStorageOptionsBtn');
        const saveGithubTokenBtn = document.getElementById('saveGithubTokenBtn');
        const tokenDebugBtn = document.getElementById('tokenDebugBtn');
        const noteIdDisplay = document.getElementById('noteIdDisplay');
        const debugConsoleBtn = document.getElementById('debugConsoleBtn');
        const clearConsoleBtn = document.getElementById('clearConsoleBtn');
        const clearStorageBtn = document.getElementById('clearStorageBtn');
        
        // 检查必要的按钮
        if (!newNoteBtn || !shareBtn || !lockBtn) {
            logError('Init', '无法设置事件监听器，关键DOM元素不存在');
            alert('初始化界面失败，缺少关键按钮元素，请刷新页面');
            return;
        }
        
        // 日志每个按钮状态
        logInfo('DOM', '按钮状态检查', {
            backBtn: !!backBtn,
            newNoteBtn: !!newNoteBtn,
            shareBtn: !!shareBtn,
            lockBtn: !!lockBtn,
            copyLinkBtn: !!copyLinkBtn,
            savePasswordBtn: !!savePasswordBtn,
            unlockNoteBtn: !!unlockNoteBtn
        });
        
        // Back button
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                logInfo('Event', '点击了返回按钮');
                goBack();
            });
        } else {
            logWarning('Init', '返回按钮不存在');
        }
        
        // New note button
        newNoteBtn.addEventListener('click', function() {
            logInfo('Event', '点击了新建笔记按钮');
            createNewNote();
        });
        
        // Share button
        shareBtn.addEventListener('click', function() {
            logInfo('Event', '点击了分享按钮');
            const shareLink = document.getElementById('shareLink');
            if (shareLink) {
                shareLink.value = window.location.href;
                if (shareModal) {
                    shareModal.show();
                } else {
                    logError('Event', '分享模态框不存在');
                    alert('分享功能初始化失败，请刷新页面后重试');
                }
            }
        });
        
        // Copy link button
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', function() {
                logInfo('Event', '点击了复制链接按钮');
                const shareLink = document.getElementById('shareLink');
                if (shareLink) {
                    shareLink.select();
                    document.execCommand('copy');
                    copyLinkBtn.textContent = '已复制!';
                    setTimeout(() => {
                        copyLinkBtn.textContent = '复制';
                    }, 2000);
                }
            });
        }
        
        // Lock/Encrypt button
        lockBtn.addEventListener('click', function() {
            logInfo('Event', '点击了加密/解锁按钮');
            if (isEncrypted) {
                // Already encrypted, show unlock modal
                if (unlockModal) {
                    unlockModal.show();
                } else {
                    logError('Event', '解锁模态框不存在');
                    alert('解锁功能初始化失败，请刷新页面后重试');
                }
            } else {
                // Not encrypted, show password modal
                if (passwordModal) {
                    passwordModal.show();
                } else {
                    logError('Event', '密码模态框不存在');
                    alert('加密功能初始化失败，请刷新页面后重试');
                }
            }
        });
        
        // Save password button
        if (savePasswordBtn) {
            savePasswordBtn.addEventListener('click', function() {
                logInfo('Event', '点击了保存密码按钮');
                const password = document.getElementById('notePassword');
                if (password && password.value) {
                    encryptNote(password.value);
                    if (passwordModal) passwordModal.hide();
                    password.value = '';
                } else {
                    alert('请输入密码！');
                }
            });
        }
        
        // Unlock note button
        if (unlockNoteBtn) {
            unlockNoteBtn.addEventListener('click', function() {
                logInfo('Event', '点击了解锁笔记按钮');
                const password = document.getElementById('unlockPassword');
                const passwordError = document.getElementById('passwordError');
                
                if (password && password.value) {
                    const success = decryptNote(password.value);
                    
                    if (success) {
                        if (unlockModal) unlockModal.hide();
                        password.value = '';
                        if (passwordError) passwordError.classList.add('d-none');
                    } else if (passwordError) {
                        passwordError.classList.remove('d-none');
                    }
                } else {
                    alert('请输入密码！');
                }
            });
        }

        // Sync status click handler
        if (syncStatusEl) {
            syncStatusEl.addEventListener('click', function() {
                logInfo('Event', '点击了同步状态');
                handleSyncStatusClick();
            });
        }
        
        // 存储选项保存按钮
        if (saveStorageOptionsBtn) {
            saveStorageOptionsBtn.addEventListener('click', function() {
                logInfo('Event', '点击了保存存储选项按钮');
                handleSaveStorageOptions();
            });
        } else {
            logWarning('Init', '存储选项保存按钮不存在');
        }
        
        // GitHub令牌保存按钮
        if (saveGithubTokenBtn) {
            saveGithubTokenBtn.addEventListener('click', function() {
                logInfo('Event', '点击了保存GitHub令牌按钮');
                handleSaveGithubToken();
            });
        } else {
            logWarning('Init', 'GitHub令牌保存按钮不存在');
        }

        // OAuth模式不再需要令牌诊断按钮
        // 此处移除了tokenDebugBtn相关代码

        // 笔记ID复制功能
        if (noteIdDisplay) {
            noteIdDisplay.addEventListener('click', function() {
                logInfo('Event', '点击了笔记ID显示');
                if (currentNoteId) {
                    copyToClipboard(currentNoteId);
                }
            });
        }
        
        // 调试控制台按钮
        if (debugConsoleBtn) {
            debugConsoleBtn.addEventListener('click', function() {
                logInfo('Event', '点击了调试控制台按钮');
                updateDebugConsole();
                const debugConsoleModal = document.getElementById('debugConsoleModal');
                if (debugConsoleModal) {
                    const modal = new bootstrap.Modal(debugConsoleModal);
                    modal.show();
                }
            });
        }
        
        // 清空控制台按钮
        if (clearConsoleBtn) {
            clearConsoleBtn.addEventListener('click', function() {
                logInfo('Event', '点击了清空控制台按钮');
                const consoleOutput = document.getElementById('consoleOutput');
                const networkRequests = document.getElementById('networkRequests');
                
                if (consoleOutput) {
                    consoleOutput.innerHTML = '<div class="text-muted">控制台已清空</div>';
                }
                if (networkRequests) {
                    networkRequests.innerHTML = '<div class="alert alert-info">网络请求将在发生时显示在这里</div>';
                }
            });
        }
        
        // 清空存储按钮
        if (clearStorageBtn) {
            clearStorageBtn.addEventListener('click', function() {
                logInfo('Event', '点击了清空存储按钮');
                if (confirm('确定要清除所有本地存储数据吗？这将删除所有设置和本地笔记。')) {
                    localStorage.clear();
                    updateStorageDebug();
                    alert('存储已清空');
                }
            });
        }
        
        // 监听popstate事件（浏览器前进后退按钮）
        window.addEventListener('popstate', function(event) {
            logInfo('Navigation', '检测到浏览器导航事件', event.state);
            checkURLChange();
        });
        
        logInfo('Init', '事件监听器设置完成');
    } catch (error) {
        logError('Init', '事件监听器设置失败', error);
        showError('初始化界面失败，请刷新页面重试', error.message);
    }
}

// 复制到剪贴板的辅助函数
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            logInfo('UI', `已复制文本: ${text}`);
            showDebugAlert('已复制到剪贴板');
        })
        .catch(err => {
            logError('UI', '复制失败', err);
            // 备用方法
            try {
                const tempInput = document.createElement('input');
                tempInput.value = text;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showDebugAlert('已复制到剪贴板');
            } catch (e) {
                showError('复制失败，请手动复制: ' + text);
            }
        });
}

// 处理同步状态点击
function handleSyncStatusClick() {
    try {
    logInfo('Event', '点击了同步状态');
    
        // 检查是否有设置模态框
        if (!settingsModal) {
            logError('Event', '设置模态框不存在');
            showError('无法显示设置', '设置界面未初始化');
            return;
        }
        
        // 如果云同步已启用并已连接
        if (window.CloudStorage && window.GitHubOAuth && CloudStorage.isEnabled() && GitHubOAuth.hasValidOAuthToken()) {
            logInfo('Event', '云同步已启用，显示状态');
            
            // 验证连接状态
            CloudStorage.validateConnection().then(result => {
                if (result.success) {
                    // 更新设置模态框中的内容
                    const statusDetails = `
                        <div class="alert alert-success">
                            <h5><i class="bi bi-cloud-check"></i> 云同步已启用并正常工作</h5>
                            <p class="mb-0">已连接到GitHub账户: <strong>${result.user}</strong></p>
                        </div>
                    `;
                    
                    // 更新设置模态框内容
                    const statusContainer = document.getElementById('cloudStatusDetails');
                    if (statusContainer) {
                        statusContainer.innerHTML = statusDetails;
                    }
                    
                    // 显示设置模态框
                    settingsModal.show();
        } else {
                    // 连接有问题，显示错误信息
                    const errorDetails = `
                        <div class="alert alert-danger">
                            <h5><i class="bi bi-cloud-slash"></i> 云同步连接问题</h5>
                            <p>${result.error || '无法连接到GitHub API'}</p>
                            <button id="retryCloudConnectBtn" class="btn btn-sm btn-primary mt-2">
                                <i class="bi bi-arrow-repeat"></i> 重试连接
                            </button>
                            <button id="showGitHubAuthBtn" class="btn btn-sm btn-secondary mt-2 ms-2">
                                <i class="bi bi-github"></i> 重新授权
                            </button>
                        </div>
                    `;
                    
                    // 更新设置模态框内容
                    const statusContainer = document.getElementById('cloudStatusDetails');
                    if (statusContainer) {
                        statusContainer.innerHTML = errorDetails;
                        
                        // 添加重试按钮事件
                        const retryBtn = document.getElementById('retryCloudConnectBtn');
                        if (retryBtn) {
                            retryBtn.addEventListener('click', function() {
                                retryBtn.disabled = true;
                                retryBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 连接中...';
                                
                                // 重新验证连接
                                CloudStorage.validateConnection().then(newResult => {
                                    if (newResult.success) {
                                        statusContainer.innerHTML = `
                                            <div class="alert alert-success">
                                                <h5><i class="bi bi-cloud-check"></i> 连接成功</h5>
                                                <p class="mb-0">已恢复与GitHub的连接: <strong>${newResult.user}</strong></p>
                                            </div>
                                        `;
                                        updateSyncStatus(true);
                                    } else {
                                        retryBtn.disabled = false;
                                        retryBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> 重试连接';
                                        showError('连接失败', newResult.error || '无法连接到GitHub API');
                                    }
                                });
                            });
                        }
                        
                        // 添加重新授权按钮事件
                        const authBtn = document.getElementById('showGitHubAuthBtn');
                        if (authBtn) {
                            authBtn.addEventListener('click', function() {
                                GitHubOAuth.requestGitHubAuthorization();
                            });
                        }
                    }
                    
                    // 显示设置模态框
                    settingsModal.show();
                }
            });
    } else {
            // 云同步未启用或未连接，显示设置选项
            logInfo('Event', '云同步未启用，显示设置选项');
            
            // 更新设置模态框中的内容
            populateSettingsModal();
            
            // 显示设置模态框
            settingsModal.show();
        }
    } catch (error) {
        logError('Event', '处理同步状态点击时出错', error);
        showError('无法处理请求', error.message);
    }
}

// 处理保存存储选项
function handleSaveStorageOptions() {
    try {
        logInfo('Storage', '开始处理存储选项...');
        const selectedOption = document.querySelector('input[name="storageOption"]:checked');
        
        if (!selectedOption) {
            logError('Storage', '未找到选中的存储选项');
            alert('请选择一个存储选项');
            return;
        }
        
        logInfo('Storage', `用户选择的存储选项: ${selectedOption.value}`);
        
        if (selectedOption.value === 'local') {
            forceLocalOnly = true;
            isCloudSyncEnabled = false;
            localStorage.setItem('easy_note_storage_setting', 'local');
            logInfo('Storage', '已设置为仅本地存储模式');
        } else if (selectedOption.value === 'firebase') {
            // 使用 Firebase 存储
            logInfo('Storage', '用户选择了 Firebase 存储');
            
            // 如果 FirebaseIntegration 模块存在，则使用它处理选择
            if (window.FirebaseIntegration) {
                const result = FirebaseIntegration.handleStorageSelection('firebase');
                if (result) {
                    forceLocalOnly = false;
                    isCloudSyncEnabled = true;
                    logInfo('Storage', '已设置为 Firebase 存储模式');
                }
            } else {
                logError('Storage', 'Firebase 集成模块未加载');
                alert('Firebase 集成模块未加载，请确保已引入相关脚本');
            }
        } else if (selectedOption.value === 'github') {
            forceLocalOnly = false;
            localStorage.setItem('easy_note_storage_setting', 'github');
            
            // 如果选择GitHub但没有OAuth授权，显示授权模态框
            if (!GitHubOAuth.hasValidOAuthToken()) {
                const githubTokenModal = document.getElementById('githubTokenModal');
                if (githubTokenModal) {
                    const modal = new bootstrap.Modal(githubTokenModal);
                    setTimeout(() => {
                        modal.show();
                    }, 500);
                    logInfo('Storage', '未通过GitHub OAuth授权，显示授权对话框');
                } else {
                    logError('Storage', '找不到GitHub授权模态框');
                    alert('无法显示GitHub授权界面，请刷新页面重试');
                }
            } else {
                // 使用最新的OAuth令牌
                GITHUB_TOKEN = GitHubOAuth.getOAuthToken();
                
                // 重新检查云连接
                logInfo('Storage', '正在检查GitHub连接...');
                checkCloudConnectivity();
            }
        } else {
            logWarning('Storage', `未知的存储选项: ${selectedOption.value}`);
        }
        
        updateSyncStatus(isCloudSyncEnabled);
        
        // 关闭模态框
        const storageOptionsModalEl = document.getElementById('storageOptionsModal');
        if (storageOptionsModalEl) {
            const modalInstance = bootstrap.Modal.getInstance(storageOptionsModalEl);
            if (modalInstance) {
                modalInstance.hide();
                logInfo('Storage', '已关闭存储选项对话框');
            } else {
                logWarning('Storage', '无法获取存储选项模态框实例');
            }
        } else {
            logWarning('Storage', '找不到存储选项模态框元素');
        }
    } catch (error) {
        logError('Storage', '处理存储选项时出错', error);
        alert('保存存储设置失败: ' + error.message);
    }
}

// 处理GitHub授权
function handleSaveGithubToken() {
    logInfo('Event', '点击了GitHub授权按钮');
    
    // 隐藏模态框
    const githubTokenModal = document.getElementById('githubTokenModal');
    if (githubTokenModal) {
        bootstrap.Modal.getInstance(githubTokenModal).hide();
    }
    
    // 启动GitHub OAuth授权流程
    showDebugAlert('正在跳转到GitHub授权页面...');
    setTimeout(() => {
        GitHubOAuth.initiateOAuthFlow();
    }, 500);
}

// 处理令牌诊断
async function handleTokenDebug() {
    const tokenInput = document.getElementById('githubToken');
    
    if (tokenInput) {
        let token = tokenInput.value.trim();
        
        if (!token) {
            alert('请先输入GitHub令牌再进行诊断');
            return;
        }
        
        // 处理令牌格式
        token = token.replace(/['"]/g, '').trim();
        
        // 显示诊断信息
        showDebugAlert('正在检查GitHub令牌，请稍候...');
        
        try {
            // 显示令牌类型信息
            let tokenType = "未知类型";
            let authPrefix = "未知";
            
            if (token.startsWith('github_pat_')) {
                tokenType = "Fine-grained Personal Access Token";
                authPrefix = "Bearer";
            } else if (token.startsWith('ghp_')) {
                tokenType = "Classic Personal Access Token";
                authPrefix = "token";
            } else {
                tokenType = "可能是自定义格式的令牌";
                authPrefix = "token";
            }
            
            logInfo('Token', `令牌诊断 - 检测到的令牌类型: ${tokenType}, 将使用${authPrefix}前缀`);
            
            // 创建诊断结果
            const diagResults = document.createElement('div');
            diagResults.innerHTML = `
                <h5>GitHub令牌诊断</h5>
                <div class="mb-3">
                    <strong>令牌类型:</strong> ${tokenType}<br>
                    <strong>认证前缀:</strong> ${authPrefix}<br>
                    <strong>令牌长度:</strong> ${token.length}字符<br>
                </div>
                <div class="alert alert-info">
                    正在验证令牌权限，请稍候...
                </div>
            `;
            
            // 显示诊断对话框
            const diagModal = createDiagResultModal();
            const diagBody = diagModal.querySelector('.modal-body');
            diagBody.innerHTML = '';
            diagBody.appendChild(diagResults);
            const bsModal = new bootstrap.Modal(diagModal);
            bsModal.show();
            
            // 先运行网络连接测试
            const networkResults = await diagnoseNetworkConnectivity();
            if (!networkResults.canReachAPI) {
                // 网络连接问题，无法继续测试令牌
                const statusDiv = diagResults.querySelector('.alert');
                statusDiv.className = 'alert alert-danger';
                statusDiv.innerHTML = `
                    <i class="bi bi-wifi-off"></i> <strong>网络连接问题</strong><br>
                    应用无法连接到GitHub API，无法验证令牌。<br>
                    <hr>
                    <div class="mt-2">
                        - GitHub网站: <span class="${networkResults.canReachGitHub ? 'text-success' : 'text-danger'}">${networkResults.canReachGitHub ? '✓ 可连接' : '✗ 无法连接'}</span><br>
                        - GitHub API: <span class="text-danger">✗ 无法连接</span><br>
                    </div>
                    <hr>
                    <div class="text-danger mt-2">
                        错误详情: ${networkResults.errors.join('<br>')}
                    </div>
                    <hr>
                    <div class="mt-2">
                        可能的原因:<br>
                        - 网络连接不稳定<br>
                        - 浏览器阻止了跨域请求<br>
                        - 防火墙或代理拦截了请求<br>
                        - GitHub API暂时不可用<br>
                        <br>
                        建议:<br>
                        - 检查您的网络连接<br>
                        - 尝试使用现代浏览器如Chrome或Edge<br>
                        - 暂时关闭浏览器扩展<br>
                        - 尝试使用隐私/无痕浏览模式<br>
                    </div>
                `;
                
                // 添加重试按钮
                const btnDiv = document.createElement('div');
                btnDiv.className = 'mt-3 text-center';
                btnDiv.innerHTML = `
                    <button class="btn btn-primary retry-btn">
                        <i class="bi bi-arrow-repeat"></i> 重新尝试网络连接
                    </button>
                `;
                diagResults.appendChild(btnDiv);
                
                // 添加重试按钮事件
                const retryBtn = btnDiv.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', function() {
                        bsModal.hide();
                        // 重新运行诊断
                        handleTokenDebug();
                    });
                }
                
                return;
            }
            
            // 网络连接正常，开始诊断令牌
            const results = await diagnoseGitHubToken(token);
            
            // 更新诊断结果
            const statusDiv = diagResults.querySelector('.alert');
            
            if (results.canAuthenticate && results.canCreateGist && results.canReadGist && results.canUpdateGist && results.canDeleteGist) {
                statusDiv.className = 'alert alert-success';
                statusDiv.innerHTML = `
                    <i class="bi bi-check-circle"></i> <strong>令牌验证成功!</strong><br>
                    - 基本认证: 成功<br>
                    - Gist权限: 成功<br>
                    - 用户名: ${results.userName}<br>
                    <hr>
                    <div class="mt-2">
                        <strong>详细权限检查:</strong><br>
                        - 创建Gist: ${results.canCreateGist ? '✓ 成功' : '✗ 失败'}<br>
                        - 读取Gist: ${results.canReadGist ? '✓ 成功' : '✗ 失败'}<br>
                        - 更新Gist: ${results.canUpdateGist ? '✓ 成功' : '✗ 失败'}<br>
                        - 删除Gist: ${results.canDeleteGist ? '✓ 成功' : '✗ 失败'}<br>
                    </div>
                `;
            } else if (results.canAuthenticate && !results.canCreateGist) {
                statusDiv.className = 'alert alert-warning';
                statusDiv.innerHTML = `
                    <i class="bi bi-exclamation-triangle"></i> <strong>令牌认证成功，但Gist权限验证失败</strong><br>
                    - 基本认证: 成功<br>
                    - Gist权限: <span class="text-danger">失败</span><br>
                    - 用户名: ${results.userName}<br>
                    <hr>
                    <div class="text-danger mt-2">
                        请确保在GitHub设置中为此令牌勾选了"gist"权限。<br>
                        <a href="https://github.com/settings/tokens" target="_blank" class="btn btn-sm btn-outline-danger mt-1">
                            <i class="bi bi-github"></i> 前往GitHub令牌设置
                        </a>
                    </div>
                `;
            } else if (!results.canAuthenticate) {
                statusDiv.className = 'alert alert-danger';
                
                // 检查是否是网络错误
                const hasNetworkError = results.errors.some(err => 
                    err.includes('Failed to fetch') || 
                    err.includes('Network Error') || 
                    err.includes('network') || 
                    err.includes('CORS') ||
                    err.includes('跨域')
                );
                
                if (hasNetworkError) {
                    statusDiv.innerHTML = `
                        <i class="bi bi-wifi-off"></i> <strong>网络连接问题</strong><br>
                        应用无法连接到GitHub API。<br>
                        <hr>
                        可能的原因:<br>
                        - 网络连接不稳定<br>
                        - 浏览器阻止了跨域请求<br>
                        - 防火墙或代理拦截了请求<br>
                        - GitHub API暂时不可用<br>
                        <hr>
                        <div class="text-danger mt-2">
                            错误详情: ${results.errors.join('<br>')}
                        </div>
                        <hr>
                        <div class="mt-2">
                            建议:<br>
                            - 检查您的网络连接<br>
                            - 尝试使用现代浏览器如Chrome或Edge<br>
                            - 暂时关闭浏览器扩展<br>
                            - 尝试使用隐私/无痕浏览模式<br>
                        </div>
                    `;
                } else {
                    statusDiv.innerHTML = `
                        <i class="bi bi-x-circle"></i> <strong>令牌认证失败</strong><br>
                        可能的原因:<br>
                        - 令牌已过期<br>
                        - 令牌已被吊销<br>
                        - 令牌格式不正确<br>
                        <hr>
                        <div class="text-danger mt-2">
                            ${results.errors.join('<br>')}
                        </div>
                    `;
                }
            } else {
                statusDiv.className = 'alert alert-warning';
                statusDiv.innerHTML = `
                    <i class="bi bi-exclamation-triangle"></i> <strong>令牌验证部分失败</strong><br>
                    - 基本认证: ${results.canAuthenticate ? '✓ 成功' : '✗ 失败'}<br>
                    - Gist权限: ${results.canCreateGist ? '✓ 成功' : '✗ 失败'}<br>
                    ${results.userName ? `- 用户名: ${results.userName}<br>` : ''}
                    <hr>
                    <div class="mt-2">
                        <strong>详细权限检查:</strong><br>
                        - 创建Gist: ${results.canCreateGist ? '✓ 成功' : '✗ 失败'}<br>
                        - 读取Gist: ${results.canReadGist ? '✓ 成功' : '✗ 失败'}<br>
                        - 更新Gist: ${results.canUpdateGist ? '✓ 成功' : '✗ 失败'}<br>
                        - 删除Gist: ${results.canDeleteGist ? '✓ 成功' : '✗ 失败'}<br>
                    </div>
                    <hr>
                    <div class="text-danger mt-2">
                        ${results.errors.join('<br>')}
                    </div>
                `;
            }
            
            // 添加使用此令牌的按钮
            if (results.canAuthenticate) {
                const btnDiv = document.createElement('div');
                btnDiv.className = 'mt-3 text-center';
                btnDiv.innerHTML = `
                    <button class="btn btn-primary use-token-btn">
                        <i class="bi bi-check2"></i> 使用此令牌
                    </button>
                `;
                diagResults.appendChild(btnDiv);
                
                // 添加使用令牌的事件
                const useTokenBtn = btnDiv.querySelector('.use-token-btn');
                if (useTokenBtn) {
                    useTokenBtn.addEventListener('click', function() {
                        if (!results.canCreateGist || !results.canUpdateGist) {
                            if (!confirm('这个令牌缺少完整的Gist操作权限，这可能导致部分功能不可用。确定要继续使用吗？')) {
                                return;
                            }
                        }
                        
                        // 保存令牌
                        localStorage.setItem('easy_note_github_token', token);
                        GITHUB_TOKEN = token;
                        
                        // 关闭诊断对话框
                        bootstrap.Modal.getInstance(diagModal).hide();
                        
                        // 关闭令牌设置对话框
                        const githubTokenModal = document.getElementById('githubTokenModal');
                        if (githubTokenModal) {
                            bootstrap.Modal.getInstance(githubTokenModal).hide();
                        }
                        
                        // 检查连接
                        checkCloudConnectivity();
                        
                        showDebugAlert('GitHub令牌已保存。正在尝试连接...');
                    });
                }
            }
        } catch (error) {
            logError('Token', '诊断GitHub令牌时出错', error);
            
            // 检查是否是网络错误
            if (error.message && (
                error.message.includes('fetch') || 
                error.message.includes('network') || 
                error.name === 'TypeError' || 
                error.name === 'NetworkError')) {
                // 显示网络错误对话框
                showError('网络连接问题', `
                    无法连接到GitHub API以验证令牌。
                    
                    可能的原因:
                    - 网络连接不稳定
                    - 浏览器阻止了跨域请求
                    - 防火墙或代理拦截了请求
                    - GitHub API暂时不可用
                    
                    错误详情: ${error.message}
                    
                    建议:
                    - 检查您的网络连接
                    - 尝试使用现代浏览器如Chrome或Edge
                    - 暂时关闭浏览器扩展
                    - 尝试使用隐私/无痕浏览模式
                `);
                
                // 添加网络诊断按钮
                const errorEl = document.getElementById('errorMessage');
                if (errorEl) {
                    const diagButton = document.createElement('button');
                    diagButton.className = 'btn btn-sm btn-info mt-2';
                    diagButton.innerText = '运行网络诊断';
                    diagButton.onclick = async () => {
                        // 手动调用网络诊断
                        handleNetworkError(error, "验证GitHub令牌");
                    };
                    
                    errorEl.appendChild(diagButton);
                }
            } else {
                showError('诊断GitHub令牌时出错', error.message);
            }
        }
    }
}

// 修复诊断函数，使其能够完整验证Gist权限
async function diagnoseGitHubToken(token) {
    const results = {
        validFormat: false,
        canAuthenticate: false,
        hasGistScope: false,
        canCreateGist: false,
        canReadGist: false,
        canUpdateGist: false,
        canDeleteGist: false,
        userName: null,
        errors: []
    };
    
    try {
        // 1. 检查令牌格式
        if (!token || token.length < 10) {
            results.errors.push('令牌格式无效，太短');
        } else {
            results.validFormat = true;
        }
        
        // 临时创建令牌格式的授权头
        function getTempAuthHeaders(includeContentType = false) {
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            // 根据令牌类型使用不同的前缀
            if (token.startsWith('github_pat_')) {
                headers['Authorization'] = `Bearer ${token}`;
            } else if (token.startsWith('ghp_')) {
                headers['Authorization'] = `token ${token}`;
            } else {
                headers['Authorization'] = `token ${token}`;
            }
            
            if (includeContentType) {
                headers['Content-Type'] = 'application/json';
            }
            
            // 添加Cache-Control头，防止缓存干扰
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            headers['Pragma'] = 'no-cache';
            
            return headers;
        }
        
        // 2. 检查基本认证
        try {
            const userOptions = createFetchOptions('GET', getTempAuthHeaders());
            const userResponse = await fetch(`${API_BASE_URL}/user`, userOptions);
            
            if (userResponse.ok) {
                results.canAuthenticate = true;
                const userData = await userResponse.json();
                results.userName = userData.login;
                logInfo('Debug', `认证成功，用户: ${userData.login}`);
            } else {
                let errorText = await userResponse.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.message) {
                        errorText = errorJson.message;
                    }
                } catch(e) {
                    // 如果不是JSON，保持原文本
                }
                
                results.errors.push(`认证失败: HTTP ${userResponse.status} - ${errorText}`);
                logError('Debug', '认证失败', errorText);
            }
        } catch (authError) {
            results.errors.push(`认证请求出错: ${authError.message}`);
            logError('Debug', '认证请求出错', authError);
        }
        
        // 3. 如果基本认证成功，检查Gist权限
        if (results.canAuthenticate) {
            try {
                // 尝试创建一个测试gist
                const gistBody = {
                    description: 'Easy Note Test Gist',
                    public: false,
                    files: {
                        'test.txt': {
                            content: 'This is a test gist to verify permissions.'
                        }
                    }
                };
                
                const createOptions = createFetchOptions('POST', getTempAuthHeaders(true), gistBody);
                const gistResponse = await fetch(`${API_BASE_URL}/gists`, createOptions);
                
                if (gistResponse.ok) {
                    results.canCreateGist = true;
                    results.hasGistScope = true;
                    
                    // 获取创建的gist ID并进行读取和更新测试
                    const gistData = await gistResponse.json();
                    logInfo('Debug', `测试Gist创建成功，ID: ${gistData.id}`);
                    
                    // 测试读取功能
                    try {
                        const readOptions = createFetchOptions('GET', getTempAuthHeaders());
                        const readResponse = await fetch(`${API_BASE_URL}/gists/${gistData.id}`, readOptions);
                        
                        if (readResponse.ok) {
                            results.canReadGist = true;
                            logInfo('Debug', '测试Gist读取成功');
                        } else {
                            results.errors.push(`无法读取Gist: HTTP ${readResponse.status}`);
                            logWarning('Debug', `读取测试Gist失败: ${readResponse.status}`);
                        }
                    } catch (readError) {
                        results.errors.push(`读取Gist出错: ${readError.message}`);
                    }
                    
                    // 测试更新功能
                    try {
                        const updateBody = {
                            description: 'Easy Note Test Gist (Updated)',
                            files: {
                                'test.txt': {
                                    content: 'This is an updated test gist.'
                                }
                            }
                        };
                        
                        const updateOptions = createFetchOptions('PATCH', getTempAuthHeaders(true), updateBody);
                        const updateResponse = await fetch(`${API_BASE_URL}/gists/${gistData.id}`, updateOptions);
                        
                        if (updateResponse.ok) {
                            results.canUpdateGist = true;
                            logInfo('Debug', '测试Gist更新成功');
                        } else {
                            results.errors.push(`无法更新Gist: HTTP ${updateResponse.status}`);
                            logWarning('Debug', `更新测试Gist失败: ${updateResponse.status}`);
                        }
                    } catch (updateError) {
                        results.errors.push(`更新Gist出错: ${updateError.message}`);
                    }
                    
                    // 清理测试gist
                    if (gistData && gistData.id) {
                        try {
                            const deleteOptions = createFetchOptions('DELETE', getTempAuthHeaders());
                            const deleteResponse = await fetch(`${API_BASE_URL}/gists/${gistData.id}`, deleteOptions);
                            
                            if (deleteResponse.ok) {
                                results.canDeleteGist = true;
                                logInfo('Debug', '测试Gist删除成功');
                            } else {
                                results.errors.push(`无法删除Gist: HTTP ${deleteResponse.status}`);
                                logWarning('Debug', `删除测试Gist失败: ${deleteResponse.status}`);
                            }
                        } catch (deleteError) {
                            results.errors.push(`删除Gist出错: ${deleteError.message}`);
                            logError('Debug', '删除测试Gist出错', deleteError);
                        }
                    }
                } else {
                    let errorText = await gistResponse.text();
                    try {
                        const errorJson = JSON.parse(errorText);
                        if (errorJson.message) {
                            errorText = errorJson.message;
                        }
                    } catch(e) {
                        // 如果不是JSON，保持原文本
                    }
                    
                    results.errors.push(`Gist创建失败: HTTP ${gistResponse.status} - ${errorText}`);
                    
                    if (gistResponse.status === 403) {
                        results.errors.push('令牌缺少gist权限，请在GitHub token设置中勾选gist权限');
                    }
                }
            } catch (gistError) {
                results.errors.push(`Gist权限检查出错: ${gistError.message}`);
            }
        }
        
        return results;
    } catch (error) {
        results.errors.push(`诊断过程出错: ${error.message}`);
        return results;
    }
}

// 创建诊断结果模态框
function createDiagResultModal() {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'diagResultModal';
    modalDiv.tabIndex = '-1';
    modalDiv.setAttribute('aria-labelledby', 'diagResultModalLabel');
    modalDiv.setAttribute('aria-hidden', 'true');
    
    modalDiv.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="diagResultModalLabel">诊断结果</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="diagResultContent">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">关闭</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    return modalDiv;
}

// 调试控制台功能
const debugConsoleBtn = document.getElementById('debugConsoleBtn');
const debugConsoleModal = document.getElementById('debugConsoleModal');
const consoleOutput = document.getElementById('consoleOutput');
const networkRequests = document.getElementById('networkRequests');
const localStorageData = document.getElementById('localStorageData');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');

// 初始化调试控制台
if (debugConsoleBtn && debugConsoleModal) {
    // 显示调试控制台
    debugConsoleBtn.addEventListener('click', function() {
        updateDebugConsole();
        const modal = new bootstrap.Modal(debugConsoleModal);
        modal.show();
    });
    
    // 清空控制台
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', function() {
            if (consoleOutput) {
                consoleOutput.innerHTML = '<div class="text-muted">控制台已清空</div>';
            }
            if (networkRequests) {
                networkRequests.innerHTML = '<div class="alert alert-info">网络请求将在发生时显示在这里</div>';
            }
        });
    }
    
    // 清空存储
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', function() {
            if (confirm('确定要清除所有本地存储数据吗？这将删除所有设置和本地笔记。')) {
                localStorage.clear();
                updateStorageDebug();
                alert('存储已清空');
            }
        });
    }
    
    // 重写console方法以捕获日志
    if (DEBUG_MODE && consoleOutput) {
        // 保存原始console方法
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        // 添加日志到调试控制台
        function addLogToConsole(type, args) {
            if (!consoleOutput) return;
            
            const logEntry = document.createElement('div');
            let style = '';
            let prefix = '';
            
            switch (type) {
                case 'error':
                    style = 'color: #F44336;';
                    prefix = '❌ ';
                    break;
                case 'warn':
                    style = 'color: #FF9800;';
                    prefix = '⚠️ ';
                    break;
                case 'info':
                    style = 'color: #2196F3;';
                    prefix = 'ℹ️ ';
                    break;
                default:
                    style = 'color: #fff;';
            }
            
            // 格式化消息
            let message = '';
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (typeof arg === 'object') {
                    try {
                        message += JSON.stringify(arg, null, 2) + ' ';
                    } catch (e) {
                        message += Object.prototype.toString.call(arg) + ' ';
                    }
                } else {
                    message += arg + ' ';
                }
            }
            
            logEntry.innerHTML = `<span style="${style}">${prefix}${message}</span>`;
            consoleOutput.appendChild(logEntry);
            
            // 自动滚动到底部
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
        
        // 重写console方法
        console.log = function() {
            addLogToConsole('log', arguments);
            originalConsole.log.apply(console, arguments);
        };
        
        console.error = function() {
            addLogToConsole('error', arguments);
            originalConsole.error.apply(console, arguments);
        };
        
        console.warn = function() {
            addLogToConsole('warn', arguments);
            originalConsole.warn.apply(console, arguments);
        };
        
        console.info = function() {
            addLogToConsole('info', arguments);
            originalConsole.info.apply(console, arguments);
        };
        
        // 添加网络请求记录
        function addNetworkRequest(method, url, status, success) {
            if (!networkRequests) return;
            
            // 清除初始提示
            if (networkRequests.querySelector('.alert-info')) {
                networkRequests.innerHTML = '';
            }
            
            const requestEntry = document.createElement('div');
            requestEntry.className = `alert alert-${success ? 'success' : 'danger'} alert-sm mb-2`;
            
            const statusClass = status < 300 ? 'text-success' : 'text-danger';
            
            requestEntry.innerHTML = `
                <div><strong>${method}</strong> ${url}</div>
                <div class="${statusClass}">状态: ${status}</div>
                <div class="text-muted small">${new Date().toLocaleTimeString()}</div>
            `;
            
            networkRequests.appendChild(requestEntry);
        }
        
        // 拦截fetch请求
        const originalFetch = window.fetch;
        window.fetch = function() {
            const method = arguments[1]?.method || 'GET';
            const url = arguments[0];
            
            // 记录请求
            console.log(`%c🌐 发送请求: ${method} ${url}`, 'color: #4CAF50;');
            
            return originalFetch.apply(this, arguments)
                .then(response => {
                    // 记录响应
                    const success = response.ok;
                    const status = response.status;
                    
                    console.log(`%c✅ 收到响应: ${method} ${url} (${status})`, 
                                success ? 'color: #4CAF50;' : 'color: #F44336;');
                    
                    addNetworkRequest(method, url, status, success);
                    
                    return response;
                })
                .catch(error => {
                    // 记录错误
                    console.error(`%c❌ 请求错误: ${method} ${url}`, 'color: #F44336;', error);
                    addNetworkRequest(method, url, 0, false);
                    
                    throw error;
                });
        };
    }
}

// 更新调试控制台内容
function updateDebugConsole() {
    updateStorageDebug();
}

// 更新存储调试信息
function updateStorageDebug() {
    if (localStorageData) {
        // 获取所有localStorage数据
        let storageContent = '';
        
        if (localStorage.length === 0) {
            storageContent = '<div class="text-muted">本地存储为空</div>';
        } else {
            storageContent = '{\n';
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                let value = localStorage.getItem(key);
                
                // 尝试格式化JSON
                try {
                    if (value.startsWith('{') || value.startsWith('[')) {
                        const parsed = JSON.parse(value);
                        value = JSON.stringify(parsed, null, 2);
                    }
                } catch (e) {
                    // 不是有效的JSON，保持原样
                }
                
                // 对于token，隐藏大部分内容
                if (key.includes('token') || key.includes('Token')) {
                    value = '"' + maskToken(value) + '"';
                }
                
                storageContent += `  "${key}": ${value}`;
                
                if (i < localStorage.length - 1) {
                    storageContent += ',\n';
                } else {
                    storageContent += '\n';
                }
            }
            storageContent += '}';
        }
        
        localStorageData.innerHTML = storageContent;
    }
}

// 检查URL变化的函数
function checkURLChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const noteIdInURL = urlParams.get('id');
    
    if (noteIdInURL !== currentNoteId) {
        logInfo('Navigation', `URL中的笔记ID (${noteIdInURL}) 与当前加载的笔记ID (${currentNoteId}) 不一致，重新加载`);
        
        if (noteIdInURL) {
            loadNote(noteIdInURL);
        } else {
            createNewNote();
        }
    }
}

// 监听popstate事件（浏览器前进后退按钮）
window.addEventListener('popstate', function(event) {
    logInfo('Navigation', '检测到浏览器导航事件', event.state);
    checkURLChange();
});

// 添加笔记ID显示功能
function updateNoteIdDisplay() {
    const noteIdValue = document.getElementById('noteIdValue');
    const noteIdDisplay = document.getElementById('noteIdDisplay');
    
    if (noteIdValue) {
        if (currentNoteId) {
            // 显示短版本的ID
            const shortId = currentNoteId.length > 8 ? 
                            currentNoteId.substring(0, 4) + '...' + currentNoteId.substring(currentNoteId.length - 4) : 
                            currentNoteId;
            
            noteIdValue.textContent = shortId;
            noteIdDisplay.title = `点击复制完整笔记ID: ${currentNoteId}`;
            noteIdDisplay.style.display = 'inline';
        } else {
            noteIdValue.textContent = '';
            noteIdDisplay.style.display = 'none';
        }
    }
}

// 后退按钮处理函数
function goBack() {
    logInfo('Navigation', '调用后退功能');
    
    try {
        // 检查浏览器历史记录中是否有前一页
        if (window.history.length > 1) {
            window.history.back();
            logInfo('Navigation', '使用浏览器历史返回上一页');
        } else {
            // 如果没有历史记录，创建一个新笔记
            logInfo('Navigation', '没有历史记录，创建新笔记');
            createNewNote();
        }
    } catch (error) {
        logError('Navigation', '后退操作失败', error);
        showError('后退操作失败', error.message);
        
        // 出错时也创建一个新笔记
        createNewNote();
    }
}

// 处理GitHub权限问题的函数
function handleGitHubPermissionIssue(errorMessage = null) {
    // 查看是否显示了GitHub Token设置对话框
    let tokenModalShown = false;
    if (document.getElementById('githubTokenModal')) {
        const githubTokenModal = new bootstrap.Modal(document.getElementById('githubTokenModal'));
        githubTokenModal.show();
        tokenModalShown = true;
    }
    
    // 构建提示信息
    const message = errorMessage || 'GitHub令牌权限问题';
    
    // 添加关于.netrc文件的提示
    const detailMessage = `
        ${message}
        
        可能的原因:
        1. 令牌可能无效或已过期
        2. 令牌权限不足，请确保勾选了"gist"权限
        3. 您的系统中可能存在.netrc或_netrc文件干扰请求认证
        
        解决方案:
        - 尝试创建一个新的GitHub访问令牌
        - 检查您的HOME目录(${navigator.platform.includes('Win') ? 'C:\\Users\\您的用户名' : '~/'}下是否存在.netrc或_netrc文件
        - 如果存在，请尝试重命名或删除这些文件
        - 在隐私/无痕模式下尝试使用此应用
    `;
    
    // 显示错误提示
    showError(message, detailMessage);
    
    // 如果没有显示Token设置对话框，添加诊断按钮
    if (!tokenModalShown) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            // 添加诊断按钮
            const diagButton = document.createElement('button');
            diagButton.className = 'btn btn-sm btn-info mt-2';
            diagButton.innerText = '运行令牌诊断';
            diagButton.onclick = () => {
                // 检查本地存储的token
                if (GITHUB_TOKEN) {
                    handleTokenDebug();
                } else {
                    // 如果没有token，显示设置
                    if (document.getElementById('githubTokenModal')) {
                        const githubTokenModal = new bootstrap.Modal(document.getElementById('githubTokenModal'));
                        githubTokenModal.show();
                    }
                }
            };
            
            // 添加设置按钮
            const settingsButton = document.createElement('button');
            settingsButton.className = 'btn btn-sm btn-primary mt-2 ms-2';
            settingsButton.innerText = '打开GitHub设置';
            settingsButton.onclick = () => {
                if (document.getElementById('githubTokenModal')) {
                    const githubTokenModal = new bootstrap.Modal(document.getElementById('githubTokenModal'));
                    githubTokenModal.show();
                }
            };
            
            errorEl.appendChild(diagButton);
            errorEl.appendChild(settingsButton);
        }
    }
}

// 添加createFetchOptions函数
function createFetchOptions(method, headers, body = null) {
    const options = {
        method: method,
        headers: headers,
        credentials: 'omit', // 禁用浏览器自动发送本地凭据
        mode: 'cors',        // 明确设置为CORS模式
        cache: 'no-store'    // 禁用缓存
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    return options;
}

// 使用代理解决CORS问题
function getProxiedUrl(url) {
    // 检查是否是GitHub API URL
    if (url.includes('api.github.com')) {
        // 使用备用API代理
        const proxyUrl = url.replace('https://api.github.com', 'https://gh-api.onrender.com/api/v3');
        logInfo('API', `使用代理URL: ${proxyUrl}`);
        return proxyUrl;
    }
    
    // 非GitHub API URL直接返回
    logInfo('API', `直接访问: ${url}`);
    return url;
}

// 修改fetchNoteFromCloud使用新的fetch选项
async function fetchNoteFromCloud(noteId) {
    try {
        logInfo('Fetch', `尝试从云端获取笔记: ${noteId}`);
        
        if (!noteId || typeof noteId !== 'string' || noteId.length < 5) {
            logError('Fetch', `无效的笔记ID: ${noteId}`);
            return null;
        }
        
        if (!GITHUB_TOKEN) {
            logError('Fetch', 'GitHub令牌未设置，无法获取云端笔记');
            return null;
        }
        
        // 确定API基础URL - 如果已经尝试主API并失败，自动切换到备用API
        let currentApiUrl = API_BASE_URL;
        const headers = getAuthHeaders();
        const apiUrl = `${currentApiUrl}/gists/${noteId}`;
        
        logInfo('API', `发送请求: GET ${apiUrl}`, {
            headers: '已隐藏敏感信息'
        });
        
        try {
            const options = createFetchOptions('GET', headers);
            // 使用代理URL
            const proxiedUrl = getProxiedUrl(apiUrl);
            const response = await fetch(proxiedUrl, options);
            
            logInfo('Fetch', `收到响应: ${response.status} ${response.statusText}`);
            
            if (response.status === 404) {
                logError('Fetch', `笔记未找到: ${noteId}`);
                showError('笔记未找到', '请检查笔记ID是否正确');
                return null;
            }
            
            if (response.status === 403) {
                logError('Fetch', `无权限访问笔记: ${noteId}`);
                handleGitHubPermissionIssue('GitHub令牌权限不足，无法读取笔记');
                return null;
            }
            
            if (!response.ok) {
                logError('Fetch', `获取笔记失败: ${response.status} ${response.statusText}`);
                showError('获取笔记失败', `HTTP错误: ${response.status} ${response.statusText}`);
                return null;
            }
            
            const data = await response.json();
            logInfo('Fetch', '从GitHub获取笔记成功');
            
            // 从Gist中提取笔记数据
            if (data.files && data.files['note.json']) {
                const noteContent = data.files['note.json'].content;
                try {
                    const parsedNote = JSON.parse(noteContent);
                    logInfo('Fetch', '笔记内容解析成功', parsedNote);
                    return parsedNote;
                } catch (parseError) {
                    logError('Fetch', '解析笔记JSON数据失败', parseError);
                    showError('笔记数据格式错误', '无法解析笔记内容');
                    return null;
                }
            } else {
                logError('Fetch', 'Gist中未找到note.json文件', data.files);
                showError('笔记格式不正确', '可能不是由Easy Note创建的Gist');
                return null;
            }
        } catch (fetchError) {
            // 处理网络错误，特别是CORS和网络连接问题
            logError('Fetch', '获取笔记网络请求失败', fetchError);
            
            // 检查是否是Failed to fetch错误（CORS或网络问题）
            if (fetchError.message && fetchError.message.includes('Failed to fetch')) {
                // 检查是否已经在使用备用API
                if (currentApiUrl !== 'https://gh-api.onrender.com/api/v3') {
                    // 自动切换到备用API并重试
                    logInfo('Fetch', '检测到CORS错误，自动切换到备用API并重试');
                    
                    // 保存设置
                    localStorage.setItem('easy_note_alt_api', 'true');
                    
                    // 更新全局变量
                    API_BASE_URL = 'https://gh-api.onrender.com/api/v3';
                    
                    // 使用新API再次尝试
                    const backupApiUrl = `${API_BASE_URL}/gists/${noteId}`;
                    try {
                        logInfo('API', `使用备用API重试: GET ${backupApiUrl}`);
                        
                        const backupOptions = createFetchOptions('GET', headers);
                        const proxiedBackupUrl = getProxiedUrl(backupApiUrl);
                        logInfo('API', `使用代理URL: ${proxiedBackupUrl.substring(0, 50)}...`);
                        const backupResponse = await fetch(proxiedBackupUrl, backupOptions);
                        
                        if (backupResponse.ok) {
                            const backupData = await backupResponse.json();
                            logInfo('Fetch', '使用备用API成功获取笔记');
                            
                            // 从Gist中提取笔记数据
                            if (backupData.files && backupData.files['note.json']) {
                                const noteContent = backupData.files['note.json'].content;
                                try {
                                    const parsedNote = JSON.parse(noteContent);
                                    logInfo('Fetch', '笔记内容解析成功', parsedNote);
                                    showDebugAlert('已自动切换到备用API，连接成功');
                                    return parsedNote;
                                } catch (parseError) {
                                    logError('Fetch', '解析笔记JSON数据失败', parseError);
                                    showError('笔记数据格式错误', '无法解析笔记内容');
                                    return null;
                                }
                            } else {
                                logError('Fetch', 'Gist中未找到note.json文件', backupData.files);
                                showError('笔记格式不正确', '可能不是由Easy Note创建的Gist');
                                return null;
                            }
                        } else {
                            logError('Fetch', `备用API请求失败: ${backupResponse.status}`);
                            showError('网络错误', `无法连接到GitHub API (${backupResponse.status})`);
                            return null;
                        }
                    } catch (backupError) {
                        logError('Fetch', '备用API请求也失败', backupError);
                        showError('网络错误', '无法连接到GitHub API，请检查网络连接或使用本地存储模式');
                        return null;
                    }
                } else {
                    // 已经是备用API，还是失败
                    showError('网络错误', 'CORS限制，无法连接到GitHub API，请使用本地存储模式');
                    return null;
                }
            } else {
                // 其他网络错误
                showError('网络错误', `无法获取笔记: ${fetchError.message}`);
                return null;
            }
        }
    } catch (error) {
        logError('Fetch', '获取云端笔记时出错', error);
        showError('出错了', `获取笔记失败: ${error.message}`);
        return null;
    }
}

// 删除JSONBin相关函数

// 修改saveNoteToCloud使用新的fetch选项
async function saveNoteToCloud(noteId, noteData) {
    logInfo('Save', `准备保存笔记到云端: ${noteId}`, noteData);
    
    if (!GITHUB_TOKEN) {
        logError('Save', 'GitHub令牌未设置，无法保存到云端');
        throw new Error('GitHub令牌未设置');
    }
    
    try {
        // 准备笔记数据
        const noteFileName = 'note.json';
        const files = {
            [noteFileName]: {
                content: JSON.stringify(noteData)
            }
        };
        
        let method, url, action;
        let currentApiUrl = API_BASE_URL;
        
        if (noteId) {
            // 检查Gist是否存在
            try {
                const checkUrl = `${currentApiUrl}/gists/${noteId}`;
                logInfo('API', `发送请求: GET ${checkUrl}`, {
                    headers: '已隐藏敏感信息'
                });
                
                const checkOptions = createFetchOptions('GET', getAuthHeaders());
                let checkResponse;
                
                try {
                    // 使用代理URL
                    const proxiedCheckUrl = getProxiedUrl(checkUrl);
                    logInfo('API', `使用代理URL: ${proxiedCheckUrl.substring(0, 50)}...`);
                    checkResponse = await fetch(proxiedCheckUrl, checkOptions);
                    logInfo('Save', `检查Gist存在性: ${checkResponse.status} ${checkResponse.statusText}`);
                } catch (checkFetchError) {
                    // 处理CORS或网络错误
                    if (checkFetchError.message && checkFetchError.message.includes('Failed to fetch')) {
                        // 如果不是备用API，尝试切换
                        if (currentApiUrl !== 'https://gh-api.onrender.com/api/v3') {
                            logInfo('Save', '检测到CORS错误，自动切换到备用API');
                            
                            // 保存设置并更新全局变量
                            localStorage.setItem('easy_note_alt_api', 'true');
                            API_BASE_URL = 'https://gh-api.onrender.com/api/v3';
                            currentApiUrl = API_BASE_URL;
                            
                            // 使用新API重试
                            const backupCheckUrl = `${currentApiUrl}/gists/${noteId}`;
                            logInfo('API', `使用备用API重试: GET ${backupCheckUrl}`);
                            
                            try {
                                const proxiedBackupUrl = getProxiedUrl(backupCheckUrl);
                                logInfo('API', `使用代理URL: ${proxiedBackupUrl.substring(0, 50)}...`);
                                checkResponse = await fetch(proxiedBackupUrl, checkOptions);
                                showDebugAlert('已自动切换到备用API，连接成功');
                            } catch (backupCheckError) {
                                // 备用API也失败，直接抛出异常
                                logError('Save', '备用API也失败', backupCheckError);
                                throw new Error(`备用API请求也失败: ${backupCheckError.message}`);
                            }
                        } else {
                            // 已经是备用API，还是失败
                            logError('Save', 'CORS限制，无法连接到GitHub API');
                            throw new Error('CORS限制，无法连接到GitHub API');
                        }
                    } else {
                        throw checkFetchError;
                    }
                }
                
                if (checkResponse.ok) {
                    // Gist存在，使用PATCH更新
                    method = 'PATCH';
                    url = `${currentApiUrl}/gists/${noteId}`;
                    action = '更新';
                } else if (checkResponse.status === 404) {
                    // Gist不存在，创建新的
                    method = 'POST';
                    url = `${currentApiUrl}/gists`;
                    action = '创建';
                } else if (checkResponse.status === 403) {
                    // 权限问题
                    logError('Save', '检查Gist权限问题', checkResponse.status);
                    handleGitHubPermissionIssue('无法验证Gist权限，请检查GitHub令牌');
                    throw new Error(`GitHub令牌权限问题: ${checkResponse.status}`);
                } else {
                    // 其他错误
                    logError('Save', `检查Gist错误: ${checkResponse.status}`, await checkResponse.text());
                    throw new Error(`检查Gist错误: ${checkResponse.status}`);
                }
            } catch (error) {
                logError('Save', '检查Gist时出错', error);
                throw error;
            }
        } else {
            // 无noteId，创建新Gist
            method = 'POST';
            url = `${currentApiUrl}/gists`;
            action = '创建';
        }
        
        // 发送保存请求
        logInfo('Save', `${action}云端笔记: ${method} ${url}`);
        
        logInfo('API', `发送请求: ${method} ${url}`, {
            headers: '已隐藏敏感信息',
            body: {
                description: `Easy Note - ${new Date().toISOString()}`,
                files: files
            }
        });
        
        const requestBody = {
            description: `Easy Note - ${new Date().toISOString()}`,
            public: false,
            files: files
        };
        
        const options = createFetchOptions(method, getAuthHeaders(true), requestBody);
        let response;
        
        try {
            // 使用代理URL
            const proxiedUrl = getProxiedUrl(url);
            logInfo('API', `使用代理URL: ${proxiedUrl.substring(0, 50)}...`);
            response = await fetch(proxiedUrl, options);
            logInfo('Save', `${action}笔记响应: ${response.status} ${response.statusText}`);
        } catch (saveFetchError) {
            // 处理CORS或网络错误
            if (saveFetchError.message && saveFetchError.message.includes('Failed to fetch')) {
                // 如果当前不是备用API，尝试切换
                if (currentApiUrl !== 'https://gh-api.onrender.com/api/v3' && method === 'POST') {
                    logInfo('Save', '保存时检测到CORS错误，自动切换到备用API');
                    
                    // 更新API URL
                    localStorage.setItem('easy_note_alt_api', 'true');
                    API_BASE_URL = 'https://gh-api.onrender.com/api/v3';
                    
                    // 使用备用API重试
                    const backupUrl = method === 'POST' 
                        ? `${API_BASE_URL}/gists` 
                        : `${API_BASE_URL}/gists/${noteId}`;
                    
                    logInfo('API', `使用备用API重试: ${method} ${backupUrl}`);
                    
                    try {
                        const proxiedBackupUrl = getProxiedUrl(backupUrl);
                        logInfo('API', `使用代理URL: ${proxiedBackupUrl.substring(0, 50)}...`);
                        response = await fetch(proxiedBackupUrl, options);
                        showDebugAlert('已自动切换到备用API，保存成功');
                    } catch (backupSaveError) {
                        throw new Error(`备用API保存也失败: ${backupSaveError.message}`);
                    }
                } else {
                    throw new Error('由于CORS限制，无法保存到GitHub。请尝试使用备用API或检查网络连接。');
                }
            } else {
                throw saveFetchError;
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            logError('Save', `${action}笔记失败: ${response.status}`, errorText);
            
            if (response.status === 403) {
                handleGitHubPermissionIssue(`无法${action}Gist: HTTP 403`);
            }
            
            throw new Error(`${action}笔记失败: HTTP ${response.status}`);
        }
        
        const result = await response.json();
        logInfo('Save', `${action}笔记成功，Gist ID: ${result.id}`);
        
        return result.id;
    } catch (error) {
        logError('Save', '保存笔记到云端时出错', error);
        throw error;
    }
}

// 删除JSONBin相关函数

// 修改createNewNote使用新的fetch选项
async function createNewNote() {
    try {
        logInfo('Create', '开始创建新笔记');
        
        // 生成唯一ID
        const noteId = generateUniqueId();
        
        // 创建笔记数据
            const noteData = {
                content: '',
                lastSaved: new Date().toISOString(),
                encrypted: false
            };
        
        // 设置当前笔记ID
        currentNoteId = noteId;
                updateURL();
                updateNoteIdDisplay();
        
        // 清除编辑器内容
        if (noteContent) {
                noteContent.value = '';
                noteContent.removeAttribute('disabled');
        }
        
        // 重置加密状态
        isEncrypted = false;
        if (lockBtn) {
            lockBtn.innerHTML = '<i class="bi bi-lock"></i>';
            lockBtn.title = '加密笔记';
        }
        
        // 输出调试信息
        logInfo('Create', `创建新笔记: ${noteId}`);
                
                // 保存到本地存储
        const localKey = `note_${noteId}`;
                localStorage.setItem(localKey, JSON.stringify(noteData));
        
        // 更新上次保存时间
        lastSaved = new Date();
        updateLastSavedTime();
        updateNoteStatus();
        
        // 尝试保存到云端
        if (window.CloudStorage && CloudStorage.isEnabled() && GitHubOAuth.hasValidOAuthToken()) {
            try {
                const result = await CloudStorage.createNote(noteData);
                if (result.success) {
                    // 如果云端ID不同于本地ID，更新ID
                    if (result.noteId !== noteId) {
                        logInfo('Create', `云笔记ID不同，更新ID: ${noteId} -> ${result.noteId}`);
                        // 保存旧数据到新ID
                        localStorage.setItem(`note_${result.noteId}`, JSON.stringify(noteData));
                        // 删除旧数据
                        localStorage.removeItem(`note_${noteId}`);
                        // 更新当前ID
                        currentNoteId = result.noteId;
            updateURL();
            updateNoteIdDisplay();
                    }
                    logInfo('Create', '笔记保存到云端成功');
                } else {
                    throw new Error(result.error || '未知错误');
                }
            } catch (error) {
                logError('Create', '创建笔记时出错', error);
                showError('创建笔记时出错，已切换到本地模式', error.message);
        }
    } else {
        logInfo('Create', '本地模式，创建本地笔记');
        }
        
        return noteId;
    } catch (error) {
        logError('Create', '创建笔记时出错', error);
        showError('创建笔记失败', error.message);
        throw error;
    }
}

// 修改checkCloudConnectivity使用新的fetch选项
async function checkCloudConnectivity() {
    logInfo('Cloud', '检查GitHub连接...');
    
    if (!GITHUB_TOKEN) {
        logError('Cloud', 'GitHub令牌未设置，无法检查连接');
        isCloudSyncEnabled = false;
        updateSyncStatus(false);
        return false;
    }
    
    try {
        logInfo('Cloud', '使用GitHub API检查用户信息');
        const options = createFetchOptions('GET', getAuthHeaders());
        const response = await fetch(`${API_BASE_URL}/user`, options);
        
        logInfo('Cloud', `GitHub API响应状态: ${response.status}`);
        
        if (response.ok) {
            const userData = await response.json();
            logInfo('Cloud', `GitHub云存储连接成功! 用户: ${userData.login}`);
            isCloudSyncEnabled = true;
            updateSyncStatus(true);
            return true;
        } else {
            const errorText = await response.text();
            logError('Cloud', `GitHub连接检查失败，状态码: ${response.status}`, errorText);
            
            // 检查是否是令牌问题
            if (response.status === 401) {
                handleGitHubPermissionIssue("GitHub令牌无效或已过期");
            } else if (response.status === 403) {
                handleGitHubPermissionIssue("GitHub令牌权限不足");
            } else {
                showError(`GitHub连接失败: ${response.status}`);
            }
            
            isCloudSyncEnabled = false;
            updateSyncStatus(false);
            return false;
        }
    } catch (error) {
        logError('Cloud', 'GitHub连接检查过程中出错', error);
        showError('连接GitHub时出错', error.message);
        isCloudSyncEnabled = false;
        updateSyncStatus(false);
        return false;
    }
}

// 应用初始化函数
function init() {
    try {
        logInfo('Init', '应用初始化开始');
        
        // 初始化DOM引用
        initDOMReferences();
        
        // 初始化模态框
        initModals();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 设置自动保存定时器
        setInterval(function() {
            if (currentNoteId && noteContent && !noteContent.disabled && noteContent.value.length > 0) {
                saveNote();
            }
        }, 30000); // 30秒自动保存
        
        // 初始化存储提供商
        initializeStorageProvider();
        
        // 检查GitHub OAuth回调
        if (window.GitHubOAuth && GitHubOAuth.initialize()) {
            // OAuth处理中，等待完成
            logInfo('Init', 'OAuth回调处理中，不加载笔记');
            return;
        }
        
        // 解析URL参数获取笔记ID
        const urlParams = new URLSearchParams(window.location.search);
        const noteId = urlParams.get('id');
        
        if (noteId) {
            // 如果URL中有笔记ID，加载该笔记
            logInfo('Init', `正在加载笔记: ${noteId}`);
            loadNote(noteId);
                        } else {
            // 如果URL中没有笔记ID，创建新笔记
            logInfo('Init', '未指定笔记ID，创建新笔记');
                    createNewNote();
        }
        
        // 更新同步状态显示
        updateSyncStatus();
        
        // 周期性检查URL变化
        setInterval(checkURLChange, 1000);
        
        logInfo('Init', '应用初始化完成');
    } catch (error) {
        logError('Init', '应用初始化失败', error);
        alert(`初始化失败: ${error.message}\n请刷新页面重试。`);
    }
}

// 初始化存储提供商
function initializeStorageProvider() {
    try {
        // 检查存储提供商设置
        const storageProvider = localStorage.getItem('easy_note_storage_provider');
        logInfo('Storage', `当前存储提供商: ${storageProvider || '未设置'}`);
        
        // 如果选择了Firebase，初始化Firebase集成
        if (storageProvider === 'firebase' && window.FirebaseIntegration) {
            logInfo('Storage', '初始化Firebase集成');
            FirebaseIntegration.initialize();
        }
    } catch (error) {
        logError('Storage', '初始化存储提供商时出错', error);
    }
}

// 验证GitHub令牌函数
async function validateGithubToken(token) {
    try {
        logInfo('Token', `开始验证GitHub令牌: ${maskToken(token)}`);
        
        // 检查令牌是否为空
        if (!token || token.length < 30) {
            logError('Token', '令牌无效: 令牌长度不足');
            return false;
        }
        
        // 使用authenticateWithGitHub函数验证令牌
        const authResult = await authenticateWithGitHub(token);
        
        if (authResult.success) {
            logInfo('Token', `令牌验证成功: ${authResult.user.login}`);
            return true;
        } else {
            logError('Token', `令牌验证失败: ${authResult.error}`);
            
            // 检查特定错误类型并显示更友好的错误信息
            if (authResult.isFailedToFetch) {
                // 特殊处理Failed to fetch错误
                handleFailedToFetchError();
            } else if (authResult.error.includes('401')) {
                showError('GitHub令牌无效', '提供的令牌无效或已过期。请创建新的个人访问令牌。');
            } else if (authResult.error.includes('403')) {
                showError('GitHub令牌权限不足', '此令牌没有所需权限。确保令牌具有gist权限。');
            } else {
                showError('验证GitHub令牌失败', authResult.error);
            }
            
            return false;
        }
    } catch (error) {
        logError('Token', '验证过程中发生错误', error);
        
        if (error.message && error.message.includes('Failed to fetch')) {
            handleFailedToFetchError();
        } else {
            showError('验证GitHub令牌时出错', error.message);
        }
        
        return false;
    }
}

// 用于显示令牌部分字符并掩盖其余部分的辅助函数
function maskToken(token) {
    if (!token) return '';
    if (token.length <= 10) return '***';
    
    const start = token.substring(0, 4);
    const end = token.substring(token.length - 4);
    return `${start}...${end}`;
}

// 填充设置模态框内容
function populateSettingsModal() {
    try {
        logInfo('UI', '填充设置模态框内容');
        
        // 获取容器
        const cloudStatusDetails = document.getElementById('cloudStatusDetails');
        if (!cloudStatusDetails) {
            logError('UI', '找不到cloudStatusDetails容器');
            return;
        }
        
        // 检查是否已有OAuth令牌
        if (window.GitHubOAuth && GitHubOAuth.hasValidOAuthToken()) {
            cloudStatusDetails.innerHTML = `
                <div class="alert alert-warning">
                    <h5><i class="bi bi-cloud"></i> 云同步已授权但未启用</h5>
                    <p>您已通过GitHub授权，但云同步功能未启用。</p>
                    <div class="form-check form-switch mt-3">
                        <input class="form-check-input" type="checkbox" id="cloudSyncToggle">
                        <label class="form-check-label" for="cloudSyncToggle">启用云同步</label>
                    </div>
                </div>
            `;
            
            // 设置开关状态
            setTimeout(() => {
                const toggle = document.getElementById('cloudSyncToggle');
                if (toggle) {
                    toggle.checked = localStorage.getItem('easy_note_cloud_sync') === 'true';
                    
                    // 添加事件监听器
                    toggle.addEventListener('change', function() {
                        localStorage.setItem('easy_note_cloud_sync', this.checked ? 'true' : 'false');
                        logInfo('Settings', `云同步设置已更改: ${this.checked ? '启用' : '禁用'}`);
                        
                        // 更新UI
                        updateSyncStatus();
                        
                        // 显示通知
                        showDebugAlert(`云同步已${this.checked ? '启用' : '禁用'}`);
                    });
                }
            }, 100);
    } else {
            // 未授权，显示GitHub授权选项
            cloudStatusDetails.innerHTML = `
                <div class="alert alert-info">
                    <h5><i class="bi bi-cloud-upload"></i> 设置云同步</h5>
                    <p>云同步功能允许您在不同设备之间同步笔记内容。笔记内容将安全地存储在您的GitHub账户中。</p>
                    <button id="startGitHubAuthBtn" class="btn btn-primary mt-2">
                        <i class="bi bi-github"></i> 使用GitHub授权
                    </button>
                    
                    <div class="mt-3 small text-muted">
                        <p><strong>隐私说明:</strong> 所有数据都存储在您自己的GitHub账号中，我们不会获取或存储您的数据。授权仅用于访问Gist API。</p>
                    </div>
                </div>
            `;
            
            // 添加授权按钮事件
            setTimeout(() => {
                const authBtn = document.getElementById('startGitHubAuthBtn');
                if (authBtn) {
                    authBtn.addEventListener('click', function() {
                        GitHubOAuth.requestGitHubAuthorization();
                    });
                }
            }, 100);
        }
    } catch (error) {
        logError('UI', '填充设置模态框出错', error);
    }
}

// 更新云状态显示
function updateCloudStatusDisplay() {
    const indicator = document.getElementById('cloudStatusIndicator');
    const tooltip = document.getElementById('cloudStatusTooltip');
    
    if (!isCloudStorageEnabled()) {
        // 本地模式
        indicator.className = 'status-indicator local-mode';
        tooltip.textContent = '本地模式 (仅保存到本设备)';
        return;
    }
    
    // 检查OAuth授权状态
    if (!GitHubOAuth.hasValidOAuthToken()) {
        // 未授权
        indicator.className = 'status-indicator disconnected';
        tooltip.textContent = '未连接到GitHub (需要授权)';
        return;
    }
    
    // 更新GITHUB_TOKEN以确保使用最新的OAuth令牌
    GITHUB_TOKEN = GitHubOAuth.getOAuthToken();
    
    // 默认为"正在检查连接..."状态
    indicator.className = 'status-indicator checking';
    tooltip.textContent = '正在检查GitHub连接...';
    
    // 执行实际的连接检查
    checkCloudConnectivity().catch(error => {
        logError('Cloud', '检查云连接出错', error);
    });
}

// 判断是否启用云存储
function isCloudStorageEnabled() {
    // 如果URL参数强制本地模式，直接返回false
    if (forceLocalOnly) return false;
    
    // 检查是否有有效的OAuth令牌
    if (!GitHubOAuth.hasValidOAuthToken()) {
        logInfo('Storage', '未找到有效的OAuth令牌，无法使用云存储');
        return false;
    }
    
    // 从本地存储读取用户设置
    const cloudEnabled = localStorage.getItem('easy_note_cloud_sync') === 'true';
    if (cloudEnabled) {
        // 确保GITHUB_TOKEN被正确设置
        if (GitHubOAuth.hasValidOAuthToken() && !GITHUB_TOKEN) {
            GITHUB_TOKEN = GitHubOAuth.getOAuthToken();
            logInfo('Storage', '更新了GITHUB_TOKEN');
        }
    }
    
    return cloudEnabled;
}

// 更新同步状态显示
function updateSyncStatus(isConnected = null) {
    if (!syncStatusEl) return;
    
    try {
        // 检查是否启用云同步
        if (window.CloudStorage && window.GitHubOAuth && CloudStorage.isEnabled() && GitHubOAuth.hasValidOAuthToken()) {
            // 如果未指定连接状态，默认为已连接
            if (isConnected === null || isConnected === true) {
                syncStatusEl.innerHTML = '<i class="bi bi-cloud-check"></i> 云同步已启用';
                syncStatusEl.classList.remove('text-warning', 'text-danger');
                syncStatusEl.classList.add('text-success');
                syncStatusEl.title = '点击查看云同步状态';
            } else {
                // 有连接问题
                syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> 云同步连接错误';
                syncStatusEl.classList.remove('text-success');
                syncStatusEl.classList.add('text-danger');
                syncStatusEl.title = '点击尝试重新连接';
            }
        } else {
            // 未启用云同步
            syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> 本地模式';
            syncStatusEl.classList.remove('text-success', 'text-danger');
            syncStatusEl.classList.add('text-warning');
            syncStatusEl.title = '点击设置云同步';
        }
    } catch (error) {
        logError('UI', '更新同步状态显示失败', error);
    }
}