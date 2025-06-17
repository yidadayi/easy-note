/**
 * 笔记服务模块
 * 提供笔记的核心功能：创建、读取、更新、删除、加密等
 */

/**
 * 笔记服务类
 * 提供笔记的核心功能
 */
class NoteServiceClass {
  constructor() {
    this.currentNote = null;
    this.isEncrypted = false;
    this.password = '';
    this.lastSaved = null;
    this.autoSaveTimer = null;
    this.autoSaveInterval = 30000; // 30秒自动保存
    this.initialized = false;
  }

  /**
   * 初始化笔记服务
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('[NoteService] 初始化笔记服务');
    
    // 设置自动保存
    this.setupAutoSave();
    
    // 加载笔记
    this.loadNoteFromUrl();
    
    // 监听用户登录/登出事件
    this.setupAuthEventListeners();
    
    this.initialized = true;
  }

  /**
   * 设置自动保存
   */
  setupAutoSave() {
    // 清除现有定时器
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    // 设置新定时器
    this.autoSaveTimer = setInterval(() => {
      this.autoSave();
    }, this.autoSaveInterval);
    
    // 页面关闭前保存
    window.addEventListener('beforeunload', () => {
      this.autoSave();
    });
  }

  /**
   * 自动保存笔记
   */
  autoSave() {
    const noteContent = document.getElementById('noteContent');
    if (!noteContent || !this.currentNote || !noteContent.value.trim()) {
      return;
    }
    
    // 检查内容是否有变化
    if (this.currentNote.content === noteContent.value) {
      return;
    }
    
    console.log('[NoteService] 自动保存笔记');
    this.saveNote(noteContent.value);
  }

  /**
   * 从URL加载笔记
   */
  loadNoteFromUrl() {
    try {
      // 解析URL参数
      const urlParams = new URLSearchParams(window.location.search);
      const noteId = urlParams.get('id');
      
      if (noteId) {
        console.log(`[NoteService] 从URL加载笔记: ${noteId}`);
        this.loadNote(noteId);
      } else {
        console.log('[NoteService] 未找到笔记ID，创建新笔记');
        this.createNewNote();
      }
    } catch (error) {
      console.error('[NoteService] 加载笔记失败', error);
      this.showError('加载笔记失败: ' + error.message);
      this.createNewNote();
    }
  }

  /**
   * 使用ID加载或创建笔记
   * @param {string} noteId 笔记ID
   */
  async loadOrCreateNote(noteId) {
    try {
      // 尝试加载指定ID的笔记
      await this.loadNote(noteId);
    } catch (error) {
      console.error(`[NoteService] 加载笔记 ${noteId} 失败`, error);
      this.showError('加载指定笔记失败，将创建新笔记');
      
      // 如果加载失败，手动创建此ID的笔记
      this.currentNote = {
        id: noteId,
        content: '',
        isEncrypted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 更新URL
      this.updateUrl(noteId);
      
      // 更新UI
      this.updateNoteUI();
      
      // 保存到本地存储
      this.saveNoteToLocalStorage();
      
      // 如果启用了云存储，保存到云端
      this.saveNoteToCloud();
    }
  }

  /**
   * 创建新笔记
   */
  createNewNote() {
    console.log('[NoteService] 创建新笔记');
    
    // 生成唯一ID
    const noteId = this.generateNoteId();
    
    // 创建笔记对象
    this.currentNote = {
      id: noteId,
      content: '',
      isEncrypted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 更新URL
    this.updateUrl(noteId);
    
    // 更新UI
    this.updateNoteUI();
    
    // 保存到本地存储
    this.saveNoteToLocalStorage();
    
    // 如果启用了云存储，保存到云端
    this.saveNoteToCloud();
  }

  /**
   * 加载笔记
   * @param {string} noteId 笔记ID
   */
  async loadNote(noteId) {
    // 设置加载超时
    let loadingTimeout = setTimeout(() => {
      console.warn(`[NoteService] 加载笔记 ${noteId} 超时`);
      document.getElementById('loadingIndicator').innerHTML = `
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">加载中...</span>
        </div>
        <p class="mt-2">加载笔记超时，正在重试...</p>
      `;
    }, 5000); // 5秒超时
    
    try {
      console.log(`[NoteService] 加载笔记: ${noteId}`);
      
      // 显示加载指示器
      document.getElementById('loadingIndicator').classList.remove('d-none');
      document.getElementById('noteContent').classList.add('d-none');
      this.updateLoadingStatus('正在开始加载笔记...', 10);
      
      let foundNote = false;
      let cloudError = null;
      let cloudNote = null;
      let localNote = null;
      
      // 检查是否是刷新操作且当前已有笔记内容
      const isRefreshAction = this.currentNote && this.currentNote.id === noteId;
      
      // 先尝试从云端加载
      if (this.isCloudEnabled()) {
        console.log('[NoteService] 尝试从云端加载笔记');
        try {
          const connectionTest = await this.testCloudConnection();
          
          if (connectionTest) {
            this.updateLoadingStatus('Firebase连接成功，正在加载数据', 50);
            const cloudResult = await this.loadNoteFromCloud(noteId);
            
            if (cloudResult.success) {
              console.log('[NoteService] 从云端加载笔记成功');
              cloudNote = cloudResult.noteData;
              // 标记为找到笔记，但不立即使用，后续判断是否合并
              foundNote = true;
              this.updateLoadingStatus('从Firebase加载数据成功', 70);
            } else {
              // 记录详细的错误信息
              if (cloudResult.notFound) {
                console.log(`[NoteService] 云端未找到笔记 ${noteId}`);
                this.updateLoadingStatus('Firebase未找到该笔记，尝试本地存储', 30);
              } else {
                console.warn(`[NoteService] 云端加载失败: ${cloudResult.error}`);
                this.updateLoadingStatus(`Firebase错误: ${cloudResult.error}`, 30);
                cloudError = cloudResult.error;
              }
            }
          } else {
            this.updateLoadingStatus('无法连接到Firebase，使用本地数据', 30);
            console.log('[NoteService] Firebase连接测试失败，使用本地存储');
          }
        } catch (cloudErr) {
          console.error('[NoteService] 尝试从云端加载时出错', cloudErr);
          this.updateLoadingStatus(`云加载错误: ${cloudErr.message}`, 30);
          cloudError = cloudErr.message;
        }
      } else {
        console.log('[NoteService] 云存储未启用，跳过云端加载');
        this.updateLoadingStatus('云存储未启用，使用本地数据', 20);
      }
      
      // 从本地存储加载，无论云端是否找到都检查本地
      console.log('[NoteService] 尝试从本地存储加载笔记');
      this.updateLoadingStatus('正在从本地存储加载笔记...', 60);
      
      localNote = this.loadNoteFromLocalStorage(noteId);
      
      if (localNote) {
        console.log('[NoteService] 从本地存储加载笔记成功');
        this.updateLoadingStatus('本地存储加载成功', 80);
        
        // 如果云端和本地都有笔记，需要进行冲突处理
        if (cloudNote) {
          // 解密如果需要
          let cloudContent = cloudNote.content;
          if (cloudNote.isEncrypted && this.password) {
            try {
              cloudContent = this.decryptContent(cloudContent, this.password);
            } catch (e) {
              console.error('[NoteService] 无法解密云端内容:', e);
            }
          }
          
          // 检查两个版本是否有冲突
          const cloudUpdatedAt = new Date(cloudNote.updatedAt);
          const localUpdatedAt = new Date(localNote.updatedAt);
          const isCloudNewer = cloudUpdatedAt > localUpdatedAt;
          const contentDiffers = cloudContent.trim() !== localNote.content.trim();
          
          // 检查云端内容是否只是在本地内容基础上追加
          const localTrimmed = localNote.content.trim();
          const cloudTrimmed = cloudContent.trim();
          const isCloudAppendedOnly = cloudTrimmed.startsWith(localTrimmed) && cloudTrimmed.length > localTrimmed.length;
          
          // 如果是刷新操作，且内容没有变化，直接使用当前内容
          if (isRefreshAction && !contentDiffers) {
            console.log('[NoteService] 刷新操作，内容无变化，保留当前状态');
            this.updateLoadingStatus('内容无变化，刷新完成', 100);
          } 
          // 如果云端内容只是在本地内容基础上追加了新内容，直接使用云端版本
          else if (contentDiffers && isCloudNewer && isCloudAppendedOnly) {
            console.log('[NoteService] 检测到云端内容为本地内容的扩展，自动使用云端版本');
            this.currentNote = cloudNote;
            this.currentNote.syncedFromCloud = true;
            this.updateNoteUI();
            this.updateLoadingStatus('已自动更新为云端扩展版本', 100);
          }
          // 如果内容不同且(不是刷新操作或当前笔记的同步标记不是来自云端)，显示冲突解决对话框
          else if (contentDiffers && (!isRefreshAction || !this.currentNote.syncedFromCloud)) {
            this.updateLoadingStatus('发现内容冲突，等待用户选择...', 90);
            
            // 隐藏加载指示器显示冲突对话框
            document.getElementById('loadingIndicator').classList.add('d-none');
            
            const userChoice = await this.showSyncConflictDialog(cloudContent);
            
            // 显示加载指示器
            document.getElementById('loadingIndicator').classList.remove('d-none');
            document.getElementById('noteContent').classList.add('d-none');
            
            if (userChoice === 'useCloud') {
              // 使用云端版本
              this.currentNote = cloudNote;
              this.currentNote.syncedFromCloud = true; // 标记为从云端同步
            } else if (userChoice === 'merge') {
              // 合并两个版本
              localNote.content = this.mergeContents(
                localNote.content,
                cloudContent
              );
              this.currentNote = localNote;
              this.currentNote.syncedFromCloud = false; // 标记为本地修改版本
            } else {
              // useLocal，使用本地版本
              this.currentNote = localNote;
              this.currentNote.syncedFromCloud = false; // 标记为本地版本
            }
          } else {
            // 内容相同，使用更新的版本
            if (isCloudNewer) {
              this.currentNote = cloudNote;
              this.currentNote.syncedFromCloud = true; // 标记为从云端同步
            } else {
              this.currentNote = localNote;
              this.currentNote.syncedFromCloud = false; // 标记为本地版本
            }
          }
        } else {
          // 只有本地版本
          this.currentNote = localNote;
          this.currentNote.syncedFromCloud = false; // 标记为本地版本
        }
        
        this.updateNoteUI();
        foundNote = true;
        
        // 如果云同步已启用但云端没找到笔记，则将本地笔记同步到云端
        if (this.isCloudEnabled() && !cloudNote && cloudError !== 'permission_denied') {
          console.log('[NoteService] 将本地笔记同步到云端');
          this.updateLoadingStatus('正在将本地笔记同步到云端...', 80);
          await this.saveNoteToCloud().catch(err => {
            console.error('[NoteService] 同步到云端失败', err);
            this.updateLoadingStatus(`同步到云端失败: ${err.message}`, 0);
          });
        }
      } else if (cloudNote) {
        // 只有云端版本
        console.log('[NoteService] 仅使用从云端加载的笔记');
        this.currentNote = cloudNote;
        this.currentNote.syncedFromCloud = true; // 标记为从云端同步
        this.updateNoteUI();
        this.saveNoteToLocalStorage(); // 保存到本地以便离线访问
        foundNote = true;
      } else {
        console.log(`[NoteService] 本地存储中未找到笔记 ${noteId}`);
        this.updateLoadingStatus('本地未找到笔记', 70);
      }
      
      // 如果都没找到，创建新笔记，但保持当前ID
      if (!foundNote) {
        console.log(`[NoteService] 笔记 ${noteId} 未找到，创建同ID的新笔记`);
        this.updateLoadingStatus('创建新笔记...', 90);
        this.createNoteWithId(noteId);
        this.currentNote.syncedFromCloud = false; // 标记为本地版本
        this.updateLoadingStatus('新笔记创建完成', 100);
      }
      
      return true;
    } catch (error) {
      console.error('[NoteService] 加载笔记失败', error);
      this.showError('加载笔记失败: ' + error.message);
      
      // 在错误情况下，尝试创建同ID的新笔记作为恢复手段
      try {
        console.log(`[NoteService] 尝试恢复：创建ID为 ${noteId} 的新笔记`);
        this.updateLoadingStatus('加载失败，创建新笔记...', 50);
        this.createNoteWithId(noteId);
        this.currentNote.syncedFromCloud = false; // 标记为本地版本
        this.updateLoadingStatus('新笔记创建完成', 100);
        return true;
      } catch (recoveryError) {
        console.error('[NoteService] 创建恢复笔记也失败', recoveryError);
        this.updateLoadingStatus('恢复失败', 0);
        return false;
      }
    } finally {
      // 清除超时
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      
      // 隐藏加载指示器
      setTimeout(() => {
        document.getElementById('loadingIndicator').classList.add('d-none');
        document.getElementById('noteContent').classList.remove('d-none');
      }, 500); // 给用户一点时间看到最终状态
    }
  }

  /**
   * 使用指定ID创建新笔记
   * @param {string} noteId 笔记ID
   */
  createNoteWithId(noteId) {
    console.log(`[NoteService] 使用ID ${noteId} 创建新笔记`);
    
    // 创建笔记对象
    this.currentNote = {
      id: noteId,
      content: '',
      isEncrypted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 更新URL
    this.updateUrl(noteId);
    
    // 更新UI
    this.updateNoteUI();
    
    // 保存到本地存储
    this.saveNoteToLocalStorage();
    
    // 如果启用了云存储，保存到云端
    this.saveNoteToCloud();
  }

  /**
   * 从本地存储加载笔记
   * @param {string} noteId 笔记ID
   * @returns {Object} 笔记对象
   */
  loadNoteFromLocalStorage(noteId) {
    try {
      console.log(`[NoteService] 从本地存储加载笔记: ${noteId}`);
      
      // 兼容旧的存储格式
      const oldNoteKey = `easy_note_${noteId}`;
      const storageKey = `note_${noteId}`;
      
      // 先尝试新的存储键
      let noteData = localStorage.getItem(storageKey);
      
      // 如果没找到，尝试旧的键
      if (!noteData) {
        noteData = localStorage.getItem(oldNoteKey);
        if (noteData) {
          console.log('[NoteService] 从旧格式键加载笔记');
        }
      }
      
      if (!noteData) {
        console.log(`[NoteService] 本地存储中未找到笔记: ${noteId}`);
        return null;
      }
      
      const parsedNote = JSON.parse(noteData);
      
      // 确保所有必须的字段都存在
      const note = {
        id: noteId,
        content: parsedNote.content || '',
        isEncrypted: parsedNote.isEncrypted || false,
        updatedAt: parsedNote.updatedAt || new Date().toISOString(),
        syncedFromCloud: parsedNote.syncedFromCloud || false  // 加载同步标记
      };
      
      console.log(`[NoteService] 从本地存储成功加载笔记: ${noteId}`);
      return note;
    } catch (error) {
      console.error('[NoteService] 从本地存储加载笔记失败', error);
      return null;
    }
  }

  /**
   * 从云端加载笔记
   * @param {string} noteId 笔记ID
   * @returns {Promise<Object>} 加载结果
   */
  async loadNoteFromCloud(noteId) {
    try {
      if (!this.isCloudEnabled()) {
        this.updateLoadingStatus('云存储未启用，仅使用本地存储', 30);
        return { success: false, error: '云存储未启用' };
      }
      
      this.updateLoadingStatus('正在从Firebase加载笔记...', 50);
      
      // 添加超时处理
      let timeoutID;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutID = setTimeout(() => {
          this.updateLoadingStatus('Firebase请求超时，尝试本地存储...', 30);
          reject(new Error('从云端加载笔记超时'));
        }, 10000); // 10秒超时
      });
      
      // 调用Firebase服务
      const resultPromise = window.FirebaseService.getNote(noteId);
      
      // 使用Promise.race实现超时
      const result = await Promise.race([resultPromise, timeoutPromise])
        .finally(() => {
          if (timeoutID) clearTimeout(timeoutID);
        });
      
      if (result.success) {
        this.updateLoadingStatus('从Firebase获取笔记成功', 100);
        return {
          success: true,
          noteData: {
            id: noteId,
            content: result.noteData.content || '',
            isEncrypted: result.noteData.isEncrypted || false,
            createdAt: result.noteData.createdAt || new Date().toISOString(),
            updatedAt: result.noteData.updatedAt || new Date().toISOString()
          }
        };
      }
      
      if (result.code === 'not_found') {
        this.updateLoadingStatus('Firebase中未找到笔记，尝试本地存储...', 30);
      } else {
        this.updateLoadingStatus(`Firebase错误: ${result.error}，尝试本地存储...`, 30);
      }
      
      return {
        success: false,
        error: result.error,
        notFound: result.notFound,
        code: result.code
      };
    } catch (error) {
      console.error('[NoteService] 从云端加载笔记失败', error);
      this.updateLoadingStatus('从Firebase加载失败，尝试本地存储...', 30);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新加载状态显示
   * @param {string} message 加载消息
   * @param {number} progress 进度百分比 (0-100)
   */
  updateLoadingStatus(message, progress) {
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingDetails = document.getElementById('loadingDetails');
    const loadingProgress = document.getElementById('loadingProgress');
    
    if (loadingMessage) {
      loadingMessage.textContent = '正在加载笔记...';
    }
    
    if (loadingDetails) {
      loadingDetails.textContent = message;
    }
    
    if (loadingProgress) {
      loadingProgress.style.width = `${progress}%`;
    }
    
    console.log(`[NoteService] 加载状态: ${message} (${progress}%)`);
  }

  /**
   * 保存笔记
   * @param {string} content 笔记内容
   */
  saveNote(content) {
    try {
      if (!this.currentNote) {
        console.error('[NoteService] 无法保存，当前没有活动笔记');
        return;
      }
      
      console.log('[NoteService] 保存笔记');
      
      // 更新笔记对象
      this.currentNote.content = content;
      this.currentNote.updatedAt = new Date().toISOString();
      
      // 如果是加密笔记，加密内容
      if (this.isEncrypted && this.password) {
        this.currentNote.content = this.encryptContent(content, this.password);
        this.currentNote.isEncrypted = true;
      }
      
      // 保存到本地存储
      this.saveNoteToLocalStorage();
      
      // 如果启用了云存储，保存到云端
      this.saveNoteToCloud();
      
      // 更新最后保存时间
      this.lastSaved = new Date();
      this.updateLastSavedTime();
    } catch (error) {
      console.error('[NoteService] 保存笔记失败', error);
      this.showError('保存笔记失败: ' + error.message);
    }
  }

  /**
   * 保存笔记到本地存储
   */
  saveNoteToLocalStorage() {
    if (!this.currentNote) {
      return;
    }
    
    try {
      console.log('[NoteService] 保存笔记到本地存储');
      
      // 准备要保存的笔记数据
      const noteData = {
        id: this.currentNote.id,
        content: this.currentNote.content,
        isEncrypted: this.currentNote.isEncrypted,
        updatedAt: this.currentNote.updatedAt || new Date().toISOString(),
        syncedFromCloud: this.currentNote.syncedFromCloud || false // 保存同步标记
      };
      
      const storageKey = `note_${this.currentNote.id}`;
      localStorage.setItem(storageKey, JSON.stringify(noteData));
      
      // 更新笔记列表
      this.updateNoteInList(this.currentNote.id, {
        updatedAt: noteData.updatedAt,
        excerpt: this.getExcerpt(this.currentNote.content)
      });
      
      this.displayLastSavedTime();
      console.log('[NoteService] 笔记已保存到本地存储');
    } catch (error) {
      console.error('[NoteService] 保存到本地存储失败', error);
    }
  }

  /**
   * 保存笔记到云端
   */
  async saveNoteToCloud() {
    try {
      if (!this.isCloudEnabled() || !this.currentNote) {
        return;
      }
      
      console.log('[NoteService] 保存笔记到云端');
      
      // 保存前先检查云端是否有更新的版本
      const cloudVersionResult = await this.checkCloudVersion(this.currentNote.id);
      
      // 如果云端有更新版本且内容与本地不同
      if (cloudVersionResult.hasNewerVersion && cloudVersionResult.contentDiffers) {
        // 如果云端内容只是在本地内容基础上追加了新内容，直接使用云端版本而不提示冲突
        if (cloudVersionResult.isCloudAppendedOnly) {
          console.log('[NoteService] 检测到云端内容为本地内容的扩展，自动使用云端版本');
          this.currentNote.content = cloudVersionResult.cloudContent;
          this.updateNoteUI();
          return;
        }
        
        // 否则，显示冲突解决对话框
        const userChoice = await this.showSyncConflictDialog(cloudVersionResult.cloudContent);
        
        if (userChoice === 'useCloud') {
          // 使用云端版本
          this.currentNote.content = cloudVersionResult.cloudContent;
          this.updateNoteUI();
          return;
        } else if (userChoice === 'merge') {
          // 合并两个版本
          this.currentNote.content = this.mergeContents(
            this.currentNote.content,
            cloudVersionResult.cloudContent
          );
          this.updateNoteUI();
        }
        // useLocal不需要操作，继续使用当前内容
      }
      
      // 调用Firebase服务
      const result = await window.FirebaseService.updateNote(this.currentNote.id, {
        content: this.currentNote.content,
        isEncrypted: this.currentNote.isEncrypted,
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        console.log('[NoteService] 笔记已保存到云端');
      } else {
        console.error('[NoteService] 保存到云端失败', result.error);
      }
    } catch (error) {
      console.error('[NoteService] 保存到云端失败', error);
    }
  }
  
  /**
   * 检查云端版本
   * @param {string} noteId 笔记ID
   * @returns {Promise<Object>} 检查结果
   */
  async checkCloudVersion(noteId) {
    try {
      // 默认结果
      const defaultResult = {
        hasNewerVersion: false,
        contentDiffers: false,
        cloudContent: '',
        cloudLastUpdated: null,
        isCloudAppendedOnly: false
      };
      
      if (!this.isCloudEnabled()) {
        return defaultResult;
      }
      
      const cloudResult = await window.FirebaseService.getNote(noteId);
      
      if (!cloudResult.success) {
        return defaultResult;
      }
      
      const cloudNote = cloudResult.noteData;
      const localNote = this.currentNote;
      
      // 解析日期
      let cloudUpdatedAt = new Date(cloudNote.updatedAt);
      let localUpdatedAt = new Date(localNote.updatedAt);
      
      // 云端内容(如果加密则解密)
      let cloudContent = cloudNote.content;
      if (cloudNote.isEncrypted && this.password) {
        try {
          cloudContent = this.decryptContent(cloudContent, this.password);
        } catch (e) {
          // 解密失败，使用原始内容
          console.error('[NoteService] 无法解密云端内容:', e);
        }
      }
      
      // 如果本地内容为空但云端有内容，认为云端更新
      if (!localNote.content.trim() && cloudContent.trim()) {
        return {
          hasNewerVersion: true,
          contentDiffers: true,
          cloudContent: cloudContent,
          cloudLastUpdated: cloudUpdatedAt,
          isCloudAppendedOnly: false
        };
      }
      
      // 检查云端内容是否只是本地内容的扩展(追加)
      const localTrimmed = localNote.content.trim();
      const cloudTrimmed = cloudContent.trim();
      
      // 如果云端内容以本地内容开头，且长度更长，则认为是追加内容
      const isCloudAppendedOnly = cloudTrimmed.startsWith(localTrimmed) && cloudTrimmed.length > localTrimmed.length;
      
      // 云端更新且内容不同
      const isCloudNewer = cloudUpdatedAt > localUpdatedAt;
      const contentDiffers = cloudTrimmed !== localTrimmed;
      
      return {
        hasNewerVersion: isCloudNewer,
        contentDiffers: contentDiffers,
        cloudContent: cloudContent,
        cloudLastUpdated: cloudUpdatedAt,
        isCloudAppendedOnly: isCloudAppendedOnly  // 新增标记，表示云端仅是追加内容
      };
    } catch (error) {
      console.error('[NoteService] 检查云端版本失败:', error);
      return {
        hasNewerVersion: false,
        contentDiffers: false,
        cloudContent: '',
        cloudLastUpdated: null,
        isCloudAppendedOnly: false
      };
    }
  }
  
  /**
   * 显示同步冲突对话框
   * @param {string} cloudContent 云端内容
   * @returns {Promise<string>} 用户选择 ('useCloud', 'useLocal', 'merge')
   */
  showSyncConflictDialog(cloudContent) {
    return new Promise((resolve) => {
      // 创建模态框
      const modalHTML = `
      <div class="modal fade" id="syncConflictModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-warning">
              <h5 class="modal-title">内容冲突</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>发现云端和本地内容有差异，请选择要使用的版本:</p>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="card h-100">
                    <div class="card-header">本地版本</div>
                    <div class="card-body">
                      <pre class="content-preview local-content">${this.currentNote.content}</pre>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card h-100">
                    <div class="card-header">云端版本</div>
                    <div class="card-body">
                      <pre class="content-preview cloud-content">${cloudContent}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="useLocalBtn">使用本地版本</button>
              <button type="button" class="btn btn-primary" id="useCloudBtn">使用云端版本</button>
              <button type="button" class="btn btn-success" id="mergeBtn">合并两个版本</button>
            </div>
          </div>
        </div>
      </div>
      `;
      
      // 添加到页面
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer);
      
      // 初始化模态框
      const modalElement = document.getElementById('syncConflictModal');
      const modal = new bootstrap.Modal(modalElement);
      
      // 设置事件
      document.getElementById('useLocalBtn').addEventListener('click', () => {
        modal.hide();
        document.body.removeChild(modalContainer);
        resolve('useLocal');
      });
      
      document.getElementById('useCloudBtn').addEventListener('click', () => {
        modal.hide();
        document.body.removeChild(modalContainer);
        resolve('useCloud');
      });
      
      document.getElementById('mergeBtn').addEventListener('click', () => {
        modal.hide();
        document.body.removeChild(modalContainer);
        resolve('merge');
      });
      
      // 添加样式
      const style = document.createElement('style');
      style.textContent = `
        .content-preview {
          max-height: 300px;
          overflow-y: auto;
          white-space: pre-wrap;
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
        }
      `;
      document.head.appendChild(style);
      
      // 显示模态框
      modal.show();
      
      // 模态框关闭时
      modalElement.addEventListener('hidden.bs.modal', () => {
        if (modalContainer.parentNode === document.body) {
          document.body.removeChild(modalContainer);
        }
        document.head.removeChild(style);
        resolve('useLocal'); // 默认使用本地
      });
    });
  }
  
  /**
   * 合并两个内容版本
   * @param {string} localContent 本地内容
   * @param {string} cloudContent 云端内容
   * @returns {string} 合并后的内容
   */
  mergeContents(localContent, cloudContent) {
    // 简单合并策略：如果内容不同，则将云端内容添加到本地内容下方
    if (localContent.trim() === cloudContent.trim()) {
      return localContent;
    }
    
    // 添加分隔符
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    
    return `${localContent}

===========【本地内容结束】===========
===========【云端内容开始】===========
【自动合并于 ${timeStr}】

${cloudContent}`;
  }

  /**
   * 更新笔记UI
   */
  updateNoteUI() {
    if (!this.currentNote) return;
    
    // 更新笔记内容
    const noteContent = document.getElementById('noteContent');
    
    // 如果是加密笔记且有密码，解密内容
    if (this.currentNote.isEncrypted) {
      this.isEncrypted = true;
      
      // 如果没有密码，显示解锁对话框
      if (!this.password) {
        noteContent.value = '此笔记已加密，请输入密码解锁。';
        noteContent.disabled = true;
        
        // 显示解锁对话框
        this.showUnlockDialog();
        return;
      }
      
      // 尝试解密
      try {
        const decryptedContent = this.decryptContent(this.currentNote.content, this.password);
        noteContent.value = decryptedContent;
        noteContent.disabled = false;
      } catch (error) {
        console.error('[NoteService] 解密失败', error);
        noteContent.value = '解密失败，请检查密码。';
        noteContent.disabled = true;
        
        // 显示解锁对话框
        this.showUnlockDialog();
        return;
      }
    } else {
      // 非加密笔记
      this.isEncrypted = false;
      noteContent.value = this.currentNote.content;
      noteContent.disabled = false;
    }
    
    // 更新笔记ID显示
    document.getElementById('noteIdValue').textContent = this.currentNote.id;
    
    // 更新最后保存时间
    this.lastSaved = new Date(this.currentNote.updatedAt);
    this.updateLastSavedTime();
    
    // 更新笔记状态
    this.updateNoteStatus();
  }

  /**
   * 更新最后保存时间
   */
  updateLastSavedTime() {
    const lastSavedElement = document.getElementById('lastSaved');
    
    if (this.lastSaved) {
      const timeStr = this.formatTime(this.lastSaved);
      lastSavedElement.textContent = `上次保存: ${timeStr}`;
    } else {
      lastSavedElement.textContent = '上次保存: 未保存';
    }
  }

  /**
   * 更新笔记状态
   */
  updateNoteStatus() {
    const noteStatus = document.getElementById('noteStatus');
    
    if (this.isEncrypted) {
      noteStatus.innerHTML = '<i class="bi bi-lock-fill text-danger"></i> 加密笔记';
      noteStatus.classList.add('text-danger');
    } else {
      noteStatus.innerHTML = '<i class="bi bi-unlock"></i> 公开笔记';
      noteStatus.classList.remove('text-danger');
    }
  }

  /**
   * 格式化时间
   * @param {Date} date 日期对象
   * @returns {string} 格式化后的时间字符串
   */
  formatTime(date) {
    if (!date) return '';
    
    // 格式化为 HH:MM:SS
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * 更新URL
   * @param {string} noteId 笔记ID
   */
  updateUrl(noteId) {
    if (!noteId) return;
    
    // 更新URL，不刷新页面
    const url = new URL(window.location);
    url.searchParams.set('id', noteId);
    window.history.pushState({}, '', url);
  }

  /**
   * 生成笔记ID
   * @returns {string} 笔记ID
   */
  generateNoteId() {
    // 生成8位随机ID
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      id += chars[randomIndex];
    }
    
    return id;
  }

  /**
   * 加密内容
   * @param {string} content 原始内容
   * @param {string} password 密码
   * @returns {string} 加密后的内容
   */
  encryptContent(content, password) {
    if (!content || !password) return content;
    
    try {
      // 使用CryptoJS加密
      const encrypted = CryptoJS.AES.encrypt(content, password).toString();
      return encrypted;
    } catch (error) {
      console.error('[NoteService] 加密失败', error);
      throw new Error('加密失败: ' + error.message);
    }
  }

  /**
   * 解密内容
   * @param {string} encrypted 加密内容
   * @param {string} password 密码
   * @returns {string} 解密后的内容
   */
  decryptContent(encrypted, password) {
    if (!encrypted || !password) return encrypted;
    
    try {
      // 使用CryptoJS解密
      const decrypted = CryptoJS.AES.decrypt(encrypted, password);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('[NoteService] 解密失败', error);
      throw new Error('解密失败: ' + error.message);
    }
  }

  /**
   * 设置密码
   * @param {string} password 密码
   */
  setPassword(password) {
    if (!this.currentNote) return;
    
    try {
      console.log('[NoteService] 设置密码');
      
      // 保存密码
      this.password = password;
      
      // 获取当前笔记内容
      const noteContent = document.getElementById('noteContent').value;
      
      // 更新加密状态
      this.isEncrypted = !!password;
      
      // 保存笔记（会自动处理加密）
      this.saveNote(noteContent);
      
      // 更新笔记状态
      this.updateNoteStatus();
      
      return true;
    } catch (error) {
      console.error('[NoteService] 设置密码失败', error);
      this.showError('设置密码失败: ' + error.message);
      return false;
    }
  }

  /**
   * 解锁笔记
   * @param {string} password 密码
   * @returns {boolean} 是否解锁成功
   */
  unlockNote(password) {
    if (!this.currentNote || !this.currentNote.isEncrypted) return true;
    
    try {
      console.log('[NoteService] 尝试解锁笔记');
      
      // 尝试解密
      const decryptedContent = this.decryptContent(this.currentNote.content, password);
      
      // 如果解密成功，更新UI
      if (decryptedContent) {
        this.password = password;
        
        const noteContent = document.getElementById('noteContent');
        noteContent.value = decryptedContent;
        noteContent.disabled = false;
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[NoteService] 解锁失败', error);
      return false;
    }
  }

  /**
   * 显示解锁对话框
   */
  showUnlockDialog() {
    // 显示解锁模态框
    const unlockModal = new bootstrap.Modal(document.getElementById('unlockModal'));
    unlockModal.show();
    
    // 清空密码输入框
    document.getElementById('unlockPassword').value = '';
    
    // 隐藏错误消息
    document.getElementById('passwordError').classList.add('d-none');
    
    // 设置解锁按钮事件
    document.getElementById('unlockNoteBtn').onclick = () => {
      const password = document.getElementById('unlockPassword').value;
      
      if (!password) {
        document.getElementById('passwordError').classList.remove('d-none');
        return;
      }
      
      const success = this.unlockNote(password);
      
      if (success) {
        unlockModal.hide();
      } else {
        document.getElementById('passwordError').classList.remove('d-none');
      }
    };
  }

  /**
   * 显示密码设置对话框
   */
  showPasswordDialog() {
    // 显示密码模态框
    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    passwordModal.show();
    
    // 清空密码输入框
    document.getElementById('notePassword').value = '';
    
    // 设置保存按钮事件
    document.getElementById('savePasswordBtn').onclick = () => {
      const password = document.getElementById('notePassword').value;
      
      // 如果密码为空，询问是否要取消加密
      if (!password && this.isEncrypted) {
        if (confirm('输入空密码将取消加密，确定要继续吗？')) {
          this.setPassword('');
          passwordModal.hide();
        }
        return;
      }
      
      const success = this.setPassword(password);
      
      if (success) {
        passwordModal.hide();
      }
    };
  }

  /**
   * 显示分享对话框
   */
  showShareDialog() {
    if (!this.currentNote) return;
    
    // 生成分享链接
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('id', this.currentNote.id);
    
    // 显示分享模态框
    const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
    shareModal.show();
    
    // 设置分享链接
    document.getElementById('shareLink').value = shareUrl.href;
    
    // 设置复制按钮事件
    document.getElementById('copyLinkBtn').onclick = () => {
      const shareLink = document.getElementById('shareLink');
      shareLink.select();
      document.execCommand('copy');
      
      // 更改按钮文本
      const copyBtn = document.getElementById('copyLinkBtn');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '已复制';
      
      // 2秒后恢复
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    };
  }

  /**
   * 检查云存储是否启用
   * @returns {boolean} 云存储是否启用
   */
  isCloudEnabled() {
    // 检查Firebase服务是否可用
    if (!window.FirebaseService || !window.FirebaseService.initialized) {
      try {
        window.FirebaseService.init();
        if (!window.FirebaseService.initialized) {
          return false;
        }
      } catch (error) {
        console.error('[NoteService] Firebase初始化失败', error);
        return false;
      }
    }
    
    return window.FirebaseService.isEnabled();
  }

  /**
   * 显示错误消息
   * @param {string} message 错误消息
   */
  showError(message) {
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    const toast = new bootstrap.Toast(errorToast);
    toast.show();
  }

  /**
   * 设置认证事件监听器
   */
  setupAuthEventListeners() {
    // 用户登录事件
    window.addEventListener('auth:login', async (event) => {
      console.log('[NoteService] 用户已登录，刷新当前笔记', event.detail);
      
      // 当用户登录后，显示加载指示器
      document.getElementById('loadingIndicator').classList.remove('d-none');
      document.getElementById('noteContent').classList.add('d-none');
      
      this.updateLoadingStatus('用户已登录，正在同步笔记...', 30);
      
      // 存储当前的内容和ID
      const currentContent = document.getElementById('noteContent').value;
      const currentNoteId = this.currentNote?.id;
      
      try {
        // 如果当前有笔记，尝试从云端重新加载以获取最新版本
        if (currentNoteId) {
          this.updateLoadingStatus(`正在从云端获取笔记 ${currentNoteId}...`, 50);
          
          // 验证云端连接
          const connectionTest = await this.testCloudConnection();
          
          if (connectionTest) {
            // 重新加载笔记
            const success = await this.loadNote(currentNoteId);
            
            if (success) {
              this.updateLoadingStatus('笔记同步成功', 100);
            } else {
              // 如果重新加载失败，但本地有内容，尝试保存到云端
              if (currentContent && currentContent.trim()) {
                this.updateLoadingStatus('云端加载失败，正在保存本地笔记到云端...', 70);
                this.saveNote(currentContent);
              }
            }
          } else {
            this.updateLoadingStatus('无法连接到Firebase，继续使用本地笔记', 100);
            this.showError('无法连接到Firebase云服务，将使用本地存储的笔记');
          }
        }
      } catch (error) {
        console.error('[NoteService] 登录后同步笔记失败:', error);
        this.updateLoadingStatus('同步笔记失败', 0);
        this.showError('登录后同步笔记失败: ' + error.message);
      } finally {
        // 隐藏加载指示器
        document.getElementById('loadingIndicator').classList.add('d-none');
        document.getElementById('noteContent').classList.remove('d-none');
      }
    });
    
    // 用户登出事件
    window.addEventListener('auth:logout', () => {
      console.log('[NoteService] 用户已登出，更新UI');
      // 登出时不需要重新加载笔记，因为本地缓存版本仍然有效
      // 但需要更新UI以反映云存储状态
      this.updateNoteStatus();
    });
  }
  
  /**
   * 测试与云端的连接
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testCloudConnection() {
    try {
      if (!this.isCloudEnabled()) {
        return false;
      }
      
      this.updateLoadingStatus('测试Firebase连接...', 40);
      
      // 尝试通过Firebase验证连接
      const result = await window.FirebaseService.validateConnection();
      
      if (result.success) {
        this.updateLoadingStatus('Firebase连接成功', 60);
        return true;
      } else {
        this.updateLoadingStatus(`Firebase连接失败: ${result.error}`, 30);
        console.error('[NoteService] Firebase连接失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[NoteService] 测试云连接失败:', error);
      this.updateLoadingStatus('测试Firebase连接失败', 10);
      return false;
    }
  }

  /**
   * 加载用户历史笔记列表
   */
  async loadHistoryNotes() {
    if (!window.FirebaseService || !window.FirebaseService.isCloudEnabled()) {
      console.log('[NoteService] 未启用云功能，无法获取历史笔记');
      this.showHistoryError('请先登录Firebase账号以使用历史功能');
      return;
    }
    
    try {
      console.log('[NoteService] 开始加载用户历史笔记');
      
      // 显示加载状态
      document.getElementById('historyNotesLoading').classList.remove('d-none');
      document.getElementById('historyNotesEmpty').classList.add('d-none');
      document.getElementById('historyNotesError').classList.add('d-none');
      
      // 清空之前的列表
      const listElement = document.getElementById('historyNotesList');
      const loadingElement = document.getElementById('historyNotesLoading');
      
      // 确保loadingElement在列表中
      if (!listElement.contains(loadingElement)) {
        listElement.innerHTML = '';
        listElement.appendChild(loadingElement);
      } else {
        // 只清除loading之外的内容
        Array.from(listElement.children).forEach(child => {
          if (child !== loadingElement) {
            listElement.removeChild(child);
          }
        });
      }
      
      // 从Firebase获取笔记列表
      const result = await window.FirebaseService.getUserNotes();
      
      if (!result.success) {
        console.error('[NoteService] 获取历史笔记失败', result.error);
        this.showHistoryError(`获取笔记失败: ${result.error}`);
        return;
      }
      
      const notes = result.notes || [];
      
      // 隐藏加载状态
      document.getElementById('historyNotesLoading').classList.add('d-none');
      
      if (notes.length === 0) {
        console.log('[NoteService] 未找到历史笔记');
        document.getElementById('historyNotesEmpty').classList.remove('d-none');
        return;
      }
      
      // 创建笔记列表
      notes.forEach(note => {
        const noteElement = this.createHistoryNoteElement(note);
        listElement.appendChild(noteElement);
      });
      
      console.log(`[NoteService] 成功加载 ${notes.length} 个历史笔记`);
    } catch (error) {
      console.error('[NoteService] 加载历史笔记出错', error);
      this.showHistoryError(`加载笔记时出错: ${error.message}`);
    }
  }
  
  /**
   * 创建历史笔记列表项元素
   * @param {Object} note 笔记对象
   * @returns {HTMLElement} 列表项元素
   */
  createHistoryNoteElement(note) {
    const element = document.createElement('a');
    element.href = '#';
    element.className = 'list-group-item list-group-item-action';
    element.setAttribute('data-note-id', note.id);
    
    // 格式化更新时间
    const updatedAt = new Date(note.updatedAt);
    const formattedDate = `${updatedAt.getFullYear()}-${(updatedAt.getMonth()+1).toString().padStart(2, '0')}-${updatedAt.getDate().toString().padStart(2, '0')} ${updatedAt.getHours().toString().padStart(2, '0')}:${updatedAt.getMinutes().toString().padStart(2, '0')}`;
    
    // 创建内容
    element.innerHTML = `
      <div class="d-flex w-100 justify-content-between">
        <h6 class="mb-1">${note.title}</h6>
        <small>${note.isEncrypted ? '<i class="bi bi-lock-fill text-danger"></i> ' : ''}${formattedDate}</small>
      </div>
      <p class="mb-1 text-muted small">${note.id}</p>
    `;
    
    // 添加点击事件
    element.addEventListener('click', (event) => {
      event.preventDefault();
      this.loadNoteFromHistory(note.id);
      
      // 关闭模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('historyModal'));
      if (modal) {
        modal.hide();
      }
    });
    
    return element;
  }
  
  /**
   * 从历史记录加载笔记
   * @param {string} noteId 笔记ID
   */
  async loadNoteFromHistory(noteId) {
    console.log(`[NoteService] 从历史记录加载笔记: ${noteId}`);
    
    // 如果当前有未保存的更改，提示用户
    if (this.hasUnsavedChanges()) {
      const confirmLoad = confirm('当前笔记有未保存的更改，确定要加载新笔记吗？');
      if (!confirmLoad) {
        return;
      }
    }
    
    // 加载指定ID的笔记
    window.location.href = `?id=${noteId}`;
  }
  
  /**
   * 显示历史加载错误
   * @param {string} message 错误信息
   */
  showHistoryError(message) {
    const errorElement = document.getElementById('historyNotesError');
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
    document.getElementById('historyNotesLoading').classList.add('d-none');
  }
  
  /**
   * 检查是否有未保存的更改
   * @returns {boolean} 是否有未保存的更改
   */
  hasUnsavedChanges() {
    // 简单实现：检查上次保存时间是否超过5秒
    if (!this.lastSavedTime) return false;
    
    const now = new Date();
    const diff = now - this.lastSavedTime;
    return diff < 5000; // 5秒内有保存操作，认为没有未保存内容
  }
}

// 创建单例实例
const NoteService = new NoteServiceClass();

// 导出服务 - 使用全局变量
window.NoteService = NoteService; 