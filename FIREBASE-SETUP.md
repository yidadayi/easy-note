# Firebase 云存储设置指南

本文档提供了设置 Firebase 云存储的步骤，作为 GitHub Gist 存储的更可靠替代方案。

## 为什么选择 Firebase？

1. **更可靠的同步**：Firebase 提供了专门设计的实时数据库和云存储服务
2. **更好的权限控制**：精细的用户权限管理
3. **无 CORS 问题**：直接从浏览器访问，无需代理服务器
4. **更简单的认证**：内置多种登录方式（电子邮件/密码、Google、Facebook等）
5. **更强大的扩展性**：可以轻松添加更多功能（如用户配置文件、共享笔记等）

## 设置步骤

### 1. 创建 Firebase 项目

1. 访问 [Firebase 控制台](https://console.firebase.google.com/)
2. 点击"添加项目"
3. 输入项目名称，如 "easy-note"
4. 按照向导完成项目创建

### 2. 设置 Firebase 认证

1. 在 Firebase 控制台中，选择您的项目
2. 在左侧导航栏中，点击"构建" > "Authentication"
3. 点击"开始使用"
4. 启用您想要的登录方式：
   - 电子邮件/密码（最基本的选项）
   - Google（推荐，便于快速登录）
   - 其他方式（可选）

### 3. 创建 Firestore 数据库

1. 在左侧导航栏中，点击"构建" > "Firestore Database"
2. 点击"创建数据库"
3. 选择"以测试模式开始"（稍后可以更改安全规则）
4. 选择离您最近的数据中心位置
5. 点击"完成"

### 4. 设置安全规则

在 Firestore 数据库页面，切换到"规则"选项卡，并替换为以下规则：

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

### 5. 获取 Firebase 配置

1. 在左侧导航栏中，点击"项目概览" > "项目设置"
2. 滚动到"您的应用"部分
3. 点击网页图标 (</>) 添加 Web 应用
4. 注册应用（输入应用名称，如 "Easy Note Web"）
5. 复制显示的配置对象（包含 apiKey、authDomain 等）

### 6. 更新应用配置

打开 `firebase-storage.js` 文件，将您的 Firebase 配置替换到文件顶部：

```javascript
// Firebase 配置
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 使用方法

1. 在应用中，打开"云存储选项"
2. 选择"Firebase 存储"选项
3. 点击"保存设置"
4. 系统会提示您登录 Firebase 账户（使用电子邮件或 Google 账户）
5. 登录后，您的笔记将自动同步到 Firebase

## 数据结构

在 Firestore 中，您的笔记将按以下结构存储：

```
/users/{userId}/notes/{noteId}
  - content: "笔记内容"
  - title: "笔记标题"
  - createdAt: Timestamp
  - updatedAt: Timestamp
  - isEncrypted: boolean
  - ...其他元数据
```

## 故障排除

1. **登录失败**
   - 确保您已在 Firebase 控制台中启用了相应的登录方式
   - 检查浏览器控制台是否有错误信息

2. **同步失败**
   - 确保您已登录
   - 检查网络连接
   - 验证 Firebase 配置是否正确

3. **权限错误**
   - 检查 Firestore 安全规则是否设置正确
   - 确保用户已成功认证

## 高级功能（未来可能添加）

- **笔记共享**：允许与其他用户共享特定笔记
- **实时协作**：多用户同时编辑同一笔记
- **版本历史**：查看和恢复笔记的历史版本
- **离线支持**：完全离线工作，稍后自动同步

---

如有任何问题，请参考 [Firebase 文档](https://firebase.google.com/docs) 或创建 GitHub issue。 