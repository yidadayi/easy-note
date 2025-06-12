// 閲嶆瀯搴旂敤绋嬪簭鍒濆鍖栦唬鐮侊紝纭繚鍙湪涓€涓湴鏂硅繘琛屽垵濮嬪寲
// 鍏ㄥ眬鍙橀噺鍜孌OM鍏冪礌寮曠敤
const API_BASE_URL = 'https://api.github.com';
const DEBUG_MODE = true; // 鍚敤璇︾粏鏃ュ織
let GITHUB_TOKEN = localStorage.getItem('easy_note_github_token') || null;

// 鏃ュ織鍑芥暟
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

// 鏄剧ず閿欒淇℃伅鍑芥暟
function showError(message, details = '') {
    logError('UI', message, details);
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('d-none');
        
        // 5绉掑悗鑷姩闅愯棌
        setTimeout(() => {
            errorEl.classList.add('d-none');
        }, 5000);
    } else {
        alert(message + (details ? '\n\n' + details : ''));
    }
}

// 鏄剧ず璋冭瘯淇℃伅鎻愮ず鍑芥暟
function showDebugAlert(message) {
    if (!DEBUG_MODE) return;
    
    // 妫€鏌ユ槸鍚﹀凡鏈夋彁绀烘
    let debugAlert = document.getElementById('debugAlert');
    
    if (!debugAlert) {
        // 鍒涘缓涓€涓柊鐨勬彁绀烘
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
    
    // 璁剧疆鎻愮ず鍐呭
    debugAlert.textContent = message;
    debugAlert.style.display = 'block';
    
    // 2绉掑悗鑷姩闅愯棌
    setTimeout(() => {
        debugAlert.style.display = 'none';
    }, 2000);
}

// 搴旂敤鐘舵€佸彉閲?let currentNoteId = '';
let isEncrypted = false;
let lastSaved = null;
let isCloudSyncEnabled = false;
let forceLocalOnly = false;

// DOM鍏冪礌寮曠敤
let noteContent, newNoteBtn, shareBtn, lockBtn, lastSavedEl, syncStatusEl, noteStatusEl, 
    shareModal, passwordModal, unlockModal, savePasswordBtn, unlockNoteBtn, copyLinkBtn,
    storageOptionsModal;

// 涓绘枃妗ｅ姞杞戒簨浠?- 搴旂敤鍞竴鍏ュ彛鐐?document.addEventListener('DOMContentLoaded', function() {
    console.log('%c Easy Note 搴旂敤宸插惎鍔?', 'background: #4CAF50; color: white; padding: 5px; border-radius: 3px;');
    console.log('%c 璋冭瘯妯″紡: ' + (DEBUG_MODE ? '寮€鍚? : '鍏抽棴'), 'background: #2196F3; color: white; padding: 3px; border-radius: 3px;');
    
    try {
        // 鍒濆鍖朌OM鍏冪礌寮曠敤
        initDOMReferences();
        
        // 鎵撳嵃鐜淇℃伅锛屾湁鍔╀簬璺ㄦ祻瑙堝櫒璋冭瘯
        const envInfo = {
            url: window.location.href,
            userAgent: navigator.userAgent,
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            cookiesEnabled: navigator.cookieEnabled,
            protocol: window.location.protocol,
            host: window.location.host
        };
        
        logInfo('Env', '娴忚鍣ㄧ幆澧冧俊鎭?, envInfo);
        
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            logWarning('Security', '搴旂敤杩愯鍦ㄩ潪HTTPS鐜涓嬶紝鏌愪簺鍔熻兘鍙兘鍙楅檺');
        }
        
        // 鍒濆鍖栨ā鎬佹
        initModals();
        
        // 鍒濆鍖栧簲鐢?        init();
        
        // 璁剧疆浜嬩欢鐩戝惉鍣?        setupEventListeners();
        
        // 閿欒娑堟伅鐐瑰嚮澶勭悊
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.addEventListener('click', function() {
                errorEl.classList.add('d-none');
            });
        }
        
        // 鎵撳嵃鎵€鏈夋寜閽殑鐘舵€?        logButtonStatus();
        
        logInfo('App', '搴旂敤鍒濆鍖栧畬鎴?);
    } catch (error) {
        console.error('鍒濆鍖栧簲鐢ㄦ椂鍑洪敊:', error);
        alert('鍒濆鍖栧簲鐢ㄥけ璐ワ紝璇峰埛鏂伴〉闈㈤噸璇? ' + error.message);
    }
});

// 璋冭瘯鍑芥暟锛氳緭鍑烘墍鏈夋寜閽殑鐘舵€?function logButtonStatus() {
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
                hasClickListener: element ? (element._hasClickListener || '鏈煡') : false
            };
            
            // 灏濊瘯娣诲姞涓€涓复鏃朵簨浠舵潵妫€娴嬫槸鍚﹀凡鏈夌偣鍑讳簨浠?            if (element) {
                const origClick = element.onclick;
                element.onclick = function() {
                    console.log(`Button '${name}' was clicked`);
                    if (origClick) return origClick.apply(this, arguments);
                };
                element._hasClickListener = true;
            }
        }
        
        console.log('%c 鎸夐挳鐘舵€?', 'background: #ff9800; color: white; padding: 3px; border-radius: 3px;', status);
        
        // 杈撳嚭妯℃€佹鐘舵€?        const modals = {
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
        
        console.log('%c 妯℃€佹鐘舵€?', 'background: #9c27b0; color: white; padding: 3px; border-radius: 3px;', modalStatus);
    } catch (error) {
        console.error('璁板綍鎸夐挳鐘舵€佹椂鍑洪敊:', error);
    }
}

// 鍒濆鍖朌OM鍏冪礌寮曠敤
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
    
    // 妫€鏌ュ厓绱犳槸鍚﹀瓨鍦?    if (!noteContent) logError('Init', '鎵句笉鍒皀oteContent鍏冪礌');
    if (!newNoteBtn) logError('Init', '鎵句笉鍒皀ewNoteBtn鍏冪礌');
    if (!shareBtn) logError('Init', '鎵句笉鍒皊hareBtn鍏冪礌');
    if (!lockBtn) logError('Init', '鎵句笉鍒發ockBtn鍏冪礌');
    if (!lastSavedEl) logError('Init', '鎵句笉鍒發astSavedEl鍏冪礌');
    if (!syncStatusEl) logError('Init', '鎵句笉鍒皊yncStatusEl鍏冪礌');
    if (!noteStatusEl) logError('Init', '鎵句笉鍒皀oteStatusEl鍏冪礌');
    if (!copyLinkBtn) logError('Init', '鎵句笉鍒癱opyLinkBtn鍏冪礌');
    if (!savePasswordBtn) logError('Init', '鎵句笉鍒皊avePasswordBtn鍏冪礌');
    if (!unlockNoteBtn) logError('Init', '鎵句笉鍒皍nlockNoteBtn鍏冪礌');
    
    logInfo('Init', 'DOM鍏冪礌寮曠敤鍒濆鍖栧畬鎴?);
}

// 鍒濆鍖朆ootstrap妯℃€佹
function initModals() {
    try {
        logInfo('Init', '鍒濆鍖栨ā鎬佹...');
        
        // 鍒濆鍖栧垎浜拰瀵嗙爜妯℃€佹
        const shareModalEl = document.getElementById('shareModal');
        if (shareModalEl) {
            shareModal = new bootstrap.Modal(shareModalEl);
            logInfo('Init', '鍒嗕韩妯℃€佹鍒濆鍖栨垚鍔?);
        } else {
            logWarning('Init', '鎵句笉鍒板垎浜ā鎬佹');
        }
        
        const passwordModalEl = document.getElementById('passwordModal');
        if (passwordModalEl) {
            passwordModal = new bootstrap.Modal(passwordModalEl);
            logInfo('Init', '瀵嗙爜妯℃€佹鍒濆鍖栨垚鍔?);
        } else {
            logWarning('Init', '鎵句笉鍒板瘑鐮佹ā鎬佹');
        }
        
        // 鍒濆鍖栧瓨鍌ㄩ€夐」妯℃€佹
        const storageOptionsModalEl = document.getElementById('storageOptionsModal');
        if (storageOptionsModalEl) {
            storageOptionsModal = new bootstrap.Modal(storageOptionsModalEl);
            logInfo('Init', '瀛樺偍閫夐」妯℃€佹鍒濆鍖栨垚鍔?);
        } else {
            logWarning('Init', '鎵句笉鍒板瓨鍌ㄩ€夐」妯℃€佹');
        }
        
        // 鍒濆鍖朑itHub浠ょ墝妯℃€佹
        const githubTokenModalEl = document.getElementById('githubTokenModal');
        if (githubTokenModalEl) {
            githubTokenModal = new bootstrap.Modal(githubTokenModalEl);
            
            // 涓篏itHub浠ょ墝妯℃€佹娣诲姞token-alert瀹瑰櫒
            const modalBody = githubTokenModalEl.querySelector('.modal-body');
            if (modalBody) {
                if (!modalBody.querySelector('.token-alert')) {
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert alert-warning token-alert';
                    alertDiv.style.display = 'none';
                    alertDiv.innerHTML = '<strong>鏉冮檺闂:</strong> 鎮ㄧ殑GitHub浠ょ墝缂哄皯蹇呰鐨刧ist鎿嶄綔鏉冮檺銆傝纭繚鎮ㄧ殑浠ょ墝鍏锋湁姝ｇ‘鐨勬潈闄愯缃€?;
                    modalBody.insertBefore(alertDiv, modalBody.firstChild);
                }
            }
            
            logInfo('Init', 'GitHub浠ょ墝妯℃€佹鍒濆鍖栨垚鍔?);
        } else {
            logWarning('Init', '鎵句笉鍒癎itHub浠ょ墝妯℃€佹');
        }
        
        // 鍒濆鍖栫瑪璁拌В閿佹ā鎬佹
        const unlockModalEl = document.getElementById('unlockModal');
        if (unlockModalEl) {
            unlockModal = new bootstrap.Modal(unlockModalEl);
            logInfo('Init', '绗旇瑙ｉ攣妯℃€佹鍒濆鍖栨垚鍔?);
        } else {
            logWarning('Init', '鎵句笉鍒扮瑪璁拌В閿佹ā鎬佹');
        }
    } catch (error) {
        logError('Init', '鍒濆鍖栨ā鎬佹鏃跺嚭閿?, error);
    }
}

// 璁剧疆浜嬩欢鐩戝惉鍣?function setupEventListeners() {
    try {
        logInfo('Init', '寮€濮嬭缃簨浠剁洃鍚櫒');
        
        // 鑾峰彇鎵€鏈塂OM鍏冪礌寮曠敤
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
        
        // 妫€鏌ュ繀瑕佺殑鎸夐挳
        if (!newNoteBtn || !shareBtn || !lockBtn) {
            logError('Init', '鏃犳硶璁剧疆浜嬩欢鐩戝惉鍣紝鍏抽敭DOM鍏冪礌涓嶅瓨鍦?);
            alert('鍒濆鍖栫晫闈㈠け璐ワ紝缂哄皯鍏抽敭鎸夐挳鍏冪礌锛岃鍒锋柊椤甸潰');
            return;
        }
        
        // 鏃ュ織姣忎釜鎸夐挳鐘舵€?        logInfo('DOM', '鎸夐挳鐘舵€佹鏌?, {
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
                logInfo('Event', '鐐瑰嚮浜嗚繑鍥炴寜閽?);
                goBack();
            });
        } else {
            logWarning('Init', '杩斿洖鎸夐挳涓嶅瓨鍦?);
        }
        
        // New note button
        newNoteBtn.addEventListener('click', function() {
            logInfo('Event', '鐐瑰嚮浜嗘柊寤虹瑪璁版寜閽?);
            createNewNote();
        });
        
        // Share button
        shareBtn.addEventListener('click', function() {
            logInfo('Event', '鐐瑰嚮浜嗗垎浜寜閽?);
            const shareLink = document.getElementById('shareLink');
            if (shareLink) {
                shareLink.value = window.location.href;
                if (shareModal) {
                    shareModal.show();
                } else {
                    logError('Event', '鍒嗕韩妯℃€佹涓嶅瓨鍦?);
                    alert('鍒嗕韩鍔熻兘鍒濆鍖栧け璐ワ紝璇峰埛鏂伴〉闈㈠悗閲嶈瘯');
                }
            }
        });
        
        // Copy link button
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗗鍒堕摼鎺ユ寜閽?);
                const shareLink = document.getElementById('shareLink');
                if (shareLink) {
                    shareLink.select();
                    document.execCommand('copy');
                    copyLinkBtn.textContent = '宸插鍒?';
                    setTimeout(() => {
                        copyLinkBtn.textContent = '澶嶅埗';
                    }, 2000);
                }
            });
        }
        
        // Lock/Encrypt button
        lockBtn.addEventListener('click', function() {
            logInfo('Event', '鐐瑰嚮浜嗗姞瀵?瑙ｉ攣鎸夐挳');
            if (isEncrypted) {
                // Already encrypted, show unlock modal
                if (unlockModal) {
                    unlockModal.show();
                } else {
                    logError('Event', '瑙ｉ攣妯℃€佹涓嶅瓨鍦?);
                    alert('瑙ｉ攣鍔熻兘鍒濆鍖栧け璐ワ紝璇峰埛鏂伴〉闈㈠悗閲嶈瘯');
                }
            } else {
                // Not encrypted, show password modal
                if (passwordModal) {
                    passwordModal.show();
                } else {
                    logError('Event', '瀵嗙爜妯℃€佹涓嶅瓨鍦?);
                    alert('鍔犲瘑鍔熻兘鍒濆鍖栧け璐ワ紝璇峰埛鏂伴〉闈㈠悗閲嶈瘯');
                }
            }
        });
        
        // Save password button
        if (savePasswordBtn) {
            savePasswordBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗕繚瀛樺瘑鐮佹寜閽?);
                const password = document.getElementById('notePassword');
                if (password && password.value) {
                    encryptNote(password.value);
                    if (passwordModal) passwordModal.hide();
                    password.value = '';
                } else {
                    alert('璇疯緭鍏ュ瘑鐮侊紒');
                }
            });
        }
        
        // Unlock note button
        if (unlockNoteBtn) {
            unlockNoteBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗚В閿佺瑪璁版寜閽?);
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
                    alert('璇疯緭鍏ュ瘑鐮侊紒');
                }
            });
        }

        // Sync status click handler
        if (syncStatusEl) {
            syncStatusEl.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗗悓姝ョ姸鎬?);
                handleSyncStatusClick();
            });
        }
        
        // 瀛樺偍閫夐」淇濆瓨鎸夐挳
        if (saveStorageOptionsBtn) {
            saveStorageOptionsBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗕繚瀛樺瓨鍌ㄩ€夐」鎸夐挳');
                handleSaveStorageOptions();
            });
        } else {
            logWarning('Init', '瀛樺偍閫夐」淇濆瓨鎸夐挳涓嶅瓨鍦?);
        }
        
        // GitHub浠ょ墝淇濆瓨鎸夐挳
        if (saveGithubTokenBtn) {
            saveGithubTokenBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗕繚瀛楪itHub浠ょ墝鎸夐挳');
                handleSaveGithubToken();
            });
        } else {
            logWarning('Init', 'GitHub浠ょ墝淇濆瓨鎸夐挳涓嶅瓨鍦?);
        }

        // 浠ょ墝璇婃柇鎸夐挳
        if (tokenDebugBtn) {
            tokenDebugBtn.addEventListener('click', async function() {
                logInfo('Event', '鐐瑰嚮浜嗕护鐗岃瘖鏂寜閽?);
                handleTokenDebug();
            });
        }

        // 绗旇ID澶嶅埗鍔熻兘
        if (noteIdDisplay) {
            noteIdDisplay.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗙瑪璁癐D鏄剧ず');
                if (currentNoteId) {
                    copyToClipboard(currentNoteId);
                }
            });
        }
        
        // 璋冭瘯鎺у埗鍙版寜閽?        if (debugConsoleBtn) {
            debugConsoleBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗚皟璇曟帶鍒跺彴鎸夐挳');
                updateDebugConsole();
                const debugConsoleModal = document.getElementById('debugConsoleModal');
                if (debugConsoleModal) {
                    const modal = new bootstrap.Modal(debugConsoleModal);
                    modal.show();
                }
            });
        }
        
        // 娓呯┖鎺у埗鍙版寜閽?        if (clearConsoleBtn) {
            clearConsoleBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗘竻绌烘帶鍒跺彴鎸夐挳');
                const consoleOutput = document.getElementById('consoleOutput');
                const networkRequests = document.getElementById('networkRequests');
                
                if (consoleOutput) {
                    consoleOutput.innerHTML = '<div class="text-muted">鎺у埗鍙板凡娓呯┖</div>';
                }
                if (networkRequests) {
                    networkRequests.innerHTML = '<div class="alert alert-info">缃戠粶璇锋眰灏嗗湪鍙戠敓鏃舵樉绀哄湪杩欓噷</div>';
                }
            });
        }
        
        // 娓呯┖瀛樺偍鎸夐挳
        if (clearStorageBtn) {
            clearStorageBtn.addEventListener('click', function() {
                logInfo('Event', '鐐瑰嚮浜嗘竻绌哄瓨鍌ㄦ寜閽?);
                if (confirm('纭畾瑕佹竻闄ゆ墍鏈夋湰鍦板瓨鍌ㄦ暟鎹悧锛熻繖灏嗗垹闄ゆ墍鏈夎缃拰鏈湴绗旇銆?)) {
                    localStorage.clear();
                    updateStorageDebug();
                    alert('瀛樺偍宸叉竻绌?);
                }
            });
        }
        
        // 鐩戝惉popstate浜嬩欢锛堟祻瑙堝櫒鍓嶈繘鍚庨€€鎸夐挳锛?        window.addEventListener('popstate', function(event) {
            logInfo('Navigation', '妫€娴嬪埌娴忚鍣ㄥ鑸簨浠?, event.state);
            checkURLChange();
        });
        
        logInfo('Init', '浜嬩欢鐩戝惉鍣ㄨ缃畬鎴?);
    } catch (error) {
        logError('Init', '浜嬩欢鐩戝惉鍣ㄨ缃け璐?, error);
        showError('鍒濆鍖栫晫闈㈠け璐ワ紝璇峰埛鏂伴〉闈㈤噸璇?, error.message);
    }
}

// 澶嶅埗鍒板壀璐存澘鐨勮緟鍔╁嚱鏁?function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            logInfo('UI', `宸插鍒舵枃鏈? ${text}`);
            showDebugAlert('宸插鍒跺埌鍓创鏉?);
        })
        .catch(err => {
            logError('UI', '澶嶅埗澶辫触', err);
            // 澶囩敤鏂规硶
            try {
                const tempInput = document.createElement('input');
                tempInput.value = text;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showDebugAlert('宸插鍒跺埌鍓创鏉?);
            } catch (e) {
                showError('澶嶅埗澶辫触锛岃鎵嬪姩澶嶅埗: ' + text);
            }
        });
}

// 澶勭悊鍚屾鐘舵€佺偣鍑?function handleSyncStatusClick() {
    if (!forceLocalOnly) {
        if (!GITHUB_TOKEN) {
            // 鏄剧ずGitHub浠ょ墝璁剧疆妯℃€佹
            const githubTokenModal = document.getElementById('githubTokenModal');
            if (githubTokenModal) {
                const modal = new bootstrap.Modal(githubTokenModal);
                modal.show();
            }
        } else if (!isCloudSyncEnabled) {
            checkCloudConnectivity();
            alert('姝ｅ湪灏濊瘯閲嶆柊杩炴帴GitHub...');
        } else {
            // 濡傛灉宸茶繛鎺ワ紝鐐瑰嚮鏄剧ず瀛樺偍閫夐」妯℃€佹
            if (storageOptionsModal) storageOptionsModal.show();
        }
    } else {
        // 濡傛灉鏄己鍒舵湰鍦版ā寮忥紝鐐瑰嚮鏄剧ず瀛樺偍閫夐」妯℃€佹
        if (storageOptionsModal) storageOptionsModal.show();
    }
}

// 澶勭悊淇濆瓨瀛樺偍閫夐」
function handleSaveStorageOptions() {
    try {
        logInfo('Storage', '寮€濮嬪鐞嗗瓨鍌ㄩ€夐」...');
        const selectedOption = document.querySelector('input[name="storageOption"]:checked');
        
        if (!selectedOption) {
            logError('Storage', '鏈壘鍒伴€変腑鐨勫瓨鍌ㄩ€夐」');
            alert('璇烽€夋嫨涓€涓瓨鍌ㄩ€夐」');
            return;
        }
        
        logInfo('Storage', `鐢ㄦ埛閫夋嫨鐨勫瓨鍌ㄩ€夐」: ${selectedOption.value}`);
        
        if (selectedOption.value === 'local') {
            forceLocalOnly = true;
            isCloudSyncEnabled = false;
            localStorage.setItem('easy_note_storage_setting', 'local');
            logInfo('Storage', '宸茶缃负浠呮湰鍦板瓨鍌ㄦā寮?);
        } else if (selectedOption.value === 'github') {
            forceLocalOnly = false;
            localStorage.setItem('easy_note_storage_setting', 'github');
            
            // 濡傛灉閫夋嫨GitHub浣嗘病鏈変护鐗岋紝鏄剧ず浠ょ墝璁剧疆妯℃€佹
            if (!GITHUB_TOKEN) {
                const githubTokenModal = document.getElementById('githubTokenModal');
                if (githubTokenModal) {
                    const modal = new bootstrap.Modal(githubTokenModal);
                    setTimeout(() => {
                        modal.show();
                    }, 500);
                    logInfo('Storage', '鏈缃瓽itHub浠ょ墝锛屾樉绀轰护鐗岃缃璇濇');
                } else {
                    logError('Storage', '鎵句笉鍒癎itHub浠ょ墝妯℃€佹');
                    alert('鏃犳硶鏄剧ずGitHub浠ょ墝璁剧疆鐣岄潰锛岃鍒锋柊椤甸潰閲嶈瘯');
                }
            } else {
                // 閲嶆柊妫€鏌ヤ簯杩炴帴
                logInfo('Storage', '姝ｅ湪妫€鏌itHub杩炴帴...');
                checkCloudConnectivity();
            }
        } else {
            logWarning('Storage', `鏈煡鐨勫瓨鍌ㄩ€夐」: ${selectedOption.value}`);
        }
        
        updateSyncStatus(isCloudSyncEnabled);
        
        // 鍏抽棴妯℃€佹
        const storageOptionsModalEl = document.getElementById('storageOptionsModal');
        if (storageOptionsModalEl) {
            const modalInstance = bootstrap.Modal.getInstance(storageOptionsModalEl);
            if (modalInstance) {
                modalInstance.hide();
                logInfo('Storage', '宸插叧闂瓨鍌ㄩ€夐」瀵硅瘽妗?);
            } else {
                logWarning('Storage', '鏃犳硶鑾峰彇瀛樺偍閫夐」妯℃€佹瀹炰緥');
            }
        } else {
            logWarning('Storage', '鎵句笉鍒板瓨鍌ㄩ€夐」妯℃€佹鍏冪礌');
        }
    } catch (error) {
        logError('Storage', '澶勭悊瀛樺偍閫夐」鏃跺嚭閿?, error);
        alert('淇濆瓨瀛樺偍璁剧疆澶辫触: ' + error.message);
    }
}

// 澶勭悊淇濆瓨GitHub浠ょ墝
function handleSaveGithubToken() {
    const tokenInput = document.getElementById('githubToken');
    
    if (tokenInput) {
        let token = tokenInput.value.trim();
        
        if (token) {
            // 澶勭悊浠ょ墝鏍煎紡锛岀Щ闄ゅ彲鑳界殑寮曞彿鎴栫┖鏍?            token = token.replace(/['"]/g, '').trim();
            
            logInfo('Token', `鍑嗗楠岃瘉浠ょ墝 (${maskToken(token)})`);
            
            // 鍏堣繘琛岄獙璇?            validateGithubToken(token)
                .then(valid => {
                    if (valid) {
                        // 楠岃瘉鎴愬姛锛屼繚瀛樹护鐗?                        localStorage.setItem('easy_note_github_token', token);
                        GITHUB_TOKEN = token;
                        
                        // 闅愯棌妯℃€佹
                        const githubTokenModal = document.getElementById('githubTokenModal');
                        if (githubTokenModal) {
                            bootstrap.Modal.getInstance(githubTokenModal).hide();
                        }
                        
                        // 妫€鏌ヨ繛鎺?                        checkCloudConnectivity();
                        
                        showDebugAlert('GitHub浠ょ墝宸蹭繚瀛樺苟楠岃瘉鎴愬姛銆傛鍦ㄥ皾璇曡繛鎺?..');
                    } else {
                        // 楠岃瘉澶辫触
                        showError('GitHub浠ょ墝楠岃瘉澶辫触锛岃妫€鏌ユ槸鍚︽湁姝ｇ‘鐨刧ist鏉冮檺');
                    }
                })
                .catch(error => {
                    logError('Token', '楠岃瘉GitHub浠ょ墝鏃跺嚭閿?, error);
                    showError('楠岃瘉GitHub浠ょ墝鏃跺嚭閿?, error.message);
                });
        } else {
            alert('璇疯緭鍏ユ湁鏁堢殑GitHub浠ょ墝');
        }
    }
}

// 澶勭悊浠ょ墝璇婃柇
async function handleTokenDebug() {
    const tokenInput = document.getElementById('githubToken');
    
    if (tokenInput) {
        let token = tokenInput.value.trim();
        
        if (!token) {
            alert('璇峰厛杈撳叆GitHub浠ょ墝鍐嶈繘琛岃瘖鏂?);
            return;
        }
        
        // 澶勭悊浠ょ墝鏍煎紡
        token = token.replace(/['"]/g, '').trim();
        
        // 鏄剧ず璇婃柇淇℃伅
        showDebugAlert('姝ｅ湪妫€鏌itHub浠ょ墝锛岃绋嶅€?..');
        
        try {
            // 鏄剧ず浠ょ墝绫诲瀷淇℃伅
            let tokenType = "鏈煡绫诲瀷";
            let authPrefix = "鏈煡";
            
            if (token.startsWith('github_pat_')) {
                tokenType = "Fine-grained Personal Access Token";
                authPrefix = "Bearer";
            } else if (token.startsWith('ghp_')) {
                tokenType = "Classic Personal Access Token";
                authPrefix = "token";
            } else {
                tokenType = "鍙兘鏄嚜瀹氫箟鏍煎紡鐨勪护鐗?;
                authPrefix = "token";
            }
            
            logInfo('Token', `浠ょ墝璇婃柇 - 妫€娴嬪埌鐨勪护鐗岀被鍨? ${tokenType}, 灏嗕娇鐢?{authPrefix}鍓嶇紑`);
            
            // 鍒涘缓璇婃柇缁撴灉
            const diagResults = document.createElement('div');
            diagResults.innerHTML = `
                <h5>GitHub浠ょ墝璇婃柇</h5>
                <div class="mb-3">
                    <strong>浠ょ墝绫诲瀷:</strong> ${tokenType}<br>
                    <strong>璁よ瘉鍓嶇紑:</strong> ${authPrefix}<br>
                    <strong>浠ょ墝闀垮害:</strong> ${token.length}瀛楃<br>
                </div>
                <div class="alert alert-info">
                    姝ｅ湪楠岃瘉浠ょ墝鏉冮檺锛岃绋嶅€?..
                </div>
            `;
            
            // 鏄剧ず璇婃柇瀵硅瘽妗?            const diagModal = createDiagResultModal();
            const diagBody = diagModal.querySelector('.modal-body');
            diagBody.innerHTML = '';
            diagBody.appendChild(diagResults);
            const bsModal = new bootstrap.Modal(diagModal);
            bsModal.show();
            
            // 寮€濮嬭瘖鏂?            const results = await diagnoseGitHubToken(token);
            
            // 鏇存柊璇婃柇缁撴灉
            const statusDiv = diagResults.querySelector('.alert');
            
            if (results.canAuthenticate && results.canCreateGist && results.canReadGist && results.canUpdateGist && results.canDeleteGist) {
                statusDiv.className = 'alert alert-success';
                statusDiv.innerHTML = `
                    <i class="bi bi-check-circle"></i> <strong>浠ょ墝楠岃瘉鎴愬姛!</strong><br>
                    - 鍩烘湰璁よ瘉: 鎴愬姛<br>
                    - Gist鏉冮檺: 鎴愬姛<br>
                    - 鐢ㄦ埛鍚? ${results.userName}<br>
                    <hr>
                    <div class="mt-2">
                        <strong>璇︾粏鏉冮檺妫€鏌?</strong><br>
                        - 鍒涘缓Gist: ${results.canCreateGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                        - 璇诲彇Gist: ${results.canReadGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                        - 鏇存柊Gist: ${results.canUpdateGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                        - 鍒犻櫎Gist: ${results.canDeleteGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                    </div>
                `;
            } else if (results.canAuthenticate && !results.canCreateGist) {
                statusDiv.className = 'alert alert-warning';
                statusDiv.innerHTML = `
                    <i class="bi bi-exclamation-triangle"></i> <strong>浠ょ墝璁よ瘉鎴愬姛锛屼絾Gist鏉冮檺楠岃瘉澶辫触</strong><br>
                    - 鍩烘湰璁よ瘉: 鎴愬姛<br>
                    - Gist鏉冮檺: <span class="text-danger">澶辫触</span><br>
                    - 鐢ㄦ埛鍚? ${results.userName}<br>
                    <hr>
                    <div class="text-danger mt-2">
                        璇风‘淇濆湪GitHub璁剧疆涓负姝や护鐗屽嬀閫変簡"gist"鏉冮檺銆?br>
                        <a href="https://github.com/settings/tokens" target="_blank" class="btn btn-sm btn-outline-danger mt-1">
                            <i class="bi bi-github"></i> 鍓嶅線GitHub浠ょ墝璁剧疆
                        </a>
                    </div>
                `;
            } else if (!results.canAuthenticate) {
                statusDiv.className = 'alert alert-danger';
                statusDiv.innerHTML = `
                    <i class="bi bi-x-circle"></i> <strong>浠ょ墝璁よ瘉澶辫触</strong><br>
                    鍙兘鐨勫師鍥?<br>
                    - 浠ょ墝宸茶繃鏈?br>
                    - 浠ょ墝宸茶鍚婇攢<br>
                    - 浠ょ墝鏍煎紡涓嶆纭?br>
                    <hr>
                    <div class="text-danger mt-2">
                        ${results.errors.join('<br>')}
                    </div>
                `;
            } else {
                statusDiv.className = 'alert alert-warning';
                statusDiv.innerHTML = `
                    <i class="bi bi-exclamation-triangle"></i> <strong>浠ょ墝楠岃瘉閮ㄥ垎澶辫触</strong><br>
                    - 鍩烘湰璁よ瘉: ${results.canAuthenticate ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                    - Gist鏉冮檺: ${results.canCreateGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                    ${results.userName ? `- 鐢ㄦ埛鍚? ${results.userName}<br>` : ''}
                    <hr>
                    <div class="mt-2">
                        <strong>璇︾粏鏉冮檺妫€鏌?</strong><br>
                        - 鍒涘缓Gist: ${results.canCreateGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                        - 璇诲彇Gist: ${results.canReadGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                        - 鏇存柊Gist: ${results.canUpdateGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                        - 鍒犻櫎Gist: ${results.canDeleteGist ? '鉁?鎴愬姛' : '鉁?澶辫触'}<br>
                    </div>
                    <hr>
                    <div class="text-danger mt-2">
                        ${results.errors.join('<br>')}
                    </div>
                `;
            }
            
            // 娣诲姞浣跨敤姝や护鐗岀殑鎸夐挳
            if (results.canAuthenticate) {
                const btnDiv = document.createElement('div');
                btnDiv.className = 'mt-3 text-center';
                btnDiv.innerHTML = `
                    <button class="btn btn-primary use-token-btn">
                        <i class="bi bi-check2"></i> 浣跨敤姝や护鐗?                    </button>
                `;
                diagResults.appendChild(btnDiv);
                
                // 娣诲姞浣跨敤浠ょ墝鐨勪簨浠?                const useTokenBtn = btnDiv.querySelector('.use-token-btn');
                if (useTokenBtn) {
                    useTokenBtn.addEventListener('click', function() {
                        if (!results.canCreateGist || !results.canUpdateGist) {
                            if (!confirm('杩欎釜浠ょ墝缂哄皯瀹屾暣鐨凣ist鎿嶄綔鏉冮檺锛岃繖鍙兘瀵艰嚧閮ㄥ垎鍔熻兘涓嶅彲鐢ㄣ€傜‘瀹氳缁х画浣跨敤鍚楋紵')) {
                                return;
                            }
                        }
                        
                        // 淇濆瓨浠ょ墝
                        localStorage.setItem('easy_note_github_token', token);
                        GITHUB_TOKEN = token;
                        
                        // 鍏抽棴璇婃柇瀵硅瘽妗?                        bootstrap.Modal.getInstance(diagModal).hide();
                        
                        // 鍏抽棴浠ょ墝璁剧疆瀵硅瘽妗?                        const githubTokenModal = document.getElementById('githubTokenModal');
                        if (githubTokenModal) {
                            bootstrap.Modal.getInstance(githubTokenModal).hide();
                        }
                        
                        // 妫€鏌ヨ繛鎺?                        checkCloudConnectivity();
                        
                        showDebugAlert('GitHub浠ょ墝宸蹭繚瀛樸€傛鍦ㄥ皾璇曡繛鎺?..');
                    });
                }
            }
        } catch (error) {
            logError('Token', '璇婃柇GitHub浠ょ墝鏃跺嚭閿?, error);
            showError('璇婃柇GitHub浠ょ墝鏃跺嚭閿?, error.message);
        }
    }
}

// 淇璇婃柇鍑芥暟锛屼娇鍏惰兘澶熷畬鏁撮獙璇丟ist鏉冮檺
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
        // 1. 妫€鏌ヤ护鐗屾牸寮?        if (!token || token.length < 10) {
            results.errors.push('浠ょ墝鏍煎紡鏃犳晥锛屽お鐭?);
        } else {
            results.validFormat = true;
        }
        
        // 涓存椂鍒涘缓浠ょ墝鏍煎紡鐨勬巿鏉冨ご
        function getTempAuthHeaders(includeContentType = false) {
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            // 鏍规嵁浠ょ墝绫诲瀷浣跨敤涓嶅悓鐨勫墠缂€
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
            
            // 娣诲姞Cache-Control澶达紝闃叉缂撳瓨骞叉壈
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            headers['Pragma'] = 'no-cache';
            
            return headers;
        }
        
        // 2. 妫€鏌ュ熀鏈璇?        try {
            const userOptions = createFetchOptions('GET', getTempAuthHeaders());
            const userResponse = await fetch(`${API_BASE_URL}/user`, userOptions);
            
            if (userResponse.ok) {
                results.canAuthenticate = true;
                const userData = await userResponse.json();
                results.userName = userData.login;
                logInfo('Debug', `璁よ瘉鎴愬姛锛岀敤鎴? ${userData.login}`);
            } else {
                let errorText = await userResponse.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.message) {
                        errorText = errorJson.message;
                    }
                } catch(e) {
                    // 濡傛灉涓嶆槸JSON锛屼繚鎸佸師鏂囨湰
                }
                
                results.errors.push(`璁よ瘉澶辫触: HTTP ${userResponse.status} - ${errorText}`);
                logError('Debug', '璁よ瘉澶辫触', errorText);
            }
        } catch (authError) {
            results.errors.push(`璁よ瘉璇锋眰鍑洪敊: ${authError.message}`);
        }
        
        // 3. 濡傛灉鍩烘湰璁よ瘉鎴愬姛锛屾鏌ist鏉冮檺
        if (results.canAuthenticate) {
            try {
                // 灏濊瘯鍒涘缓涓€涓祴璇昰ist
                const gistResponse = await fetch(`${API_BASE_URL}/gists`, {
                    method: 'POST',
                    headers: getTempAuthHeaders(true),
                    body: JSON.stringify({
                        description: 'Easy Note Test Gist',
                        public: false,
                        files: {
                            'test.txt': {
                                content: 'This is a test gist to verify permissions.'
                            }
                        }
                    }),
                    credentials: 'omit' // 绂佺敤娴忚鍣ㄨ嚜鍔ㄥ彂閫佹湰鍦板嚟鎹?                });
                
                if (gistResponse.ok) {
                    results.canCreateGist = true;
                    results.hasGistScope = true;
                    
                    // 鑾峰彇鍒涘缓鐨刧ist ID骞惰繘琛岃鍙栧拰鏇存柊娴嬭瘯
                    const gistData = await gistResponse.json();
                    logInfo('Debug', `娴嬭瘯Gist鍒涘缓鎴愬姛锛孖D: ${gistData.id}`);
                    
                    // 娴嬭瘯璇诲彇鍔熻兘
                    try {
                        const readResponse = await fetch(`${API_BASE_URL}/gists/${gistData.id}`, {
                            method: 'GET',
                            headers: getTempAuthHeaders(),
                            credentials: 'omit' // 绂佺敤娴忚鍣ㄨ嚜鍔ㄥ彂閫佹湰鍦板嚟鎹?                        });
                        
                        if (readResponse.ok) {
                            results.canReadGist = true;
                            logInfo('Debug', '娴嬭瘯Gist璇诲彇鎴愬姛');
                        } else {
                            results.errors.push(`鏃犳硶璇诲彇Gist: HTTP ${readResponse.status}`);
                            logWarning('Debug', `璇诲彇娴嬭瘯Gist澶辫触: ${readResponse.status}`);
                        }
                    } catch (readError) {
                        results.errors.push(`璇诲彇Gist鍑洪敊: ${readError.message}`);
                    }
                    
                    // 娴嬭瘯鏇存柊鍔熻兘
                    try {
                        const updateResponse = await fetch(`${API_BASE_URL}/gists/${gistData.id}`, {
                            method: 'PATCH',
                            headers: getTempAuthHeaders(true),
                            body: JSON.stringify({
                                description: 'Easy Note Test Gist (Updated)',
                                files: {
                                    'test.txt': {
                                        content: 'This is an updated test gist.'
                                    }
                                }
                            }),
                            credentials: 'omit' // 绂佺敤娴忚鍣ㄨ嚜鍔ㄥ彂閫佹湰鍦板嚟鎹?                        });
                        
                        if (updateResponse.ok) {
                            results.canUpdateGist = true;
                            logInfo('Debug', '娴嬭瘯Gist鏇存柊鎴愬姛');
                        } else {
                            results.errors.push(`鏃犳硶鏇存柊Gist: HTTP ${updateResponse.status}`);
                            logWarning('Debug', `鏇存柊娴嬭瘯Gist澶辫触: ${updateResponse.status}`);
                        }
                    } catch (updateError) {
                        results.errors.push(`鏇存柊Gist鍑洪敊: ${updateError.message}`);
                    }
                    
                    // 娓呯悊娴嬭瘯gist
                    if (gistData && gistData.id) {
                        try {
                            const deleteResponse = await fetch(`${API_BASE_URL}/gists/${gistData.id}`, {
                                method: 'DELETE',
                                headers: getTempAuthHeaders(),
                                credentials: 'omit' // 绂佺敤娴忚鍣ㄨ嚜鍔ㄥ彂閫佹湰鍦板嚟鎹?                            });
                            
                            if (deleteResponse.ok) {
                                results.canDeleteGist = true;
                                logInfo('Debug', '娴嬭瘯Gist鍒犻櫎鎴愬姛');
                            } else {
                                results.errors.push(`鏃犳硶鍒犻櫎Gist: HTTP ${deleteResponse.status}`);
                                logWarning('Debug', `鍒犻櫎娴嬭瘯Gist澶辫触: ${deleteResponse.status}`);
                            }
                        } catch (deleteError) {
                            results.errors.push(`鍒犻櫎Gist鍑洪敊: ${deleteError.message}`);
                            logError('Debug', '鍒犻櫎娴嬭瘯Gist鍑洪敊', deleteError);
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
                        // 濡傛灉涓嶆槸JSON锛屼繚鎸佸師鏂囨湰
                    }
                    
                    results.errors.push(`Gist鍒涘缓澶辫触: HTTP ${gistResponse.status} - ${errorText}`);
                    
                    if (gistResponse.status === 403) {
                        results.errors.push('浠ょ墝缂哄皯gist鏉冮檺锛岃鍦℅itHub token璁剧疆涓嬀閫塯ist鏉冮檺');
                    }
                }
            } catch (gistError) {
                results.errors.push(`Gist鏉冮檺妫€鏌ュ嚭閿? ${gistError.message}`);
            }
        }
        
        return results;
    } catch (error) {
        results.errors.push(`璇婃柇杩囩▼鍑洪敊: ${error.message}`);
        return results;
    }
}

// 鍒涘缓璇婃柇缁撴灉妯℃€佹
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
                    <h5 class="modal-title" id="diagResultModalLabel">璇婃柇缁撴灉</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="diagResultContent">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">鍏抽棴</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    return modalDiv;
}

// 璋冭瘯鎺у埗鍙板姛鑳?const debugConsoleBtn = document.getElementById('debugConsoleBtn');
const debugConsoleModal = document.getElementById('debugConsoleModal');
const consoleOutput = document.getElementById('consoleOutput');
const networkRequests = document.getElementById('networkRequests');
const localStorageData = document.getElementById('localStorageData');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');

// 鍒濆鍖栬皟璇曟帶鍒跺彴
if (debugConsoleBtn && debugConsoleModal) {
    // 鏄剧ず璋冭瘯鎺у埗鍙?    debugConsoleBtn.addEventListener('click', function() {
        updateDebugConsole();
        const modal = new bootstrap.Modal(debugConsoleModal);
        modal.show();
    });
    
    // 娓呯┖鎺у埗鍙?    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', function() {
            if (consoleOutput) {
                consoleOutput.innerHTML = '<div class="text-muted">鎺у埗鍙板凡娓呯┖</div>';
            }
            if (networkRequests) {
                networkRequests.innerHTML = '<div class="alert alert-info">缃戠粶璇锋眰灏嗗湪鍙戠敓鏃舵樉绀哄湪杩欓噷</div>';
            }
        });
    }
    
    // 娓呯┖瀛樺偍
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', function() {
            if (confirm('纭畾瑕佹竻闄ゆ墍鏈夋湰鍦板瓨鍌ㄦ暟鎹悧锛熻繖灏嗗垹闄ゆ墍鏈夎缃拰鏈湴绗旇銆?)) {
                localStorage.clear();
                updateStorageDebug();
                alert('瀛樺偍宸叉竻绌?);
            }
        });
    }
    
    // 閲嶅啓console鏂规硶浠ユ崟鑾锋棩蹇?    if (DEBUG_MODE && consoleOutput) {
        // 淇濆瓨鍘熷console鏂规硶
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        // 娣诲姞鏃ュ織鍒拌皟璇曟帶鍒跺彴
        function addLogToConsole(type, args) {
            if (!consoleOutput) return;
            
            const logEntry = document.createElement('div');
            let style = '';
            let prefix = '';
            
            switch (type) {
                case 'error':
                    style = 'color: #F44336;';
                    prefix = '鉂?';
                    break;
                case 'warn':
                    style = 'color: #FF9800;';
                    prefix = '鈿狅笍 ';
                    break;
                case 'info':
                    style = 'color: #2196F3;';
                    prefix = '鈩癸笍 ';
                    break;
                default:
                    style = 'color: #fff;';
            }
            
            // 鏍煎紡鍖栨秷鎭?            let message = '';
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
            
            // 鑷姩婊氬姩鍒板簳閮?            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
        
        // 閲嶅啓console鏂规硶
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
        
        // 娣诲姞缃戠粶璇锋眰璁板綍
        function addNetworkRequest(method, url, status, success) {
            if (!networkRequests) return;
            
            // 娓呴櫎鍒濆鎻愮ず
            if (networkRequests.querySelector('.alert-info')) {
                networkRequests.innerHTML = '';
            }
            
            const requestEntry = document.createElement('div');
            requestEntry.className = `alert alert-${success ? 'success' : 'danger'} alert-sm mb-2`;
            
            const statusClass = status < 300 ? 'text-success' : 'text-danger';
            
            requestEntry.innerHTML = `
                <div><strong>${method}</strong> ${url}</div>
                <div class="${statusClass}">鐘舵€? ${status}</div>
                <div class="text-muted small">${new Date().toLocaleTimeString()}</div>
            `;
            
            networkRequests.appendChild(requestEntry);
        }
        
        // 鎷︽埅fetch璇锋眰
        const originalFetch = window.fetch;
        window.fetch = function() {
            const method = arguments[1]?.method || 'GET';
            const url = arguments[0];
            
            // 璁板綍璇锋眰
            console.log(`%c馃寪 鍙戦€佽姹? ${method} ${url}`, 'color: #4CAF50;');
            
            return originalFetch.apply(this, arguments)
                .then(response => {
                    // 璁板綍鍝嶅簲
                    const success = response.ok;
                    const status = response.status;
                    
                    console.log(`%c鉁?鏀跺埌鍝嶅簲: ${method} ${url} (${status})`, 
                                success ? 'color: #4CAF50;' : 'color: #F44336;');
                    
                    addNetworkRequest(method, url, status, success);
                    
                    return response;
                })
                .catch(error => {
                    // 璁板綍閿欒
                    console.error(`%c鉂?璇锋眰閿欒: ${method} ${url}`, 'color: #F44336;', error);
                    addNetworkRequest(method, url, 0, false);
                    
                    throw error;
                });
        };
    }
}

// 鏇存柊璋冭瘯鎺у埗鍙板唴瀹?function updateDebugConsole() {
    updateStorageDebug();
}

// 鏇存柊瀛樺偍璋冭瘯淇℃伅
function updateStorageDebug() {
    if (localStorageData) {
        // 鑾峰彇鎵€鏈塴ocalStorage鏁版嵁
        let storageContent = '';
        
        if (localStorage.length === 0) {
            storageContent = '<div class="text-muted">鏈湴瀛樺偍涓虹┖</div>';
        } else {
            storageContent = '{\n';
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                let value = localStorage.getItem(key);
                
                // 灏濊瘯鏍煎紡鍖朖SON
                try {
                    if (value.startsWith('{') || value.startsWith('[')) {
                        const parsed = JSON.parse(value);
                        value = JSON.stringify(parsed, null, 2);
                    }
                } catch (e) {
                    // 涓嶆槸鏈夋晥鐨凧SON锛屼繚鎸佸師鏍?                }
                
                // 瀵逛簬token锛岄殣钘忓ぇ閮ㄥ垎鍐呭
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

// 妫€鏌RL鍙樺寲鐨勫嚱鏁?function checkURLChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const noteIdInURL = urlParams.get('id');
    
    if (noteIdInURL !== currentNoteId) {
        logInfo('Navigation', `URL涓殑绗旇ID (${noteIdInURL}) 涓庡綋鍓嶅姞杞界殑绗旇ID (${currentNoteId}) 涓嶄竴鑷达紝閲嶆柊鍔犺浇`);
        
        if (noteIdInURL) {
            loadNote(noteIdInURL);
        } else {
            createNewNote();
        }
    }
}

// 鐩戝惉popstate浜嬩欢锛堟祻瑙堝櫒鍓嶈繘鍚庨€€鎸夐挳锛?window.addEventListener('popstate', function(event) {
    logInfo('Navigation', '妫€娴嬪埌娴忚鍣ㄥ鑸簨浠?, event.state);
    checkURLChange();
});

// 娣诲姞绗旇ID鏄剧ず鍔熻兘
function updateNoteIdDisplay() {
    const noteIdValue = document.getElementById('noteIdValue');
    const noteIdDisplay = document.getElementById('noteIdDisplay');
    
    if (noteIdValue) {
        if (currentNoteId) {
            // 鏄剧ず鐭増鏈殑ID
            const shortId = currentNoteId.length > 8 ? 
                            currentNoteId.substring(0, 4) + '...' + currentNoteId.substring(currentNoteId.length - 4) : 
                            currentNoteId;
            
            noteIdValue.textContent = shortId;
            noteIdDisplay.title = `鐐瑰嚮澶嶅埗瀹屾暣绗旇ID: ${currentNoteId}`;
            noteIdDisplay.style.display = 'inline';
        } else {
            noteIdValue.textContent = '';
            noteIdDisplay.style.display = 'none';
        }
    }
}

// 鍚庨€€鎸夐挳澶勭悊鍑芥暟
function goBack() {
    logInfo('Navigation', '璋冪敤鍚庨€€鍔熻兘');
    
    try {
        // 妫€鏌ユ祻瑙堝櫒鍘嗗彶璁板綍涓槸鍚︽湁鍓嶄竴椤?        if (window.history.length > 1) {
            window.history.back();
            logInfo('Navigation', '浣跨敤娴忚鍣ㄥ巻鍙茶繑鍥炰笂涓€椤?);
        } else {
            // 濡傛灉娌℃湁鍘嗗彶璁板綍锛屽垱寤轰竴涓柊绗旇
            logInfo('Navigation', '娌℃湁鍘嗗彶璁板綍锛屽垱寤烘柊绗旇');
            createNewNote();
        }
    } catch (error) {
        logError('Navigation', '鍚庨€€鎿嶄綔澶辫触', error);
        showError('鍚庨€€鎿嶄綔澶辫触', error.message);
        
        // 鍑洪敊鏃朵篃鍒涘缓涓€涓柊绗旇
        createNewNote();
    }
}

// 澶勭悊GitHub鏉冮檺闂鐨勫嚱鏁?function handleGitHubPermissionIssue(errorMessage = null) {
    // 鏌ョ湅鏄惁鏄剧ず浜咷itHub Token璁剧疆瀵硅瘽妗?    let tokenModalShown = false;
    if (document.getElementById('githubTokenModal')) {
        const githubTokenModal = new bootstrap.Modal(document.getElementById('githubTokenModal'));
        githubTokenModal.show();
        tokenModalShown = true;
    }
    
    // 鏋勫缓鎻愮ず淇℃伅
    const message = errorMessage || 'GitHub浠ょ墝鏉冮檺闂';
    
    // 娣诲姞鍏充簬.netrc鏂囦欢鐨勬彁绀?    const detailMessage = `
        ${message}
        
        鍙兘鐨勫師鍥?
        1. 浠ょ墝鍙兘鏃犳晥鎴栧凡杩囨湡
        2. 浠ょ墝鏉冮檺涓嶈冻锛岃纭繚鍕鹃€変簡"gist"鏉冮檺
        3. 鎮ㄧ殑绯荤粺涓彲鑳藉瓨鍦?netrc鎴朹netrc鏂囦欢骞叉壈璇锋眰璁よ瘉
        
        瑙ｅ喅鏂规:
        - 灏濊瘯鍒涘缓涓€涓柊鐨凣itHub璁块棶浠ょ墝
        - 妫€鏌ユ偍鐨凥OME鐩綍(${navigator.platform.includes('Win') ? 'C:\\Users\\鎮ㄧ殑鐢ㄦ埛鍚? : '~/'}涓嬫槸鍚﹀瓨鍦?netrc鎴朹netrc鏂囦欢
        - 濡傛灉瀛樺湪锛岃灏濊瘯閲嶅懡鍚嶆垨鍒犻櫎杩欎簺鏂囦欢
        - 鍦ㄩ殣绉?鏃犵棔妯″紡涓嬪皾璇曚娇鐢ㄦ搴旂敤
    `;
    
    // 鏄剧ず閿欒鎻愮ず
    showError(message, detailMessage);
    
    // 濡傛灉娌℃湁鏄剧ずToken璁剧疆瀵硅瘽妗嗭紝娣诲姞璇婃柇鎸夐挳
    if (!tokenModalShown) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            // 娣诲姞璇婃柇鎸夐挳
            const diagButton = document.createElement('button');
            diagButton.className = 'btn btn-sm btn-info mt-2';
            diagButton.innerText = '杩愯浠ょ墝璇婃柇';
            diagButton.onclick = () => {
                // 妫€鏌ユ湰鍦板瓨鍌ㄧ殑token
                if (GITHUB_TOKEN) {
                    handleTokenDebug();
                } else {
                    // 濡傛灉娌℃湁token锛屾樉绀鸿缃?                    if (document.getElementById('githubTokenModal')) {
                        const githubTokenModal = new bootstrap.Modal(document.getElementById('githubTokenModal'));
                        githubTokenModal.show();
                    }
                }
            };
            
            // 娣诲姞璁剧疆鎸夐挳
            const settingsButton = document.createElement('button');
            settingsButton.className = 'btn btn-sm btn-primary mt-2 ms-2';
            settingsButton.innerText = '鎵撳紑GitHub璁剧疆';
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

// 娣诲姞createFetchOptions鍑芥暟
function createFetchOptions(method, headers, body = null) {
    const options = {
        method: method,
        headers: headers,
        credentials: 'omit', // 绂佺敤娴忚鍣ㄨ嚜鍔ㄥ彂閫佹湰鍦板嚟鎹?        mode: 'cors',        // 鏄庣‘璁剧疆涓篊ORS妯″紡
        cache: 'no-store'    // 绂佺敤缂撳瓨
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    return options;
}
