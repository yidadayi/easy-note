document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const noteContent = document.getElementById('noteContent');
    const lastSavedEl = document.getElementById('lastSaved');
    const noteStatusEl = document.getElementById('noteStatus');
    const syncStatusEl = document.getElementById('syncStatus');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const shareBtn = document.getElementById('shareBtn');
    const lockBtn = document.getElementById('lockBtn');
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    const unlockNoteBtn = document.getElementById('unlockNoteBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    
    // Bootstrap modals
    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    const unlockModal = new bootstrap.Modal(document.getElementById('unlockModal'));
    const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
    
    // Note state
    let currentNoteId = '';
    let isEncrypted = false;
    let lastSaved = null;
    let isCloudSyncEnabled = true;
    
    // API endpoints for cloud storage
    const API_BASE_URL = 'https://api.jsonbin.io/v3/b';
    const API_KEY = '$2b$10$7ZHRI6ZnnJgM5Nn.ypfuIu4bQVXJ0dEV6y8JWvs67Ym9SQvOOBlEC'; // Public API key for demo
    
    // Initialize the app
    init();
    
    function init() {
        // Check if there's a note ID in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const noteId = urlParams.get('id');
        
        if (noteId) {
            // Load existing note
            loadNote(noteId);
        } else {
            // Create a new note
            createNewNote();
        }
        
        // Set up auto-save
        setupAutoSave();
        
        // Set up event listeners
        setupEventListeners();

        // Check cloud connectivity
        checkCloudConnectivity();
    }

    // Check if the cloud service is available
    async function checkCloudConnectivity() {
        try {
            const response = await fetch(`${API_BASE_URL}/test`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': API_KEY
                },
                timeout: 5000 // 5 second timeout
            });
            
            if (response.ok) {
                isCloudSyncEnabled = true;
                updateSyncStatus(true);
            } else {
                isCloudSyncEnabled = false;
                updateSyncStatus(false);
            }
        } catch (error) {
            console.error('Cloud connectivity check failed:', error);
            isCloudSyncEnabled = false;
            updateSyncStatus(false);
        }
    }

    // Update the sync status indicator
    function updateSyncStatus(isConnected) {
        if (isConnected) {
            syncStatusEl.innerHTML = '<i class="bi bi-cloud-check"></i> 云同步已启用';
            syncStatusEl.classList.remove('text-danger');
            syncStatusEl.classList.add('text-success');
        } else {
            syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> 本地模式';
            syncStatusEl.classList.remove('text-success');
            syncStatusEl.classList.add('text-danger');
            syncStatusEl.title = '当前处于离线模式，笔记将保存在本地，无法跨设备访问';
        }
    }
    
    function createNewNote() {
        // Generate a unique ID for the note
        currentNoteId = generateUniqueId();
        
        // Clear the content
        noteContent.value = '';
        
        // Update the URL
        updateURL();
        
        // Update status
        updateNoteStatus();
    }
    
    async function loadNote(noteId) {
        currentNoteId = noteId;
        
        if (isCloudSyncEnabled) {
            try {
                // First try to load from cloud storage
                const noteData = await fetchNoteFromCloud(noteId);
                
                if (noteData) {
                    if (noteData.encrypted) {
                        // Note is encrypted, show unlock modal
                        isEncrypted = true;
                        noteContent.value = '此笔记已加密，请输入密码解锁。';
                        noteContent.classList.add('locked-note');
                        unlockModal.show();
                    } else {
                        // Note is not encrypted, show content
                        noteContent.value = noteData.content;
                        lastSaved = new Date(noteData.lastSaved);
                        updateLastSavedTime();
                    }
                    
                    updateNoteStatus();
                    return;
                }
            } catch (error) {
                console.error('Error loading note from cloud:', error);
                updateSyncStatus(false);
            }
        }
        
        // If cloud loading fails or is disabled, try localStorage as fallback
        const savedNote = localStorage.getItem(`note_${noteId}`);
        
        if (savedNote) {
            const noteData = JSON.parse(savedNote);
            
            if (noteData.encrypted) {
                // Note is encrypted, show unlock modal
                isEncrypted = true;
                noteContent.value = '此笔记已加密，请输入密码解锁。';
                noteContent.classList.add('locked-note');
                unlockModal.show();
            } else {
                // Note is not encrypted, show content
                noteContent.value = noteData.content;
                lastSaved = new Date(noteData.lastSaved);
                updateLastSavedTime();
            }
            
            updateNoteStatus();
        } else {
            // Note not found
            alert('笔记未找到或已被删除。');
            createNewNote();
        }
    }
    
    async function saveNote() {
        const content = noteContent.value;
        lastSaved = new Date();
        
        const noteData = {
            content: content,
            lastSaved: lastSaved.toISOString(),
            encrypted: isEncrypted
        };
        
        // Try to save to cloud if sync is enabled
        if (isCloudSyncEnabled) {
            try {
                await saveNoteToCloud(currentNoteId, noteData);
                updateSyncStatus(true);
            } catch (error) {
                console.error('Error saving to cloud:', error);
                updateSyncStatus(false);
                // Fallback to localStorage if cloud save fails
                localStorage.setItem(`note_${currentNoteId}`, JSON.stringify(noteData));
            }
        } else {
            // Cloud sync is disabled, save to localStorage only
            localStorage.setItem(`note_${currentNoteId}`, JSON.stringify(noteData));
        }
        
        // Update last saved time
        updateLastSavedTime();
    }
    
    async function fetchNoteFromCloud(noteId) {
        try {
            // Check if the note exists in the cloud storage
            const response = await fetch(`${API_BASE_URL}/${noteId}`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': API_KEY,
                    'X-Bin-Meta': false
                },
                timeout: 10000 // 10 second timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                return data;
            } else if (response.status === 404) {
                return null; // Note doesn't exist in cloud storage
            } else {
                throw new Error('Failed to fetch note: ' + response.statusText);
            }
        } catch (error) {
            console.error('Error fetching note:', error);
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                updateSyncStatus(false);
            }
            return null;
        }
    }
    
    async function saveNoteToCloud(noteId, noteData) {
        try {
            // Check if the note already exists
            const exists = await fetchNoteFromCloud(noteId);
            
            if (exists) {
                // Update existing note
                const response = await fetch(`${API_BASE_URL}/${noteId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': API_KEY
                    },
                    body: JSON.stringify(noteData),
                    timeout: 10000 // 10 second timeout
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update note: ' + response.statusText);
                }
            } else {
                // Create new note
                const response = await fetch(`${API_BASE_URL}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': API_KEY,
                        'X-Bin-Name': noteId
                    },
                    body: JSON.stringify(noteData),
                    timeout: 10000 // 10 second timeout
                });
                
                if (!response.ok) {
                    throw new Error('Failed to create note: ' + response.statusText);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error saving note to cloud:', error);
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                updateSyncStatus(false);
            }
            throw error;
        }
    }
    
    function setupAutoSave() {
        // Save every 5 seconds if there are changes
        setInterval(() => {
            if (noteContent.value) {
                saveNote();
            }
        }, 5000);
        
        // Save when user stops typing
        let typingTimer;
        noteContent.addEventListener('input', () => {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(saveNote, 1000);
        });
    }
    
    function setupEventListeners() {
        // New note button
        newNoteBtn.addEventListener('click', createNewNote);
        
        // Share button
        shareBtn.addEventListener('click', () => {
            const shareLink = document.getElementById('shareLink');
            shareLink.value = window.location.href;
            shareModal.show();
        });
        
        // Copy link button
        copyLinkBtn.addEventListener('click', () => {
            const shareLink = document.getElementById('shareLink');
            shareLink.select();
            document.execCommand('copy');
            copyLinkBtn.textContent = '已复制!';
            setTimeout(() => {
                copyLinkBtn.textContent = '复制';
            }, 2000);
        });
        
        // Lock/Encrypt button
        lockBtn.addEventListener('click', () => {
            if (isEncrypted) {
                // Already encrypted, show unlock modal
                unlockModal.show();
            } else {
                // Not encrypted, show password modal
                passwordModal.show();
            }
        });
        
        // Save password button
        savePasswordBtn.addEventListener('click', () => {
            const password = document.getElementById('notePassword').value;
            
            if (password) {
                encryptNote(password);
                passwordModal.hide();
                document.getElementById('notePassword').value = '';
            } else {
                alert('请输入密码！');
            }
        });
        
        // Unlock note button
        unlockNoteBtn.addEventListener('click', () => {
            const password = document.getElementById('unlockPassword').value;
            
            if (password) {
                const success = decryptNote(password);
                
                if (success) {
                    unlockModal.hide();
                    document.getElementById('unlockPassword').value = '';
                    document.getElementById('passwordError').classList.add('d-none');
                } else {
                    document.getElementById('passwordError').classList.remove('d-none');
                }
            } else {
                alert('请输入密码！');
            }
        });

        // Sync status click handler to retry connection
        syncStatusEl.addEventListener('click', function() {
            if (!isCloudSyncEnabled) {
                checkCloudConnectivity();
                alert('正在尝试重新连接云服务...');
            }
        });
    }
    
    async function encryptNote(password) {
        const content = noteContent.value;
        
        // Encrypt content
        const encryptedContent = CryptoJS.AES.encrypt(content, password).toString();
        
        // Update note state
        isEncrypted = true;
        
        // Save encrypted content
        const noteData = {
            content: encryptedContent,
            lastSaved: new Date().toISOString(),
            encrypted: true
        };
        
        // Try to save to cloud if sync is enabled
        if (isCloudSyncEnabled) {
            try {
                await saveNoteToCloud(currentNoteId, noteData);
                updateSyncStatus(true);
            } catch (error) {
                console.error('Error saving encrypted note to cloud:', error);
                updateSyncStatus(false);
                // Fallback to localStorage if cloud save fails
                localStorage.setItem(`note_${currentNoteId}`, JSON.stringify(noteData));
            }
        } else {
            // Cloud sync is disabled, save to localStorage only
            localStorage.setItem(`note_${currentNoteId}`, JSON.stringify(noteData));
        }
        
        // Update UI
        noteContent.value = '此笔记已加密，请输入密码解锁。';
        noteContent.classList.add('locked-note');
        
        // Update status
        updateNoteStatus();
    }
    
    async function decryptNote(password) {
        let noteData;
        
        if (isCloudSyncEnabled) {
            try {
                // Try to get note from cloud storage first
                noteData = await fetchNoteFromCloud(currentNoteId);
                updateSyncStatus(true);
            } catch (error) {
                console.error('Error fetching note for decryption:', error);
                updateSyncStatus(false);
            }
        }
        
        if (!noteData) {
            // Fallback to localStorage
            const savedNote = localStorage.getItem(`note_${currentNoteId}`);
            if (savedNote) {
                noteData = JSON.parse(savedNote);
            } else {
                return false;
            }
        }
        
        try {
            // Try to decrypt
            const decryptedBytes = CryptoJS.AES.decrypt(noteData.content, password);
            const decryptedContent = decryptedBytes.toString(CryptoJS.enc.Utf8);
            
            if (decryptedContent) {
                // Decryption successful
                noteContent.value = decryptedContent;
                noteContent.classList.remove('locked-note');
                isEncrypted = false;
                
                // Save as decrypted
                const updatedNoteData = {
                    content: decryptedContent,
                    lastSaved: new Date().toISOString(),
                    encrypted: false
                };
                
                // Try to save to cloud if sync is enabled
                if (isCloudSyncEnabled) {
                    try {
                        await saveNoteToCloud(currentNoteId, updatedNoteData);
                        updateSyncStatus(true);
                    } catch (error) {
                        console.error('Error saving decrypted note to cloud:', error);
                        updateSyncStatus(false);
                        // Fallback to localStorage
                        localStorage.setItem(`note_${currentNoteId}`, JSON.stringify(updatedNoteData));
                    }
                } else {
                    // Cloud sync is disabled, save to localStorage only
                    localStorage.setItem(`note_${currentNoteId}`, JSON.stringify(updatedNoteData));
                }
                
                // Update status
                updateNoteStatus();
                
                return true;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }
    
    function updateURL() {
        // Update URL with note ID without reloading the page
        const newUrl = `${window.location.origin}${window.location.pathname}?id=${currentNoteId}`;
        window.history.pushState({ noteId: currentNoteId }, 'Easy Note', newUrl);
    }
    
    function updateLastSavedTime() {
        if (lastSaved) {
            const now = new Date();
            const diffMs = now - lastSaved;
            const diffSec = Math.round(diffMs / 1000);
            const diffMin = Math.round(diffMs / (1000 * 60));
            
            if (diffSec < 60) {
                lastSavedEl.textContent = `上次保存: ${diffSec} 秒前`;
            } else if (diffMin < 60) {
                lastSavedEl.textContent = `上次保存: ${diffMin} 分钟前`;
            } else {
                lastSavedEl.textContent = `上次保存: ${lastSaved.toLocaleTimeString()}`;
            }
        } else {
            lastSavedEl.textContent = '上次保存: 未保存';
        }
    }
    
    function updateNoteStatus() {
        if (isEncrypted) {
            noteStatusEl.textContent = '已加密笔记';
            noteStatusEl.classList.add('text-danger');
            lockBtn.innerHTML = '<i class="bi bi-unlock"></i> 解锁';
        } else {
            noteStatusEl.textContent = '公开笔记';
            noteStatusEl.classList.remove('text-danger');
            lockBtn.innerHTML = '<i class="bi bi-lock"></i> 加密';
        }
    }
    
    function generateUniqueId() {
        // Generate a random ID for the note
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
    
    // Update last saved time every minute
    setInterval(updateLastSavedTime, 60000);
    
    // Periodically check cloud connectivity
    setInterval(checkCloudConnectivity, 60000);
}); 