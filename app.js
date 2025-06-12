// 重构应用程序初始化代码，确保只在一个地方进行初始化
// 全局变量和DOM元素引用
let API_BASE_URL = 'https://api.github.com';
// 添加CORS代理URL选项
const CORS_PROXY_URL = 'https://corsproxy.io/?';
let USE_CORS_PROXY = true; // 默认使用CORS代理
const DEBUG_MODE = true; // 启用详细日志
let GITHUB_TOKEN = localStorage.getItem('easy_note_github_token') || null;

// 检查是否使用备用API
if (localStorage.getItem('easy_note_alt_api') === 'true') {
    // 这是一个GitHub API的替代端点
    API_BASE_URL = 'https://gh-api.onrender.com/api/v3';
    console.log('使用备用API端点:', API_BASE_URL);
}

// 创建GitHub API授权头部函数
function getAuthHeaders(includeContentType = false) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    
    if (!GITHUB_TOKEN) {
        console.error('尝试创建授权头部但GitHub令牌未设置');
        return headers;
    }
    
    // 根据令牌类型使用不同的前缀
    if (GITHUB_TOKEN.startsWith('github_pat_')) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    } else if (GITHUB_TOKEN.startsWith('ghp_')) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    } else {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
    
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
        console.error('初始化应用时出错:', error);
        alert('初始化应用失败，请刷新页面重试: ' + error.message);
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

        // 令牌诊断按钮
        if (tokenDebugBtn) {
            tokenDebugBtn.addEventListener('click', async function() {
                logInfo('Event', '点击了令牌诊断按钮');
                handleTokenDebug();
            });
        }

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
    if (!forceLocalOnly) {
        if (!GITHUB_TOKEN) {
            // 显示GitHub令牌设置模态框
            const githubTokenModal = document.getElementById('githubTokenModal');
            if (githubTokenModal) {
                const modal = new bootstrap.Modal(githubTokenModal);
                modal.show();
            }
        } else if (!isCloudSyncEnabled) {
            checkCloudConnectivity();
            alert('正在尝试重新连接GitHub...');
        } else {
            // 如果已连接，点击显示存储选项模态框
            if (storageOptionsModal) storageOptionsModal.show();
        }
    } else {
        // 如果是强制本地模式，点击显示存储选项模态框
        if (storageOptionsModal) storageOptionsModal.show();
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
        } else if (selectedOption.value === 'github') {
            forceLocalOnly = false;
            localStorage.setItem('easy_note_storage_setting', 'github');
            
            // 如果选择GitHub但没有令牌，显示令牌设置模态框
            if (!GITHUB_TOKEN) {
                const githubTokenModal = document.getElementById('githubTokenModal');
                if (githubTokenModal) {
                    const modal = new bootstrap.Modal(githubTokenModal);
                    setTimeout(() => {
                        modal.show();
                    }, 500);
                    logInfo('Storage', '未设置GitHub令牌，显示令牌设置对话框');
                } else {
                    logError('Storage', '找不到GitHub令牌模态框');
                    alert('无法显示GitHub令牌设置界面，请刷新页面重试');
                }
            } else {
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

// 处理保存GitHub令牌
function handleSaveGithubToken() {
    const tokenInput = document.getElementById('githubToken');
    
    if (tokenInput) {
        let token = tokenInput.value.trim();
        
        if (token) {
            // 处理令牌格式，移除可能的引号或空格
            token = token.replace(/['"]/g, '').trim();
            
            logInfo('Token', `准备验证令牌 (${maskToken(token)})`);
            
            // 先进行验证
            validateGithubToken(token)
                .then(valid => {
                    if (valid) {
                        // 验证成功，保存令牌
                        localStorage.setItem('easy_note_github_token', token);
                        GITHUB_TOKEN = token;
                        
                        // 隐藏模态框
                        const githubTokenModal = document.getElementById('githubTokenModal');
                        if (githubTokenModal) {
                            bootstrap.Modal.getInstance(githubTokenModal).hide();
                        }
                        
                        // 检查连接
                        checkCloudConnectivity();
                        
                        showDebugAlert('GitHub令牌已保存并验证成功。正在尝试连接...');
                    } else {
                        // 验证失败
                        showError('GitHub令牌验证失败，请检查是否有正确的gist权限');
                    }
                })
                .catch(error => {
                    logError('Token', '验证GitHub令牌时出错', error);
                    showError('验证GitHub令牌时出错', error.message);
                });
        } else {
            alert('请输入有效的GitHub令牌');
        }
    }
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

// 使用CORS代理处理URL
function getProxiedUrl(url) {
    // 如果不是GitHub API URL或已经关闭了CORS代理，直接返回
    if (!USE_CORS_PROXY || (!url.includes('api.github.com') && !url.includes('gh-api.onrender.com'))) {
        return url;
    }
    
    // 对URL进行编码并添加代理前缀
    return `${CORS_PROXY_URL}${encodeURIComponent(url)}`;
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
            logInfo('API', `使用代理URL: ${proxiedUrl.substring(0, 50)}...`);
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
    logInfo('Create', '开始创建新笔记');
    noteContent.value = '';
    noteContent.setAttribute('disabled', 'true');
    syncStatusEl.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在创建云端笔记...';
    updateNoteStatus();
    lastSavedEl.textContent = '上次保存: 未保存';
    isEncrypted = false;
    lastSaved = null;
    currentNoteId = '';
    console.log('[createNewNote] isCloudSyncEnabled:', isCloudSyncEnabled, 'forceLocalOnly:', forceLocalOnly, 'GITHUB_TOKEN:', !!GITHUB_TOKEN);
    // 先创建一个空Gist
    if (isCloudSyncEnabled && !forceLocalOnly && GITHUB_TOKEN) {
        try {
            const noteData = {
                content: '',
                lastSaved: new Date().toISOString(),
                encrypted: false
            };
            const noteFileName = 'note.json';
            const files = {
                [noteFileName]: {
                    content: JSON.stringify(noteData)
                }
            };
            
            const requestBody = {
                description: `Easy Note - ${new Date().toISOString()}`,
                public: false,
                files: files
            };
            
            console.log('[createNewNote] POST /gists', files);
            const options = createFetchOptions('POST', getAuthHeaders(), requestBody);
            const response = await fetch(`${API_BASE_URL}/gists`, options);
            
            console.log('[createNewNote] POST /gists response', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('[createNewNote] Gist created:', result.id);
                currentNoteId = result.id;
                
                // 创建成功，更新界面
                updateURL();
                updateNoteIdDisplay();
                updateSyncStatus(true);
                
                // 保存到本地存储
                const localKey = `note_${currentNoteId}`;
                localStorage.setItem(localKey, JSON.stringify(noteData));
                
                noteContent.value = '';
                noteContent.removeAttribute('disabled');
                syncStatusEl.innerHTML = '<i class="bi bi-cloud-check"></i> 云同步已启用';
                noteContent.focus();
                
                logInfo('Create', `创建新笔记成功，ID: ${currentNoteId}`);
            } else {
                console.error('[createNewNote] Failed to create gist:', response.status);
                logError('Create', `创建新笔记失败: ${response.status}`);
                
                if (response.status === 403) {
                    handleGitHubPermissionIssue('GitHub令牌权限不足，无法创建笔记');
                } else {
                    showError(`创建笔记失败: ${response.status} ${response.statusText}`);
                }
                
                // 失败，降级为本地模式
                forceLocalOnly = true;
                isCloudSyncEnabled = false;
                updateSyncStatus(false);
                
                // 生成本地ID
                currentNoteId = generateUniqueId();
                updateURL();
                updateNoteIdDisplay();
                
                // 创建本地笔记
                noteContent.value = '';
                noteContent.removeAttribute('disabled');
                lastSaved = null;
                
                // 保存到本地存储
                const localKey = `note_${currentNoteId}`;
                localStorage.setItem(localKey, JSON.stringify(noteData));
            }
        } catch (error) {
            console.error('[createNewNote] Error:', error);
            logError('Create', '创建笔记时出错', error);
            showError('创建笔记时出错，已切换到本地模式', error.message);
            
            // 出错，降级为本地模式
            forceLocalOnly = true;
            isCloudSyncEnabled = false;
            updateSyncStatus(false);
            
            // 生成本地ID
            currentNoteId = generateUniqueId();
            updateURL();
            updateNoteIdDisplay();
            
            // 创建本地笔记
            noteContent.value = '';
            noteContent.removeAttribute('disabled');
            lastSaved = null;
            
            // 保存到本地存储
            const noteData = {
                content: '',
                lastSaved: new Date().toISOString(),
                encrypted: false
            };
            const localKey = `note_${currentNoteId}`;
            localStorage.setItem(localKey, JSON.stringify(noteData));
        }
    } else {
        logInfo('Create', '本地模式，创建本地笔记');
        // 本地模式，不创建Gist
        currentNoteId = generateUniqueId();
        
        updateURL();
        updateNoteIdDisplay();
        noteContent.value = '';
        noteContent.removeAttribute('disabled');
        syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> 本地模式';
        noteContent.focus();
        
        // 保存到本地存储
        const noteData = {
            content: '',
            lastSaved: new Date().toISOString(),
            encrypted: false
        };
        const localKey = `note_${currentNoteId}`;
        localStorage.setItem(localKey, JSON.stringify(noteData));
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

// 初始化应用
function init() {
    try {
        logInfo('Init', '开始初始化应用...');
        
        // 读取存储设置
        const urlParams = new URLSearchParams(window.location.search);
        const localModeParam = urlParams.get('local');
        
        // 如果URL参数中指定了local=true，强制使用本地模式
        if (localModeParam === 'true') {
            forceLocalOnly = true;
            isCloudSyncEnabled = false;
            logInfo('Storage', '从URL参数检测到本地模式请求，启用仅本地模式（移动测试模式）');
            localStorage.setItem('easy_note_storage_setting', 'local'); // 保存设置
            // 立即更新UI状态为移动测试模式
            updateSyncStatus(false);
        } else {
            // 否则读取本地存储中的设置
            const storageSetting = localStorage.getItem('easy_note_storage_setting');
            if (storageSetting === 'local') {
                forceLocalOnly = true;
                isCloudSyncEnabled = false;
                logInfo('Storage', '从本地存储读取设置: 仅本地模式');
            } else {
                forceLocalOnly = false;
                // 稍后会在checkCloudConnectivity中设置isCloudSyncEnabled
                logInfo('Storage', '从本地存储读取设置: 云同步模式');
            }
        }
        
        // 检查URL参数中是否有noteId
        const noteIdInURL = urlParams.get('id');
        
        // 使用新的异步方式处理初始化
        (async function() {
            try {
                // 如果不是URL强制本地模式且没有设置forceLocalOnly，才检查云连接
                const isUrlForcedLocalMode = localModeParam === 'true';
                
                if (!forceLocalOnly && !isUrlForcedLocalMode && GITHUB_TOKEN) {
                    // 先更新同步状态为检查中
                    if (syncStatusEl) {
                        syncStatusEl.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在检查GitHub连接...';
                    }
                    
                    // 在后台检查云连接，不阻塞主流程
                    checkCloudConnectivity().catch(error => {
                        logError('Init', '检查云连接出错', error);
                    });
                } else {
                    // 已经在前面更新过URL强制本地模式的状态，这里只处理非URL强制的本地模式
                    if (!isUrlForcedLocalMode) {
                        updateSyncStatus(false);
                    }
                }
                
                // 加载或创建笔记
                if (noteIdInURL) {
                    logInfo('Init', `从URL参数中检测到笔记ID: ${noteIdInURL}`);
                    // 尝试加载笔记
                    loadNote(noteIdInURL);
                } else {
                    logInfo('Init', '未检测到笔记ID，将创建新笔记');
                    // 创建新笔记
                    createNewNote();
                }
            } catch (asyncError) {
                logError('Init', '异步初始化过程出错', asyncError);
                showError('初始化过程出错', asyncError.message);
                
                // 出错时也创建一个新笔记
                createNewNote();
            }
        })();
        
        // 添加笔记内容变更监听
        if (noteContent) {
            noteContent.addEventListener('input', function() {
                // 如果距离上次保存超过2秒，标记为未保存
                if (!lastSaved || new Date() - lastSaved > 2000) {
                    if (lastSavedEl) {
                        lastSavedEl.textContent = '上次保存: 未保存';
                        lastSavedEl.classList.add('text-danger');
                    }
                }
                
                // 如果笔记内容有变更，启动自动保存计时器
                if (noteContent.value && !autoSaveTimer) {
                    autoSaveTimer = setTimeout(saveNote, 2000);
                }
            });
        }
        
        logInfo('Init', '应用初始化完成');
    } catch (error) {
        logError('Init', '应用初始化失败', error);
        throw error; // 重新抛出错误以便主try-catch块捕获
    }
}

// 加载笔记函数
async function loadNote(noteId) {
    try {
        logInfo('Load', `开始加载笔记: ${noteId}`);
        
        if (!noteId) {
            logError('Load', '笔记ID无效');
            showError('无效的笔记ID');
            return;
        }
        
        // 禁用编辑器，显示加载状态
        noteContent.value = '';
        noteContent.setAttribute('disabled', 'true');
        lastSavedEl.textContent = '上次保存: 加载中...';
        lastSavedEl.classList.remove('text-danger');
        syncStatusEl.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在加载笔记...';
        noteStatusEl.innerHTML = '加载中...';
        
        // 设置当前笔记ID
        currentNoteId = noteId;
        updateURL();
        updateNoteIdDisplay();
        
        // 首先尝试从本地存储加载
        const localKey = `note_${noteId}`;
        const localData = localStorage.getItem(localKey);
        
        if (localData) {
            try {
                const parsedData = JSON.parse(localData);
                logInfo('Load', '从本地存储加载笔记成功', parsedData);
                
                // 更新编辑器和UI
                noteContent.value = parsedData.content || '';
                isEncrypted = parsedData.encrypted || false;
                lastSaved = parsedData.lastSaved ? new Date(parsedData.lastSaved) : new Date();
                updateLastSavedTime();
                
                // 如果是加密笔记，显示解锁界面
                if (isEncrypted) {
                    logInfo('Load', '笔记已加密，显示解锁界面');
                    noteContent.value = '笔记已加密，请解锁查看内容';
                    noteContent.setAttribute('disabled', 'true');
                    lockBtn.innerHTML = '<i class="bi bi-unlock"></i>';
                    lockBtn.title = '解锁笔记';
                    if (unlockModal) unlockModal.show();
                } else {
                    noteContent.removeAttribute('disabled');
                }
                
                // 更新笔记状态
                updateNoteStatus();
            } catch (parseError) {
                logError('Load', '解析本地笔记数据失败', parseError);
                localStorage.removeItem(localKey); // 移除无效数据
            }
        }
        
        // 检查是否在URL中强制使用本地模式
        const urlParams = new URLSearchParams(window.location.search);
        const localModeParam = urlParams.get('local');
        const isUrlForcedLocalMode = localModeParam === 'true';
        
        // 如果启用了云同步且不是URL强制本地模式，尝试从云端加载
        if (!forceLocalOnly && !isUrlForcedLocalMode && GITHUB_TOKEN) {
            try {
                syncStatusEl.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在从云端同步...';
                
                const cloudNote = await fetchNoteFromCloud(noteId);
                
                if (cloudNote) {
                    logInfo('Load', '从云端加载笔记成功', cloudNote);
                    
                    // 检查是否需要更新本地数据
                    const localUpdateNeeded = !localData || 
                                            (cloudNote.lastSaved && (!lastSaved || new Date(cloudNote.lastSaved) > lastSaved));
                    
                    if (localUpdateNeeded) {
                        logInfo('Load', '云端数据较新，更新本地存储');
                        
                        // 更新编辑器和UI
                        noteContent.value = cloudNote.content || '';
                        isEncrypted = cloudNote.encrypted || false;
                        lastSaved = cloudNote.lastSaved ? new Date(cloudNote.lastSaved) : new Date();
                        updateLastSavedTime();
                        
                        // 如果是加密笔记，显示解锁界面
                        if (isEncrypted) {
                            logInfo('Load', '笔记已加密，显示解锁界面');
                            noteContent.value = '笔记已加密，请解锁查看内容';
                            noteContent.setAttribute('disabled', 'true');
                            lockBtn.innerHTML = '<i class="bi bi-unlock"></i>';
                            lockBtn.title = '解锁笔记';
                            if (unlockModal) unlockModal.show();
                        } else {
                            noteContent.removeAttribute('disabled');
                        }
                        
                        // 更新本地存储
                        localStorage.setItem(localKey, JSON.stringify(cloudNote));
                    }
                    
                    // 更新同步状态
                    isCloudSyncEnabled = true;
                    updateSyncStatus(true);
                } else {
                    // 云端笔记不存在，但本地有数据
                    if (localData) {
                        logInfo('Load', '云端笔记不存在，但本地有数据');
                        // 保持本地数据，不做更改
                    } else {
                        logError('Load', '笔记在云端和本地都不存在');
                        showError('笔记未找到');
                        createNewNote(); // 创建新笔记
                        return;
                    }
                }
            } catch (cloudError) {
                logError('Load', '从云端加载笔记失败', cloudError);
                
                // 如果本地没有数据，且云端加载失败，创建新笔记
                if (!localData) {
                    showError('无法加载笔记', cloudError.message);
                    createNewNote();
                    return;
                }
                
                // 更新同步状态
                updateSyncStatus(false);
            }
        } else {
            // 本地模式
            updateSyncStatus(false);
            
            // 如果本地没有数据，创建新笔记
            if (!localData) {
                logError('Load', '本地模式下找不到笔记');
                showError('笔记未找到');
                createNewNote();
                return;
            }
        }
        
        // 启用编辑器
        if (!isEncrypted) {
            noteContent.removeAttribute('disabled');
            noteContent.focus();
        }
        
        // 更新笔记状态
        updateNoteStatus();
        logInfo('Load', '笔记加载完成');
    } catch (error) {
        logError('Load', '加载笔记失败', error);
        showError('加载笔记失败', error.message);
        
        // 出错时创建新笔记
        createNewNote();
    }
}

// 更新上次保存时间显示
function updateLastSavedTime() {
    if (lastSavedEl && lastSaved) {
        const now = new Date();
        const diff = Math.floor((now - lastSaved) / 1000); // 秒数差
        
        let timeText;
        if (diff < 60) {
            timeText = `${diff}秒前`;
        } else if (diff < 3600) {
            timeText = `${Math.floor(diff / 60)}分钟前`;
        } else if (diff < 86400) {
            timeText = `${Math.floor(diff / 3600)}小时前`;
        } else {
            timeText = lastSaved.toLocaleString();
        }
        
        lastSavedEl.textContent = `上次保存: ${timeText}`;
        lastSavedEl.classList.remove('text-danger');
    }
}

// 更新同步状态UI
function updateSyncStatus(isConnected) {
    if (syncStatusEl) {
        // 检查是否是通过URL参数设置的本地模式
        const urlParams = new URLSearchParams(window.location.search);
        const localModeParam = urlParams.get('local');
        const isUrlForcedLocalMode = localModeParam === 'true';
        
        if (forceLocalOnly) {
            if (isUrlForcedLocalMode) {
                syncStatusEl.innerHTML = '<i class="bi bi-phone"></i> 移动测试模式';
                syncStatusEl.title = '通过URL参数强制使用本地存储（移动测试模式）';
                syncStatusEl.classList.remove('text-success', 'text-danger', 'text-secondary');
                syncStatusEl.classList.add('text-info');
            } else {
                syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> 本地模式';
                syncStatusEl.title = '点击修改存储设置';
                syncStatusEl.classList.remove('text-success', 'text-danger', 'text-info');
                syncStatusEl.classList.add('text-secondary');
            }
        } else if (isConnected) {
            syncStatusEl.innerHTML = '<i class="bi bi-cloud-check"></i> 云同步已启用';
            syncStatusEl.title = '已连接到GitHub';
            syncStatusEl.classList.remove('text-danger', 'text-secondary', 'text-info');
            syncStatusEl.classList.add('text-success');
            isCloudSyncEnabled = true;
        } else {
            if (GITHUB_TOKEN) {
                syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> 云同步未连接';
                syncStatusEl.title = '点击尝试重新连接';
            } else {
                syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> 未设置GitHub令牌';
                syncStatusEl.title = '点击设置GitHub令牌';
            }
            syncStatusEl.classList.remove('text-success', 'text-secondary', 'text-info');
            syncStatusEl.classList.add('text-danger');
            isCloudSyncEnabled = false;
        }
    }
}

// 更新笔记状态UI
function updateNoteStatus() {
    if (noteStatusEl) {
        if (isEncrypted) {
            noteStatusEl.innerHTML = '<i class="bi bi-lock"></i> 已加密';
            noteStatusEl.classList.remove('text-success');
            noteStatusEl.classList.add('text-warning');
        } else {
            noteStatusEl.innerHTML = '<i class="bi bi-unlock"></i> 未加密';
            noteStatusEl.classList.remove('text-warning');
            noteStatusEl.classList.add('text-success');
        }
    }
}

// 保存笔记函数
async function saveNote() {
    try {
        // 清除自动保存计时器
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
        }
        
        // 如果没有笔记ID或编辑器被禁用，不保存
        if (!currentNoteId || !noteContent || noteContent.disabled) {
            return;
        }
        
        // 构建笔记数据
        const noteData = {
            content: noteContent.value,
            lastSaved: new Date().toISOString(),
            encrypted: isEncrypted
        };
        
        // 保存到本地存储
        const localKey = `note_${currentNoteId}`;
        localStorage.setItem(localKey, JSON.stringify(noteData));
        lastSaved = new Date();
        updateLastSavedTime();
        
        // 检查是否在URL中强制使用本地模式
        const urlParams = new URLSearchParams(window.location.search);
        const localModeParam = urlParams.get('local');
        const isUrlForcedLocalMode = localModeParam === 'true';
        
        // 如果启用了云同步且未强制使用本地模式，尝试保存到云端
        if (isCloudSyncEnabled && !forceLocalOnly && GITHUB_TOKEN && !isUrlForcedLocalMode) {
            try {
                await saveNoteToCloud(currentNoteId, noteData);
                logInfo('Save', '笔记保存到云端成功');
            } catch (cloudError) {
                logError('Save', '保存到云端失败', cloudError);
                // 只显示一次错误提示
                if (!saveErrorShown) {
                    showError('保存到云端失败，但已保存到本地', cloudError.message);
                    saveErrorShown = true;
                    // 5秒后重置错误标志
                    setTimeout(() => { saveErrorShown = false; }, 5000);
                }
            }
        } else {
            // 根据情况记录不同的日志消息
            if (isUrlForcedLocalMode) {
                logInfo('Save', '移动测试模式: 仅保存到本地存储');
            } else if (forceLocalOnly) {
                logInfo('Save', '本地模式: 仅保存到本地存储');
            } else {
                logInfo('Save', '仅保存到本地存储');
            }
        }
    } catch (error) {
        logError('Save', '保存笔记失败', error);
        showError('保存笔记失败', error.message);
    }
}

// 声明自动保存计时器变量
let autoSaveTimer = null;
let saveErrorShown = false;

// 更新URL
function updateURL() {
    if (currentNoteId) {
        const url = new URL(window.location.href);
        url.searchParams.set('id', currentNoteId);
        window.history.replaceState({}, '', url.toString());
        logInfo('Navigation', `更新URL参数: id=${currentNoteId}`);
    }
}

// 生成唯一ID
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// 加密笔记
function encryptNote(password) {
    if (!password || !noteContent || !noteContent.value) {
        return false;
    }
    
    try {
        // 简单的密码加密实现
        const plaintext = noteContent.value;
        const encrypted = CryptoJS.AES.encrypt(plaintext, password).toString();
        
        // 更新编辑器和状态
        noteContent.value = encrypted;
        isEncrypted = true;
        
        // 更新UI
        lockBtn.innerHTML = '<i class="bi bi-unlock"></i>';
        lockBtn.title = '解锁笔记';
        updateNoteStatus();
        
        // 保存笔记
        saveNote();
        
        return true;
    } catch (error) {
        logError('Encrypt', '加密笔记失败', error);
        showError('加密笔记失败', error.message);
        return false;
    }
}

// 解密笔记
function decryptNote(password) {
    if (!password || !noteContent || !isEncrypted) {
        return false;
    }
    
    try {
        // 从本地存储获取原始加密数据
        const localKey = `note_${currentNoteId}`;
        const localData = localStorage.getItem(localKey);
        
        if (!localData) {
            logError('Decrypt', '找不到本地存储的笔记数据');
            return false;
        }
        
        const parsedData = JSON.parse(localData);
        const encrypted = parsedData.content;
        
        // 尝试解密
        const decrypted = CryptoJS.AES.decrypt(encrypted, password).toString(CryptoJS.enc.Utf8);
        
        if (!decrypted) {
            logError('Decrypt', '解密失败，可能是密码错误');
            return false;
        }
        
        // 更新编辑器和状态
        noteContent.value = decrypted;
        noteContent.removeAttribute('disabled');
        isEncrypted = false;
        
        // 更新UI
        lockBtn.innerHTML = '<i class="bi bi-lock"></i>';
        lockBtn.title = '加密笔记';
        updateNoteStatus();
        
        return true;
    } catch (error) {
        logError('Decrypt', '解密笔记失败', error);
        showError('解密笔记失败，密码可能不正确', error.message);
        return false;
    }
}

// 添加网络诊断功能
async function diagnoseNetworkConnectivity() {
    const results = {
        canReachGitHub: false,
        canReachAPI: false,
        errors: [],
        errorDetails: {
            statusCode: null,
            message: null,
            headers: null
        }
    };
    
    try {
        // 测试GitHub网站连接
        try {
            // 添加重试逻辑
            let githubRetries = 0;
            const maxGithubRetries = 2;
            let githubSuccess = false;
            
            while (!githubSuccess && githubRetries <= maxGithubRetries) {
                try {
                    const githubResponse = await fetch('https://github.com', {
                        method: 'HEAD',
                        mode: 'no-cors', // 使用no-cors模式可以检测连接性，但无法读取响应内容
                        cache: 'no-store',
                        credentials: 'omit'
                    });
                    
                    // 由于no-cors模式，我们无法真正获取状态码，但至少请求没有抛出异常
                    results.canReachGitHub = true;
                    githubSuccess = true;
                    logInfo('Network', 'GitHub网站连接成功');
                } catch (retryError) {
                    githubRetries++;
                    if (githubRetries <= maxGithubRetries) {
                        // 在重试前等待
                        const waitTime = Math.pow(2, githubRetries) * 500; // 指数退避
                        logInfo('Network', `GitHub网站连接失败，等待${waitTime}ms后重试... (${githubRetries}/${maxGithubRetries})`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    } else {
                        throw retryError; // 如果所有重试都失败，抛出最后一个错误
                    }
                }
            }
        } catch (githubError) {
            results.errors.push(`无法连接到GitHub网站: ${githubError.message}`);
            logError('Network', '无法连接到GitHub网站', githubError);
        }
        
        // 测试GitHub API连接 - 尝试多个不同的端点
        const apiEndpoints = [
            { url: `${API_BASE_URL}/zen`, description: 'GitHub API (Zen)' },
            { url: `${API_BASE_URL}/meta`, description: 'GitHub API (Meta)' },
            { url: `${API_BASE_URL}/emojis`, description: 'GitHub API (Emojis)' }
        ];
        
        let apiSuccessful = false;
        
        for (const endpoint of apiEndpoints) {
            if (apiSuccessful) break; // 如果已经成功连接，跳过剩余端点
            
            try {
                // 添加重试逻辑
                let apiRetries = 0;
                const maxApiRetries = 2;
                
                while (apiRetries <= maxApiRetries && !apiSuccessful) {
                    try {
                        logInfo('Network', `尝试连接到${endpoint.description}: ${endpoint.url}`);
                        
                        const apiResponse = await fetch(endpoint.url, {
                            method: 'GET', // 使用GET而非HEAD以获取更准确的响应
                            mode: 'cors',
                            cache: 'no-store',
                            credentials: 'omit',
                            headers: {
                                'Accept': 'application/vnd.github.v3+json',
                                'User-Agent': 'EasyNote-App' // 添加User-Agent头
                            }
                        });
                        
                        // 记录响应状态和头信息
                        results.errorDetails.statusCode = apiResponse.status;
                        results.errorDetails.headers = {};
                        apiResponse.headers.forEach((value, key) => {
                            results.errorDetails.headers[key] = value;
                        });
                        
                        if (apiResponse.ok || apiResponse.status === 401 || apiResponse.status === 403) {
                            // 401表示未授权，403表示禁止访问，但API连接是成功的
                            results.canReachAPI = true;
                            apiSuccessful = true;
                            
                            // 处理不同的状态码
                            if (apiResponse.status === 200) {
                                logInfo('Network', `${endpoint.description}连接成功 (HTTP 200)`);
                            } else if (apiResponse.status === 401) {
                                logInfo('Network', `${endpoint.description}可以访问，但需要授权 (HTTP 401)`);
                                results.errors.push(`${endpoint.description}需要授权 (HTTP 401)`);
                            } else if (apiResponse.status === 403) {
                                logInfo('Network', `${endpoint.description}可以访问，但访问被禁止 (HTTP 403)`);
                                
                                // 尝试获取更详细的错误信息
                                try {
                                    const errorData = await apiResponse.json();
                                    if (errorData && errorData.message) {
                                        results.errorDetails.message = errorData.message;
                                        results.errors.push(`${endpoint.description}访问被禁止: ${errorData.message}`);
                                        
                                        // 检查是否是速率限制问题
                                        if (errorData.message.includes('rate limit')) {
                                            const rateLimit = {
                                                limit: apiResponse.headers.get('X-RateLimit-Limit'),
                                                remaining: apiResponse.headers.get('X-RateLimit-Remaining'),
                                                reset: apiResponse.headers.get('X-RateLimit-Reset')
                                            };
                                            
                                            let resetTime = '未知';
                                            if (rateLimit.reset) {
                                                const date = new Date(rateLimit.reset * 1000);
                                                resetTime = date.toLocaleTimeString();
                                            }
                                            
                                            results.errors.push(`速率限制: ${rateLimit.remaining}/${rateLimit.limit}，将在${resetTime}重置`);
                                        }
                                    } else {
                                        results.errors.push(`${endpoint.description}访问被禁止 (HTTP 403)`);
                                    }
                                } catch (parseError) {
                                    results.errors.push(`${endpoint.description}访问被禁止 (HTTP 403)`);
                                }
                            }
                        } else {
                            // 其他状态码
                            try {
                                const errorText = await apiResponse.text();
                                results.errorDetails.message = errorText;
                                results.errors.push(`${endpoint.description}返回异常状态: ${apiResponse.status}`);
                                logWarning('Network', `${endpoint.description}连接异常: ${apiResponse.status}`, errorText);
                            } catch (textError) {
                                results.errors.push(`${endpoint.description}返回异常状态: ${apiResponse.status}`);
                                logWarning('Network', `${endpoint.description}连接异常: ${apiResponse.status}`);
                            }
                            
                            // 如果是5xx服务器错误，尝试重试
                            if (apiResponse.status >= 500 && apiResponse.status < 600) {
                                apiRetries++;
                                if (apiRetries <= maxApiRetries) {
                                    const waitTime = Math.pow(2, apiRetries) * 1000; // 指数退避
                                    logInfo('Network', `${endpoint.description}服务器错误，等待${waitTime}ms后重试... (${apiRetries}/${maxApiRetries})`);
                                    await new Promise(resolve => setTimeout(resolve, waitTime));
                                    continue;
                                }
                            }
                        }
                    } catch (retryError) {
                        apiRetries++;
                        if (apiRetries <= maxApiRetries) {
                            // 在重试前等待
                            const waitTime = Math.pow(2, apiRetries) * 1000; // 指数退避
                            logInfo('Network', `${endpoint.description}连接失败，等待${waitTime}ms后重试... (${apiRetries}/${maxApiRetries})`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        } else {
                            results.errors.push(`无法连接到${endpoint.description}: ${retryError.message}`);
                            logError('Network', `无法连接到${endpoint.description}`, retryError);
                            break; // 跳出当前端点的重试循环，尝试下一个端点
                        }
                    }
                }
            } catch (endpointError) {
                results.errors.push(`测试${endpoint.description}时出错: ${endpointError.message}`);
                logError('Network', `测试${endpoint.description}时出错`, endpointError);
            }
        }
        
        return results;
    } catch (error) {
        results.errors.push(`网络诊断过程出错: ${error.message}`);
        logError('Network', '网络诊断过程出错', error);
        return results;
    }
}

// 处理网络错误的帮助函数
function handleNetworkError(error, operation) {
    logError('Network', `${operation}过程中发生网络错误`, error);
    
    // 构建错误消息
    const errorMessage = `${operation}失败: 网络连接问题`;
    const detailMessage = `
        应用无法连接到GitHub API。
        
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
    `;
    
    // 显示错误并添加诊断按钮
    showError(errorMessage, detailMessage);
    
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        // 添加网络诊断按钮
        const diagButton = document.createElement('button');
        diagButton.className = 'btn btn-sm btn-info mt-2';
        diagButton.innerText = '运行网络诊断';
        diagButton.onclick = async () => {
            // 显示诊断中
            showDebugAlert('正在诊断网络连接，请稍候...');
            
            // 运行网络诊断
            try {
                const networkResults = await diagnoseNetworkConnectivity();
                
                // 创建诊断结果模态框
                const diagModal = createDiagResultModal();
                const diagBody = diagModal.querySelector('.modal-body');
                
                // 构建诊断结果内容
                let statusHtml = '';
                if (networkResults.canReachGitHub && networkResults.canReachAPI) {
                    statusHtml = `
                        <div class="alert alert-success">
                            <i class="bi bi-wifi"></i> <strong>网络连接正常</strong><br>
                            应用可以连接到GitHub网站和API。<br>
                            <hr>
                            <div class="mt-2">
                                - GitHub网站: <span class="text-success">✓ 可连接</span><br>
                                - GitHub API: <span class="text-success">✓ 可连接</span><br>
                            </div>
                            <hr>
                            <div class="mt-2">
                                如果您仍然遇到问题，可能是:<br>
                                - GitHub令牌权限问题<br>
                                - 特定API端点的访问限制<br>
                                - 浏览器扩展干扰<br>
                            </div>
                        </div>
                    `;
                } else if (networkResults.canReachGitHub && !networkResults.canReachAPI) {
                    // 构建HTTP错误详情
                    let errorDetailsHtml = '';
                    if (networkResults.errorDetails.statusCode) {
                        errorDetailsHtml += `<div class="text-danger mt-2">
                            错误状态码: ${networkResults.errorDetails.statusCode}<br>`;
                        
                        if (networkResults.errorDetails.message) {
                            errorDetailsHtml += `错误消息: ${networkResults.errorDetails.message}<br>`;
                        }
                        
                        if (networkResults.errorDetails.headers) {
                            // 显示重要的响应头
                            const importantHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 
                                                    'retry-after', 'x-github-request-id'];
                            
                            let hasImportantHeaders = false;
                            let headersHtml = '';
                            
                            for (const header of importantHeaders) {
                                if (networkResults.errorDetails.headers[header]) {
                                    hasImportantHeaders = true;
                                    if (header === 'x-ratelimit-reset' && networkResults.errorDetails.headers[header]) {
                                        const date = new Date(networkResults.errorDetails.headers[header] * 1000);
                                        headersHtml += `${header}: ${networkResults.errorDetails.headers[header]} (${date.toLocaleTimeString()})<br>`;
                                    } else {
                                        headersHtml += `${header}: ${networkResults.errorDetails.headers[header]}<br>`;
                                    }
                                }
                            }
                            
                            if (hasImportantHeaders) {
                                errorDetailsHtml += `<br>响应头信息:<br>${headersHtml}`;
                            }
                        }
                        
                        errorDetailsHtml += `</div>`;
                    }
                    
                    // 构建可能的解决方案，基于具体的错误
                    let solutionsHtml = '';
                    if (networkResults.errorDetails.statusCode === 403) {
                        // 403 Forbidden 错误的解决方案
                        if (networkResults.errorDetails.message && networkResults.errorDetails.message.includes('rate limit')) {
                            // 速率限制问题
                            solutionsHtml = `
                                <div class="mt-3">
                                    <strong>解决方案:</strong><br>
                                    - 您已超出GitHub API速率限制<br>
                                    - 等待一段时间后再试<br>
                                    - 使用GitHub个人访问令牌可提高限制<br>
                                    - 确保您的令牌具有正确的权限<br>
                                </div>
                            `;
                        } else {
                            // 其他403错误
                            solutionsHtml = `
                                <div class="mt-3">
                                    <strong>解决方案:</strong><br>
                                    - 检查您的GitHub令牌权限<br>
                                    - 令牌需要具有<code>gist</code>权限<br>
                                    - 尝试使用新的个人访问令牌<br>
                                    - 检查您的网络/代理是否限制GitHub API访问<br>
                                </div>
                            `;
                        }
                    } else if (networkResults.errorDetails.statusCode === 401) {
                        // 401 Unauthorized 错误的解决方案
                        solutionsHtml = `
                            <div class="mt-3">
                                <strong>解决方案:</strong><br>
                                - 您的GitHub令牌无效或已过期<br>
                                - 请创建新的个人访问令牌<br>
                                - 确保令牌具有<code>gist</code>权限<br>
                            </div>
                        `;
                    } else if (networkResults.errorDetails.statusCode >= 500) {
                        // 5xx 服务器错误的解决方案
                        solutionsHtml = `
                            <div class="mt-3">
                                <strong>解决方案:</strong><br>
                                - GitHub服务器暂时出现问题<br>
                                - 稍后再试<br>
                                - 查看 <a href="https://www.githubstatus.com/" target="_blank">GitHub状态页面</a><br>
                            </div>
                        `;
                    } else {
                        // 默认解决方案
                        solutionsHtml = `
                            <div class="mt-3">
                                <strong>解决方案:</strong><br>
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
                                - 尝试使用VPN或代理服务<br>
                            </div>
                        `;
                    }
                    
                    statusHtml = `
                        <div class="alert alert-warning">
                            <i class="bi bi-wifi-off"></i> <strong>部分网络连接问题</strong><br>
                            应用可以连接到GitHub网站，但无法连接到API。<br>
                            <hr>
                            <div class="mt-2">
                                - GitHub网站: <span class="text-success">✓ 可连接</span><br>
                                - GitHub API: <span class="text-danger">✗ 无法连接</span><br>
                            </div>
                            <hr>
                            ${errorDetailsHtml}
                            <hr>
                            <div class="mt-2">
                                <strong>可能的原因:</strong><br>
                                - 防火墙或代理阻止了API访问<br>
                                - GitHub API暂时不可用<br>
                                - 您的网络提供商限制了API访问<br>
                                - 浏览器的安全设置或扩展阻止了请求<br>
                            </div>
                            ${solutionsHtml}
                        </div>
                    `;
                } else if (!networkResults.canReachGitHub && !networkResults.canReachAPI) {
                    statusHtml = `
                        <div class="alert alert-danger">
                            <i class="bi bi-wifi-off"></i> <strong>网络连接问题</strong><br>
                            应用无法连接到GitHub网站和API。<br>
                            <hr>
                            <div class="mt-2">
                                - GitHub网站: <span class="text-danger">✗ 无法连接</span><br>
                                - GitHub API: <span class="text-danger">✗ 无法连接</span><br>
                            </div>
                            <hr>
                            <div class="text-danger mt-2">
                                错误详情: ${networkResults.errors.join('<br>')}
                            </div>
                            <hr>
                            <div class="mt-2">
                                <strong>可能的原因:</strong><br>
                                - 网络连接不可用<br>
                                - GitHub被屏蔽或限制<br>
                                - 严格的防火墙设置<br>
                                <br>
                                <strong>建议:</strong><br>
                                - 检查您的网络连接<br>
                                - 确认是否可以访问其他网站<br>
                                - 考虑使用VPN或代理服务<br>
                                - 尝试在不同的网络环境下访问<br>
                            </div>
                        </div>
                    `;
                }
                
                diagBody.innerHTML = `
                    <h5>网络连接诊断</h5>
                    ${statusHtml}
                    <div class="mt-3 text-center">
                        <button class="btn btn-primary retry-btn me-2">
                            <i class="bi bi-arrow-repeat"></i> 重新尝试连接
                        </button>
                        <button class="btn btn-secondary advanced-btn">
                            <i class="bi bi-gear"></i> 高级选项
                        </button>
                    </div>
                    <div class="mt-3 advanced-options" style="display:none;">
                        <div class="card">
                            <div class="card-header bg-light">
                                <strong>高级选项</strong>
                            </div>
                            <div class="card-body">
                                <div class="mb-2">
                                    <button class="btn btn-sm btn-outline-secondary clear-cache-btn">
                                        <i class="bi bi-trash"></i> 清除应用缓存
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary ms-2 check-cors-btn">
                                        <i class="bi bi-shield-check"></i> CORS诊断
                                    </button>
                                </div>
                                <div class="mb-2">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="useAltApi">
                                        <label class="form-check-label" for="useAltApi">尝试使用备用API</label>
                                    </div>
                                </div>
                                <div class="small text-muted mt-2">
                                    请注意: 高级选项适用于技术用户，可能需要重新加载应用才能生效。
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // 添加事件处理程序
                const retryBtn = diagBody.querySelector('.retry-btn');
                const advancedBtn = diagBody.querySelector('.advanced-btn');
                const advancedOptions = diagBody.querySelector('.advanced-options');
                const clearCacheBtn = diagBody.querySelector('.clear-cache-btn');
                const checkCorsBtn = diagBody.querySelector('.check-cors-btn');
                const useAltApiCheck = diagBody.querySelector('#useAltApi');
                
                if (retryBtn) {
                    retryBtn.addEventListener('click', async function() {
                        // 更新按钮状态
                        retryBtn.disabled = true;
                        retryBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在重试...';
                        
                        // 重新运行诊断
                        try {
                            const newResults = await diagnoseNetworkConnectivity();
                            // 关闭当前模态框
                            const currentModal = bootstrap.Modal.getInstance(diagModal);
                            if (currentModal) currentModal.hide();
                            
                            // 再次调用处理函数，显示新结果
                            handleNetworkError(error, operation);
                        } catch (e) {
                            retryBtn.disabled = false;
                            retryBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> 重新尝试连接';
                            showError('重试连接失败', e.message);
                        }
                    });
                }
                
                if (advancedBtn) {
                    advancedBtn.addEventListener('click', function() {
                        if (advancedOptions.style.display === 'none') {
                            advancedOptions.style.display = 'block';
                            advancedBtn.innerHTML = '<i class="bi bi-gear-fill"></i> 隐藏高级选项';
                        } else {
                            advancedOptions.style.display = 'none';
                            advancedBtn.innerHTML = '<i class="bi bi-gear"></i> 高级选项';
                        }
                    });
                }
                
                if (clearCacheBtn) {
                    clearCacheBtn.addEventListener('click', function() {
                        // 清除应用本地存储缓存
                        try {
                            // 仅清除应用相关缓存，保留用户数据
                            const keysToPreserve = ['easy_note_github_token', 'note_'];
                            
                            // 遍历本地存储，移除非笔记和非令牌的项目
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                let shouldPreserve = false;
                                
                                for (const prefix of keysToPreserve) {
                                    if (key.startsWith(prefix)) {
                                        shouldPreserve = true;
                                        break;
                                    }
                                }
                                
                                if (!shouldPreserve) {
                                    localStorage.removeItem(key);
                                }
                            }
                            
                            showDebugAlert('应用缓存已清除，刷新页面以应用更改');
                            
                            // 更新按钮
                            clearCacheBtn.disabled = true;
                            clearCacheBtn.innerHTML = '<i class="bi bi-check"></i> 缓存已清除';
                            
                            // 添加刷新按钮
                            const refreshBtn = document.createElement('button');
                            refreshBtn.className = 'btn btn-sm btn-success ms-2';
                            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新页面';
                            refreshBtn.onclick = function() {
                                window.location.reload();
                            };
                            
                            clearCacheBtn.parentNode.appendChild(refreshBtn);
                        } catch (e) {
                            showError('清除缓存失败', e.message);
                        }
                    });
                }
                
                if (checkCorsBtn) {
                    checkCorsBtn.addEventListener('click', async function() {
                        // CORS诊断
                        checkCorsBtn.disabled = true;
                        checkCorsBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在检查...';
                        
                        try {
                            // 尝试简单的CORS请求
                            const corsResult = await fetch('https://httpbin.org/get', {
                                method: 'GET',
                                mode: 'cors',
                                cache: 'no-store',
                                credentials: 'omit'
                            });
                            
                            if (corsResult.ok) {
                                showDebugAlert('CORS请求成功！浏览器支持跨域请求。');
                                checkCorsBtn.className = 'btn btn-sm btn-success';
                                checkCorsBtn.innerHTML = '<i class="bi bi-check"></i> CORS正常';
                            } else {
                                showError('CORS测试失败', `状态码: ${corsResult.status}`);
                                checkCorsBtn.className = 'btn btn-sm btn-danger';
                                checkCorsBtn.innerHTML = '<i class="bi bi-x"></i> CORS异常';
                            }
                        } catch (e) {
                            showError('CORS测试出错', e.message);
                            checkCorsBtn.className = 'btn btn-sm btn-danger';
                            checkCorsBtn.innerHTML = '<i class="bi bi-x"></i> CORS异常';
                        }
                    });
                }
                
                if (useAltApiCheck) {
                    // 检查是否已经使用备用API
                    const currentApiUrl = localStorage.getItem('easy_note_alt_api');
                    if (currentApiUrl) {
                        useAltApiCheck.checked = true;
                    }
                    
                    useAltApiCheck.addEventListener('change', function() {
                        if (this.checked) {
                            // 使用备用API
                            localStorage.setItem('easy_note_alt_api', 'true');
                            showDebugAlert('已启用备用API，刷新页面以应用更改');
                        } else {
                            // 使用标准API
                            localStorage.removeItem('easy_note_alt_api');
                            showDebugAlert('已禁用备用API，刷新页面以应用更改');
                        }
                        
                        // 添加刷新按钮
                        const refreshApiBtn = document.createElement('button');
                        refreshApiBtn.className = 'btn btn-sm btn-success mt-2';
                        refreshApiBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新页面应用更改';
                        refreshApiBtn.onclick = function() {
                            window.location.reload();
                        };
                        
                        // 添加到高级选项卡片底部
                        const cardBody = useAltApiCheck.closest('.card-body');
                        if (cardBody && !cardBody.querySelector('.btn-success')) {
                            cardBody.appendChild(refreshApiBtn);
                        }
                    });
                }
                
                // 显示诊断模态框
                const bsModal = new bootstrap.Modal(diagModal);
                bsModal.show();
            } catch (diagError) {
                logError('Network', '运行网络诊断时出错', diagError);
                showError('无法完成网络诊断', diagError.message);
            }
        };
        
        // 添加重试按钮
        const retryButton = document.createElement('button');
        retryButton.className = 'btn btn-sm btn-primary mt-2 ms-2';
        retryButton.innerText = '重新尝试连接';
        retryButton.onclick = () => {
            checkCloudConnectivity();
            showDebugAlert('正在重新检查GitHub连接...');
        };
        
        errorEl.appendChild(diagButton);
        errorEl.appendChild(retryButton);
    }
    
    return true;
}

// 增强的GitHub认证请求函数，添加重试和错误处理
async function authenticateWithGitHub(token, maxRetries = 2) {
    let retries = 0;
    
    while (retries <= maxRetries) {
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'EasyNote-App' // 添加User-Agent头
            };
            
            // 根据令牌类型使用不同的前缀
            if (token.startsWith('github_pat_')) {
                headers['Authorization'] = `Bearer ${token}`;
            } else if (token.startsWith('ghp_')) {
                headers['Authorization'] = `token ${token}`;
            } else {
                headers['Authorization'] = `token ${token}`;
            }
            
            const options = {
                method: 'GET',
                headers: headers,
                credentials: 'omit',
                mode: 'cors',
                cache: 'no-store'
            };
            
            logInfo('Auth', `尝试认证GitHub (尝试 ${retries + 1}/${maxRetries + 1})`);
            const response = await fetch(`${API_BASE_URL}/user`, options);
            
            if (response.ok) {
                const userData = await response.json();
                logInfo('Auth', `认证成功，用户: ${userData.login}`);
                return {
                    success: true,
                    user: userData,
                    message: `认证成功，欢迎 ${userData.login}`
                };
            } else {
                let errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.message) {
                        errorText = errorJson.message;
                    }
                } catch(e) {
                    // 如果不是JSON，保持原文本
                }
                
                logError('Auth', `认证失败: HTTP ${response.status}`, errorText);
                
                if (response.status === 401) {
                    // 令牌无效，无需重试
                    return {
                        success: false,
                        error: `认证失败: 令牌无效或已过期 (HTTP ${response.status})`,
                        detail: errorText
                    };
                } else if (response.status === 403) {
                    // 可能是速率限制
                    if (errorText.includes('rate limit')) {
                        const resetTime = response.headers.get('X-RateLimit-Reset');
                        const waitTime = resetTime ? new Date(resetTime * 1000) : '未知时间';
                        
                        return {
                            success: false,
                            error: `认证失败: 速率限制 (HTTP ${response.status})`,
                            detail: `您已超出GitHub API速率限制。限制将在${waitTime}后重置。`
                        };
                    } else {
                        return {
                            success: false,
                            error: `认证失败: 权限问题 (HTTP ${response.status})`,
                            detail: errorText
                        };
                    }
                }
                
                // 其他错误，尝试重试
                retries++;
                if (retries <= maxRetries) {
                    // 在重试前等待
                    const waitTime = Math.pow(2, retries) * 1000; // 指数退避
                    logInfo('Auth', `等待${waitTime}ms后重试...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    return {
                        success: false,
                        error: `认证失败: HTTP ${response.status}`,
                        detail: errorText
                    };
                }
            }
        } catch (error) {
            logError('Auth', `认证请求出错 (尝试 ${retries + 1}/${maxRetries + 1})`, error);
            
            // 检查是否是Failed to fetch错误
            if (error.message && error.message.includes('Failed to fetch')) {
                logError('Auth', '遇到"Failed to fetch"错误，这通常是由网络或CORS问题引起的');
                
                // 如果已经是最后一次重试，直接返回特殊错误代码
                if (retries === maxRetries) {
                    // 提供更详细的错误信息
                    return {
                        success: false,
                        error: '认证请求出错: Failed to fetch',
                        detail: '浏览器无法完成网络请求，可能是由网络连接问题或CORS限制引起的。',
                        isFailedToFetch: true // 添加特殊标记
                    };
                }
            }
            
            // 网络错误，尝试重试
            retries++;
            if (retries <= maxRetries) {
                // 在重试前等待
                const waitTime = Math.pow(2, retries) * 1000; // 指数退避
                logInfo('Auth', `等待${waitTime}ms后重试...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                return {
                    success: false,
                    error: '认证请求出错: 网络连接问题',
                    detail: error.message,
                    isNetworkError: true
                };
            }
        }
    }
    
    // 如果所有重试都失败
    return {
        success: false,
        error: '认证失败: 多次尝试后仍然失败',
        detail: '请检查您的网络连接和令牌有效性'
    };
}

// 修改checkCloudConnectivity使用增强的认证函数
async function checkCloudConnectivity() {
    logInfo('Cloud', '检查GitHub连接...');
    
    if (!GITHUB_TOKEN) {
        logError('Cloud', 'GitHub令牌未设置，无法检查连接');
        isCloudSyncEnabled = false;
        updateSyncStatus(false);
        return false;
    }
    
    try {
        syncStatusEl.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在检查GitHub连接...';
        
        const authResult = await authenticateWithGitHub(GITHUB_TOKEN);
        
        if (authResult.success) {
            logInfo('Cloud', `GitHub云存储连接成功! 用户: ${authResult.user.login}`);
            isCloudSyncEnabled = true;
            updateSyncStatus(true);
            return true;
        } else {
            logError('Cloud', `GitHub连接检查失败: ${authResult.error}`, authResult.detail);
            
            // 处理不同类型的错误
            if (authResult.isFailedToFetch) {
                // Failed to fetch错误需要特殊处理
                handleFailedToFetchError();
            } else if (authResult.isNetworkError) {
                // 网络错误
                handleNetworkError(new Error(authResult.detail), "检查GitHub连接");
            } else if (authResult.error.includes('令牌无效') || authResult.error.includes('401')) {
                // 令牌问题
                handleGitHubPermissionIssue("GitHub令牌无效或已过期");
            } else if (authResult.error.includes('权限问题') || authResult.error.includes('403')) {
                // 权限问题
                handleGitHubPermissionIssue("GitHub令牌权限不足");
            } else if (authResult.error.includes('速率限制')) {
                // 速率限制
                showError(`GitHub API速率限制`, authResult.detail);
            } else {
                // 其他错误
                showError(`GitHub连接失败: ${authResult.error}`, authResult.detail);
            }
            
            isCloudSyncEnabled = false;
            updateSyncStatus(false);
            return false;
        }
    } catch (error) {
        logError('Cloud', 'GitHub连接检查过程中出错', error);
        
        // 处理网络错误
        if (error.message.includes('Failed to fetch')) {
            // 特殊处理Failed to fetch错误
            handleFailedToFetchError();
        } else if (error.message.includes('fetch') || error.message.includes('network') || 
            error.name === 'TypeError' || error.name === 'NetworkError') {
            handleNetworkError(error, "检查GitHub连接");
        } else {
            showError('连接GitHub时出错', error.message);
        }
        
        isCloudSyncEnabled = false;
        updateSyncStatus(false);
        return false;
    }
}

// 专门处理Failed to fetch错误
async function handleFailedToFetchError() {
    logError('Network', '"Failed to fetch"错误 - 无法完成网络请求');
    
    // 创建诊断结果模态框
    const diagModal = createDiagResultModal();
    const diagBody = diagModal.querySelector('.modal-body');
    
    // 构建诊断结果内容
    diagBody.innerHTML = `
        <h5>网络请求错误</h5>
        <div class="alert alert-danger">
            <i class="bi bi-wifi-off"></i> <strong>网络请求失败</strong><br>
            浏览器无法完成网络请求，这通常是由以下原因导致的:<br>
            <hr>
            <div class="mt-2">
                <strong>可能的原因:</strong><br>
                1. <strong>跨域资源共享(CORS)限制</strong> - 浏览器安全策略阻止了请求<br>
                2. <strong>网络连接问题</strong> - 网络连接不稳定或已断开<br>
                3. <strong>浏览器扩展干扰</strong> - 某些隐私或安全扩展可能阻止了请求<br>
                4. <strong>混合内容问题</strong> - 尝试从HTTPS页面请求HTTP内容<br>
                5. <strong>目标服务器不可用</strong> - GitHub API可能暂时不可用<br>
            </div>
            <hr>
            <div class="mt-2">
                <strong>建议解决方案:</strong><br>
                1. <strong>启用备用API</strong> - 点击下方"高级选项"使用备用API<br>
                2. <strong>检查网络连接</strong> - 确保您的设备已连接到互联网<br>
                3. <strong>使用无痕/隐私浏览模式</strong> - 这将禁用所有扩展<br>
                4. <strong>暂时关闭浏览器扩展</strong> - 特别是内容拦截器和隐私扩展<br>
                5. <strong>清除浏览器缓存和Cookie</strong> - 解决潜在的数据损坏问题<br>
                6. <strong>使用不同的浏览器</strong> - 尝试Chrome、Firefox或Edge<br>
            </div>
        </div>
        <div class="mt-3 text-center">
            <button class="btn btn-primary retry-btn me-2">
                <i class="bi bi-arrow-repeat"></i> 重新尝试连接
            </button>
            <button class="btn btn-secondary advanced-btn">
                <i class="bi bi-gear"></i> 高级选项
            </button>
        </div>
        <div class="mt-3 advanced-options" style="display:none;">
            <div class="card">
                <div class="card-header bg-light">
                    <strong>高级选项</strong>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="useAltApi">
                            <label class="form-check-label" for="useAltApi">
                                <strong>使用备用API</strong> (推荐)
                            </label>
                            <div class="small text-muted">
                                绕过GitHub API限制，使用备用服务器
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="forceLocalStorage">
                            <label class="form-check-label" for="forceLocalStorage">
                                <strong>强制使用本地存储</strong>
                            </label>
                            <div class="small text-muted">
                                暂时关闭云同步，仅使用浏览器本地存储
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <button class="btn btn-sm btn-outline-secondary clear-cache-btn">
                            <i class="bi bi-trash"></i> 清除应用缓存
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ms-2 check-cors-btn">
                            <i class="bi bi-shield-check"></i> CORS诊断
                        </button>
                    </div>
                    <hr>
                    <div class="mb-2">
                        <strong>测试基本网络连接:</strong>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary test-httpbin-btn">
                            测试普通HTTP请求
                        </button>
                        <button class="btn btn-sm btn-outline-primary ms-2 test-github-btn">
                            测试GitHub连接
                        </button>
                    </div>
                    <div class="small text-muted mt-2">
                        请注意: 高级选项适用于技术用户，可能需要重新加载应用才能生效。
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加事件处理程序
    const retryBtn = diagBody.querySelector('.retry-btn');
    const advancedBtn = diagBody.querySelector('.advanced-btn');
    const advancedOptions = diagBody.querySelector('.advanced-options');
    const clearCacheBtn = diagBody.querySelector('.clear-cache-btn');
    const checkCorsBtn = diagBody.querySelector('.check-cors-btn');
    const useAltApiCheck = diagBody.querySelector('#useAltApi');
    const forceLocalStorageCheck = diagBody.querySelector('#forceLocalStorage');
    const testHttpbinBtn = diagBody.querySelector('.test-httpbin-btn');
    const testGithubBtn = diagBody.querySelector('.test-github-btn');
    
    // 检查当前状态并设置相应选项
    if (localStorage.getItem('easy_note_alt_api') === 'true') {
        useAltApiCheck.checked = true;
    }
    
    if (localStorage.getItem('easy_note_storage_setting') === 'local') {
        forceLocalStorageCheck.checked = true;
    }
    
    // 重试按钮事件
    if (retryBtn) {
        retryBtn.addEventListener('click', function() {
            // 关闭当前模态框
            const currentModal = bootstrap.Modal.getInstance(diagModal);
            if (currentModal) currentModal.hide();
            
            // 重新检查连接
            checkCloudConnectivity();
            showDebugAlert('正在重新检查GitHub连接...');
        });
    }
    
    // 高级选项按钮事件
    if (advancedBtn) {
        advancedBtn.addEventListener('click', function() {
            if (advancedOptions.style.display === 'none') {
                advancedOptions.style.display = 'block';
                advancedBtn.innerHTML = '<i class="bi bi-gear-fill"></i> 隐藏高级选项';
            } else {
                advancedOptions.style.display = 'none';
                advancedBtn.innerHTML = '<i class="bi bi-gear"></i> 高级选项';
            }
        });
    }
    
    // 清除缓存按钮事件
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', function() {
            try {
                // 仅清除应用相关缓存，保留用户数据
                const keysToPreserve = ['easy_note_github_token', 'note_'];
                
                // 遍历本地存储，移除非笔记和非令牌的项目
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    let shouldPreserve = false;
                    
                    for (const prefix of keysToPreserve) {
                        if (key.startsWith(prefix)) {
                            shouldPreserve = true;
                            break;
                        }
                    }
                    
                    if (!shouldPreserve) {
                        localStorage.removeItem(key);
                    }
                }
                
                showDebugAlert('应用缓存已清除');
                
                // 更新按钮
                clearCacheBtn.disabled = true;
                clearCacheBtn.innerHTML = '<i class="bi bi-check"></i> 缓存已清除';
                
                // 添加刷新按钮
                const refreshBtn = document.createElement('button');
                refreshBtn.className = 'btn btn-sm btn-success ms-2';
                refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新页面';
                refreshBtn.onclick = function() {
                    window.location.reload();
                };
                
                clearCacheBtn.parentNode.appendChild(refreshBtn);
            } catch (e) {
                showError('清除缓存失败', e.message);
            }
        });
    }
    
    // CORS诊断按钮事件
    if (checkCorsBtn) {
        checkCorsBtn.addEventListener('click', async function() {
            checkCorsBtn.disabled = true;
            checkCorsBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 正在检查...';
            
            try {
                const corsResult = await fetch('https://httpbin.org/get', {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-store',
                    credentials: 'omit'
                });
                
                if (corsResult.ok) {
                    showDebugAlert('CORS请求成功！浏览器支持跨域请求。');
                    checkCorsBtn.className = 'btn btn-sm btn-success';
                    checkCorsBtn.innerHTML = '<i class="bi bi-check"></i> CORS正常';
                } else {
                    showError('CORS测试失败', `状态码: ${corsResult.status}`);
                    checkCorsBtn.className = 'btn btn-sm btn-danger';
                    checkCorsBtn.innerHTML = '<i class="bi bi-x"></i> CORS异常';
                }
            } catch (e) {
                showError('CORS测试出错', e.message);
                checkCorsBtn.className = 'btn btn-sm btn-danger';
                checkCorsBtn.innerHTML = '<i class="bi bi-x"></i> CORS异常';
                
                // 如果是Failed to fetch，给出更具体的提示
                if (e.message.includes('Failed to fetch')) {
                    showDebugAlert('CORS测试失败：浏览器无法完成网络请求。建议使用备用API或检查网络连接。');
                }
            }
        });
    }
    
    // 备用API开关事件
    if (useAltApiCheck) {
        useAltApiCheck.addEventListener('change', function() {
            if (this.checked) {
                localStorage.setItem('easy_note_alt_api', 'true');
                showDebugAlert('已启用备用API');
            } else {
                localStorage.removeItem('easy_note_alt_api');
                showDebugAlert('已禁用备用API');
            }
            
            // 添加刷新按钮
            const refreshApiBtn = document.createElement('button');
            refreshApiBtn.className = 'btn btn-sm btn-success mt-2';
            refreshApiBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新页面应用更改';
            refreshApiBtn.onclick = function() {
                window.location.reload();
            };
            
            // 添加到卡片底部
            const cardBody = useAltApiCheck.closest('.card-body');
            if (cardBody && !cardBody.querySelector('.btn-success')) {
                cardBody.appendChild(refreshApiBtn);
            }
        });
    }
    
    // 强制本地存储开关事件
    if (forceLocalStorageCheck) {
        forceLocalStorageCheck.addEventListener('change', function() {
            if (this.checked) {
                localStorage.setItem('easy_note_storage_setting', 'local');
                showDebugAlert('已启用仅本地存储模式');
            } else {
                localStorage.setItem('easy_note_storage_setting', 'cloud');
                showDebugAlert('已启用云同步模式');
            }
            
            // 添加刷新按钮
            const refreshStorageBtn = document.createElement('button');
            refreshStorageBtn.className = 'btn btn-sm btn-success mt-2';
            refreshStorageBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新页面应用更改';
            refreshStorageBtn.onclick = function() {
                window.location.reload();
            };
            
            // 添加到卡片底部
            const cardBody = forceLocalStorageCheck.closest('.card-body');
            if (cardBody && !cardBody.querySelector('.btn-success')) {
                cardBody.appendChild(refreshStorageBtn);
            }
        });
    }
    
    // 测试普通HTTP请求按钮事件
    if (testHttpbinBtn) {
        testHttpbinBtn.addEventListener('click', async function() {
            testHttpbinBtn.disabled = true;
            testHttpbinBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 测试中...';
            
            try {
                const startTime = Date.now();
                const response = await fetch('https://httpbin.org/get', {
                    method: 'GET',
                    cache: 'no-store'
                });
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                if (response.ok) {
                    testHttpbinBtn.className = 'btn btn-sm btn-success';
                    testHttpbinBtn.innerHTML = `<i class="bi bi-check"></i> 连接正常 (${responseTime}ms)`;
                    showDebugAlert(`HTTP请求测试成功，响应时间: ${responseTime}ms`);
                } else {
                    testHttpbinBtn.className = 'btn btn-sm btn-danger';
                    testHttpbinBtn.innerHTML = `<i class="bi bi-x"></i> 连接失败 (${response.status})`;
                    showError('HTTP请求测试失败', `状态码: ${response.status}`);
                }
            } catch (e) {
                testHttpbinBtn.className = 'btn btn-sm btn-danger';
                testHttpbinBtn.innerHTML = '<i class="bi bi-x"></i> 连接失败';
                showError('HTTP请求测试出错', e.message);
            }
        });
    }
    
    // 测试GitHub连接按钮事件
    if (testGithubBtn) {
        testGithubBtn.addEventListener('click', async function() {
            testGithubBtn.disabled = true;
            testGithubBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> 测试中...';
            
            try {
                const startTime = Date.now();
                const response = await fetch('https://github.com', {
                    method: 'GET',
                    cache: 'no-store'
                });
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                if (response.ok) {
                    testGithubBtn.className = 'btn btn-sm btn-success';
                    testGithubBtn.innerHTML = `<i class="bi bi-check"></i> 连接正常 (${responseTime}ms)`;
                    showDebugAlert(`GitHub连接测试成功，响应时间: ${responseTime}ms`);
                } else {
                    testGithubBtn.className = 'btn btn-sm btn-danger';
                    testGithubBtn.innerHTML = `<i class="bi bi-x"></i> 连接失败 (${response.status})`;
                    showError('GitHub连接测试失败', `状态码: ${response.status}`);
                }
            } catch (e) {
                testGithubBtn.className = 'btn btn-sm btn-danger';
                testGithubBtn.innerHTML = '<i class="bi bi-x"></i> 连接失败';
                showError('GitHub连接测试出错', e.message);
            }
        });
    }
    
    // 显示诊断模态框
    const bsModal = new bootstrap.Modal(diagModal);
    bsModal.show();
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

// 修改populateSettingsModal函数
function populateSettingsModal() {
    // 填充GitHub令牌
    const tokenField = document.getElementById('githubTokenField');
    tokenField.value = GITHUB_TOKEN || '';
    
    // 填充云存储选项
    document.getElementById('cloudStorageRadio').checked = isCloudStorageEnabled();
    document.getElementById('localStorageRadio').checked = !isCloudStorageEnabled();
    
    // 显示已保存的笔记ID
    if (currentNoteId) {
        document.getElementById('currentNoteIdValue').textContent = currentNoteId;
        document.getElementById('currentNoteIdContainer').classList.remove('d-none');
    } else {
        document.getElementById('currentNoteIdContainer').classList.add('d-none');
    }
}

// 修改updateCloudStatusDisplay，移除JSONBin相关代码
function updateCloudStatusDisplay() {
    const indicator = document.getElementById('cloudStatusIndicator');
    const tooltip = document.getElementById('cloudStatusTooltip');
    
    if (!isCloudStorageEnabled()) {
        // 本地模式
        indicator.className = 'status-indicator local-mode';
        tooltip.textContent = '本地模式 (仅保存到本设备)';
        return;
    }
    
    if (!GITHUB_TOKEN) {
        // 未设置GitHub令牌
        indicator.className = 'status-indicator disconnected';
        tooltip.textContent = '未连接到GitHub (未设置令牌)';
        return;
    }
    
    // 默认为"正在检查连接..."状态
    indicator.className = 'status-indicator checking';
    tooltip.textContent = '正在检查GitHub连接...';
    
    // 执行实际的连接检查
    checkGitHubConnection();
}