// GitHub OAuth认证处理模块
const OAUTH_CLIENT_ID = 'YOUR_GITHUB_OAUTH_APP_CLIENT_ID'; // 需要替换为您的GitHub OAuth应用Client ID
const REDIRECT_URI = window.location.origin + window.location.pathname;
const OAUTH_SCOPE = 'gist';
const STORAGE_KEY_TOKEN = 'easy_note_oauth_token';
const STORAGE_KEY_STATE = 'easy_note_oauth_state';

// 生成随机状态值防止CSRF攻击
function generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 初始化OAuth流程
function initiateOAuthFlow() {
    // 生成并保存状态值
    const state = generateRandomState();
    localStorage.setItem(STORAGE_KEY_STATE, state);
    
    // 构建授权URL
    const authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${OAUTH_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=${OAUTH_SCOPE}&` +
        `state=${state}`;
    
    // 跳转到GitHub授权页面
    window.location.href = authUrl;
}

// 检查是否有可用的OAuth令牌
function hasValidOAuthToken() {
    return !!localStorage.getItem(STORAGE_KEY_TOKEN);
}

// 获取OAuth令牌
function getOAuthToken() {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
}

// 清除OAuth令牌
function clearOAuthToken() {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
}

// 处理GitHub OAuth回调
async function handleOAuthCallback() {
    // 解析URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem(STORAGE_KEY_STATE);
    
    // 如果没有code参数，则不是OAuth回调
    if (!code) {
        return null;
    }
    
    // 验证状态以防CSRF攻击
    if (state !== storedState) {
        console.error('OAuth状态不匹配，可能存在CSRF攻击');
        return null;
    }
    
    // 清除状态值
    localStorage.removeItem(STORAGE_KEY_STATE);
    
    try {
        // 使用代理服务交换令牌
        // 注意：由于GitHub OAuth不允许前端直接交换令牌，我们需要使用后端代理
        // 这里假设您有一个代理服务，接受code并返回access_token
        // 如果没有可以使用GitHub Pages支持的无服务器功能如Netlify Functions
        const tokenUrl = `https://easy-note-oauth-proxy.netlify.app/.netlify/functions/github-oauth?code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        
        const response = await fetch(tokenUrl);
        if (!response.ok) {
            throw new Error(`令牌交换失败: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(`认证错误: ${data.error_description}`);
        }
        
        // 保存令牌
        localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
        
        // 清除URL参数
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        return data.access_token;
    } catch (error) {
        console.error('获取OAuth令牌时出错:', error);
        return null;
    }
}

// 导出OAuth模块
const GitHubOAuth = {
    initiateOAuthFlow,
    handleOAuthCallback,
    hasValidOAuthToken,
    getOAuthToken,
    clearOAuthToken
}; 