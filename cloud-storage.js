// 云存储模块 - 处理所有与GitHub Gist相关的操作
// 该模块完全独立，不依赖于app.js中的任何变量

// 使用备用API避免CORS错误
const API_ENDPOINT = 'https://gh-api.onrender.com/api/v3';
const STORAGE_KEY_TOKEN = 'easy_note_oauth_token';

// 导出的云存储模块
const CloudStorage = {
    // 检查是否启用云存储
    isEnabled: function() {
        // 检查URL是否强制本地模式
        const urlParams = new URLSearchParams(window.location.search);
        const localParam = urlParams.get('local');
        if (localParam === 'true') {
            console.log('[CloudStorage] 强制本地模式');
            return false;
        }
        
        // 检查本地设置
        const cloudSyncEnabled = localStorage.getItem('easy_note_cloud_sync') === 'true';
        if (!cloudSyncEnabled) {
            console.log('[CloudStorage] 云同步未启用');
            return false;
        }
        
        // 检查OAuth令牌
        if (!this.getToken()) {
            console.log('[CloudStorage] 无OAuth令牌');
            return false;
        }
        
        return true;
    },

    // 获取OAuth令牌
    getToken: function() {
        return localStorage.getItem(STORAGE_KEY_TOKEN);
    },
    
    // 设置OAuth令牌
    setToken: function(token) {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
    },
    
    // 清除OAuth令牌
    clearToken: function() {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
    },
    
    // 获取授权头
    getAuthHeaders: function() {
        const token = this.getToken();
        if (!token) return {};
        
        return {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        };
    },
    
    // 验证令牌和连接
    validateConnection: async function() {
        try {
            console.log('[CloudStorage] 验证连接...');
            if (!this.getToken()) {
                return {
                    success: false,
                    error: 'No token available'
                };
            }
            
            const response = await this.fetchWithRetry(`${API_ENDPOINT}/user`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                success: true,
                user: data.login
            };
        } catch (error) {
            console.error('[CloudStorage] 连接验证失败', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 创建新笔记
    createNote: async function(noteData) {
        try {
            if (!this.isEnabled()) {
                return { success: false, error: 'Cloud storage not enabled' };
            }
            
            console.log('[CloudStorage] 创建新笔记', noteData);
            
            const noteJson = JSON.stringify(noteData);
            const body = {
                description: 'Easy Note - Cloud Note',
                public: false,
                files: {
                    'note.json': {
                        content: noteJson
                    }
                }
            };
            
            const response = await this.fetchWithRetry(`${API_ENDPOINT}/gists`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create note: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[CloudStorage] 笔记创建成功', data.id);
            
            return {
                success: true,
                noteId: data.id,
                data: data
            };
        } catch (error) {
            console.error('[CloudStorage] 创建笔记失败', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 获取笔记
    getNote: async function(noteId) {
        try {
            if (!this.isEnabled()) {
                return { success: false, error: 'Cloud storage not enabled' };
            }
            
            if (!noteId) {
                return { success: false, error: 'Invalid note ID' };
            }
            
            console.log(`[CloudStorage] 获取笔记: ${noteId}`);
            
            const response = await this.fetchWithRetry(`${API_ENDPOINT}/gists/${noteId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            
            if (response.status === 404) {
                return { success: false, error: 'Note not found', notFound: true };
            }
            
            if (!response.ok) {
                throw new Error(`Failed to get note: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.files || !data.files['note.json']) {
                return { success: false, error: 'Invalid note format' };
            }
            
            const noteContent = data.files['note.json'].content;
            try {
                const parsedNote = JSON.parse(noteContent);
                return {
                    success: true,
                    noteData: parsedNote,
                    rawData: data
                };
            } catch (parseError) {
                return { 
                    success: false, 
                    error: 'Failed to parse note data',
                    parseError: parseError.message
                };
            }
        } catch (error) {
            console.error(`[CloudStorage] 获取笔记失败: ${noteId}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 更新笔记
    updateNote: async function(noteId, noteData) {
        try {
            if (!this.isEnabled()) {
                return { success: false, error: 'Cloud storage not enabled' };
            }
            
            if (!noteId) {
                return { success: false, error: 'Invalid note ID' };
            }
            
            console.log(`[CloudStorage] 更新笔记: ${noteId}`, noteData);
            
            // 先检查笔记是否存在
            const checkResult = await this.getNote(noteId);
            
            // 如果笔记不存在，尝试创建新的
            if (checkResult.notFound) {
                console.log(`[CloudStorage] 笔记不存在，创建新笔记`);
                return await this.createNote(noteData);
            }
            
            // 如果有其他错误，返回错误
            if (!checkResult.success && !checkResult.notFound) {
                return checkResult;
            }
            
            const noteJson = JSON.stringify(noteData);
            const body = {
                description: 'Easy Note - Cloud Note',
                files: {
                    'note.json': {
                        content: noteJson
                    }
                }
            };
            
            const response = await this.fetchWithRetry(`${API_ENDPOINT}/gists/${noteId}`, {
                method: 'PATCH',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update note: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[CloudStorage] 笔记更新成功', data.id);
            
            return {
                success: true,
                noteId: data.id,
                data: data
            };
        } catch (error) {
            console.error(`[CloudStorage] 更新笔记失败: ${noteId}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // 保存笔记 (自动创建或更新)
    saveNote: async function(noteId, noteData) {
        if (noteId) {
            return await this.updateNote(noteId, noteData);
        } else {
            return await this.createNote(noteData);
        }
    },
    
    // 工具函数: 带重试的fetch
    fetchWithRetry: async function(url, options, retries = 3) {
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`[CloudStorage] 发送请求 (尝试 ${i+1}/${retries}): ${url}`);
                const response = await fetch(url, options);
                return response;
            } catch (error) {
                console.warn(`[CloudStorage] 请求失败 (尝试 ${i+1}/${retries}): ${error.message}`);
                lastError = error;
                
                // 指数退避重试等待
                if (i < retries - 1) {
                    const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                    console.log(`[CloudStorage] 等待 ${delay}ms 后重试...`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        
        throw lastError;
    }
};

// 导出模块
window.CloudStorage = CloudStorage; 