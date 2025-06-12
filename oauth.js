// GitHub OAuth认证处理模块
const OAUTH_CLIENT_ID = 'Iv23liDeLHkmwxBvkX1m'; // 用户需要设置自己的GitHub OAuth应用Client ID
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
    // 检查是否配置了Client ID
    if (!OAUTH_CLIENT_ID) {
        alert('错误: 尚未配置GitHub OAuth应用。请参照OAUTH-SETUP.md文件设置您的OAuth应用，并在oauth.js中更新OAUTH_CLIENT_ID。');
        console.error('OAuth配置错误: 未设置OAUTH_CLIENT_ID');
        return;
    }
    
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
        alert('安全警告：OAuth状态验证失败，授权过程被中止。请重新尝试授权。');
        return null;
    }
    
    // 清除状态值
    localStorage.removeItem(STORAGE_KEY_STATE);
    
    try {
        // 检查是否设置了代理URL
        if (!OAUTH_CLIENT_ID) {
            console.error('OAuth配置错误: 未设置OAUTH_CLIENT_ID，无法完成授权流程');
            alert('错误：未正确配置OAuth应用。请参照OAUTH-SETUP.md文件完成设置。');
            return null;
        }
        
        // 使用代理服务交换令牌
        // 注意：由于GitHub OAuth不允许前端直接交换令牌，我们需要使用后端代理
        // 这里使用我们在本仓库中部署的Netlify Functions
        const tokenUrl = `/.netlify/functions/github-oauth?code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        
        const response = await fetch(tokenUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`令牌交换失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(`认证错误: ${data.error_description || data.error}`);
        }
        
        // 保存令牌
        localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
        
        // 清除URL参数
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        return data.access_token;
    } catch (error) {
        console.error('获取OAuth令牌时出错:', error);
        alert(`GitHub授权过程中出错: ${error.message}\n请检查您的OAuth配置或网络连接。`);
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