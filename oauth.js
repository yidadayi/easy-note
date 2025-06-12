// GitHub OAuth 认证处理模块
// 处理GitHub OAuth流程和令牌管理

// 配置
const OAUTH_CLIENT_ID = '9b6a80ea2912175c54b0';
const OAUTH_SCOPE = 'gist';
const OAUTH_STORAGE_KEY = 'easy_note_oauth_token';
const OAUTH_STATE_KEY = 'easy_note_oauth_state';
const OAUTH_NOTE_ID_KEY = 'easy_note_oauth_return_note_id';
const OAUTH_NETLIFY_FUNCTION = '/.netlify/functions/github-oauth';

// 公开API
const GitHubOAuth = {
    /**
     * 初始化OAuth处理
     */
    initialize: function() {
        console.log('[GitHubOAuth] 初始化');
        
        // 检查URL是否含有授权码
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state) {
            // 有授权码，进行认证流程
            console.log('[GitHubOAuth] 检测到授权码，处理认证');
            this.handleAuthCode(code, state);
            return true; // 正在处理授权
        }
        
        return false; // 无需处理授权
    },
    
    /**
     * 请求GitHub授权
     */
    requestGitHubAuthorization: function() {
        console.log('[GitHubOAuth] 请求GitHub授权');
        
        // 保存当前笔记ID，用于授权后返回
        if (window.currentNoteId) {
            localStorage.setItem(OAUTH_NOTE_ID_KEY, window.currentNoteId);
        }
        
        // 生成随机state
        const state = this.generateRandomState();
        localStorage.setItem(OAUTH_STATE_KEY, state);
        
        // 构建授权URL
        const redirectUri = encodeURIComponent(window.location.origin);
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${OAUTH_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${OAUTH_SCOPE}&state=${state}`;
        
        // 跳转到授权页面
        window.location.href = authUrl;
    },
    
    /**
     * 处理授权码
     */
    handleAuthCode: async function(code, state) {
        console.log('[GitHubOAuth] 处理授权码');
        
        // 验证state参数
        const savedState = localStorage.getItem(OAUTH_STATE_KEY);
        if (state !== savedState) {
            console.error('[GitHubOAuth] 状态参数不匹配，可能是CSRF攻击');
            window.alert('认证失败：状态参数不匹配');
            return;
        }
        
        // 清除state
        localStorage.removeItem(OAUTH_STATE_KEY);
        
        try {
            // 使用Netlify函数交换令牌
            const exchangeUrl = `${OAUTH_NETLIFY_FUNCTION}?code=${code}&state=${state}`;
            console.log(`[GitHubOAuth] 交换令牌: ${exchangeUrl}`);
            
            const response = await fetch(exchangeUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`交换令牌失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[GitHubOAuth] 令牌交换成功');
            
            if (data.error) {
                throw new Error(`交换令牌错误: ${data.error}`);
            }
            
            if (!data.access_token) {
                throw new Error('返回数据中没有访问令牌');
            }
            
            // 保存令牌
            this.saveToken(data.access_token);
            
            // 尝试验证令牌
            const validationResult = await this.validateToken();
            if (!validationResult.valid) {
                throw new Error(`令牌验证失败: ${validationResult.error}`);
            }
            
            console.log('[GitHubOAuth] 授权完成，令牌已验证');
            
            // 通知 CloudStorage 模块令牌已更新
            if (window.CloudStorage) {
                CloudStorage.setToken(data.access_token);
            }
            
            // 恢复笔记ID并重定向
            const noteId = localStorage.getItem(OAUTH_NOTE_ID_KEY);
            localStorage.removeItem(OAUTH_NOTE_ID_KEY);
            
            // 重定向到原始笔记页面
            const baseUrl = window.location.origin + window.location.pathname;
            if (noteId) {
                window.location.href = `${baseUrl}?id=${noteId}`;
            } else {
                window.location.href = baseUrl;
            }
            
            return true;
        } catch (error) {
            console.error('[GitHubOAuth] 授权处理错误:', error);
            window.alert(`GitHub认证失败: ${error.message}\n请重试或联系管理员。`);
            return false;
        }
    },
    
    /**
     * 验证OAuth令牌
     */
    validateToken: async function() {
        const token = this.getToken();
        
        if (!token) {
            return {
                valid: false,
                error: '无令牌'
            };
        }
        
        try {
            const response = await fetch('https://gh-api.onrender.com/api/v3/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                return {
                    valid: false,
                    error: `HTTP错误: ${response.status}`
                };
            }
            
            const data = await response.json();
            return {
                valid: true,
                username: data.login
            };
        } catch (error) {
            console.error('[GitHubOAuth] 验证令牌错误:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    },
    
    /**
     * 获取OAuth令牌
     */
    getToken: function() {
        return localStorage.getItem(OAUTH_STORAGE_KEY);
    },
    
    /**
     * 保存OAuth令牌
     */
    saveToken: function(token) {
        // 将令牌保存到本地
        localStorage.setItem(OAUTH_STORAGE_KEY, token);
        
        // 同时启用云同步设置
        localStorage.setItem('easy_note_cloud_sync', 'true');
    },
    
    /**
     * 清除OAuth令牌
     */
    clearToken: function() {
        localStorage.removeItem(OAUTH_STORAGE_KEY);
    },
    
    /**
     * 检查是否有有效的OAuth令牌
     */
    hasValidOAuthToken: function() {
        return !!this.getToken();
    },
    
    /**
     * 生成随机state参数(防CSRF)
     */
    generateRandomState: function() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
};

// 导出模块
window.GitHubOAuth = GitHubOAuth; 