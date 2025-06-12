# Easy Note - Firebase 云存储使用指南

本指南将详细介绍如何设置和使用 Easy Note 应用的 Firebase 云存储功能，完全替代 GitHub Gist 存储方案。

## 目录

1. [准备工作](#准备工作)
2. [Firebase 项目设置](#firebase-项目设置)
3. [应用配置](#应用配置)
4. [本地测试](#本地测试)
5. [使用指南](#使用指南)
6. [故障排除](#故障排除)

## 准备工作

确保您已安装以下工具：

- 现代浏览器（Chrome、Firefox、Edge 等）
- 本地 Web 服务器（如 Python 的 http.server）

## Firebase 项目设置

### 1. 创建 Firebase 项目

1. 访问 [Firebase 控制台](https://console.firebase.google.com/)
2. 点击"添加项目"
3. 输入项目名称，如 "easy-note"
4. 可以禁用 Google Analytics（可选）
5. 点击"创建项目"，等待项目创建完成

### 2. 注册 Web 应用

1. 在 Firebase 项目主页，点击 Web 图标 (</>) 添加 Web 应用
2. 输入应用名称，如 "Easy Note Web"
3. 不需要设置 Firebase Hosting（取消勾选）
4. 点击"注册应用"
5. **复制显示的 Firebase 配置对象**（非常重要！）

### 3. 设置 Firebase 认证

1. 在左侧导航栏中，点击"构建" > "Authentication"
2. 点击"开始使用"或"设置登录方法"
3. 启用以下登录方式：
   - **电子邮件/密码**：点击该选项，开启开关，然后保存
   - **Google**（推荐）：点击该选项，开启开关，配置项目支持电子邮件，然后保存

### 4. 创建 Firestore 数据库

1. 在左侧导航栏中，点击"构建" > "Firestore Database"
2. 点击"创建数据库"
3. 选择"以测试模式开始"
4. 选择离您最近的数据中心位置
5. 点击"完成"

### 5. 设置安全规则

1. 在 Firestore 数据库页面，切换到"规则"选项卡
2. 替换为以下规则：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户只能访问自己的笔记
    match /users/{userId}/notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 用于连接测试的文档
    match /connection_test/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. 点击"发布"按钮

## 应用配置

### 1. 更新 Firebase 配置

1. 打开 `firebase-storage.js` 文件
2. 找到顶部的 `FIREBASE_CONFIG` 对象
3. 将您从 Firebase 控制台复制的配置替换进去：

```javascript
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. 清理不必要的 GitHub 相关代码（可选）

如果您确定不再需要 GitHub Gist 存储功能，可以删除或注释掉相关代码。

## 本地测试

### 1. 启动本地服务器

使用 Python 的 http.server（或其他您喜欢的服务器）：

```bash
# 在项目根目录下运行
python -m http.server 8000
```

### 2. 访问应用

在浏览器中打开：http://localhost:8000

## 使用指南

### 1. 首次使用

1. 打开应用后，点击右上角的同步图标
2. 在弹出的模态框中选择"Firebase 存储"选项
3. 点击"保存设置"按钮
4. 系统会提示您登录 Firebase 账户：
   - 如果选择电子邮件/密码方式，需要先注册账户
   - 如果选择 Google 登录，直接点击对应按钮

### 2. 创建新笔记

1. 点击"新建笔记"按钮
2. 在编辑区输入笔记内容
3. 笔记会自动保存到 Firebase

### 3. 加密笔记

1. 点击锁图标
2. 输入密码并确认
3. 加密后的笔记在云端也是加密状态，保证数据安全

### 4. 在其他设备访问

1. 在其他设备上打开应用
2. 使用相同的 Firebase 账户登录
3. 您将看到所有已同步的笔记

## 故障排除

### 问题：无法初始化应用

**解决方案**：
- 检查浏览器控制台是否有错误信息
- 确保所有 JavaScript 文件正确加载
- 验证 Firebase 配置是否正确

### 问题：无法登录 Firebase

**解决方案**：
- 确认您已在 Firebase 控制台启用了相应的登录方式
- 检查网络连接
- 尝试使用不同的登录方式（如从电子邮件切换到 Google 登录）

### 问题：笔记无法保存到云端

**解决方案**：
- 确认您已登录 Firebase
- 检查 Firestore 安全规则是否正确
- 查看浏览器控制台是否有错误信息

### 问题：Firebase 配置错误

**解决方案**：
- 重新访问 Firebase 控制台，确保复制了正确的配置
- 检查配置中的每个字段是否正确粘贴
- 确保没有多余或缺失的引号、逗号等

## 结语

通过使用 Firebase 云存储，您的 Easy Note 应用现在拥有了更可靠的云同步功能，无需再担心 GitHub Gist 的 CORS 问题和其他限制。如果您有任何问题或建议，请随时联系我们。

祝您使用愉快！ 