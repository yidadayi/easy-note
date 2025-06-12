# Easy Note - Firebase 云存储实现

这是 Easy Note 应用的 Firebase 云存储实现，提供比 GitHub Gist 更可靠的云同步解决方案。

## 实现概述

Firebase 实现由以下几个主要组件构成：

1. **firebase-storage.js**：核心存储模块，处理与 Firebase Firestore 的所有交互
2. **firebase-integration.js**：集成模块，连接 Firebase 存储与主应用
3. **Firebase 认证**：使用 Firebase Authentication 进行用户认证
4. **Firestore 数据库**：使用 Cloud Firestore 存储笔记数据

## 主要优势

- **更可靠的同步**：避免了 GitHub Gist API 的限制和 CORS 问题
- **简化的认证流程**：内置多种登录方式，无需复杂的 OAuth 设置
- **更好的用户体验**：更快的数据访问和更稳定的同步
- **更强的安全性**：精细的访问控制和数据验证

## 功能对比

| 功能 | GitHub Gist 实现 | Firebase 实现 |
|------|-----------------|--------------|
| 认证方式 | OAuth 2.0 | 电子邮件/密码, Google, 等 |
| 存储位置 | GitHub Gist | Cloud Firestore |
| 离线支持 | 有限 | 完整支持 |
| 数据访问速度 | 较慢 | 更快 |
| CORS 问题 | 需要代理 | 无需代理 |
| 设置复杂度 | 复杂 | 简单 |
| 多设备同步 | 支持 | 支持 |
| 实时更新 | 不支持 | 支持 |

## 实现细节

### 数据结构

Firebase 实现使用以下 Firestore 数据结构：

```
/users/{userId}/notes/{noteId}
  - content: "笔记内容"
  - title: "笔记标题"
  - createdAt: Timestamp
  - updatedAt: Timestamp
  - isEncrypted: boolean
  - ...其他元数据
```

### 认证流程

1. 用户选择 Firebase 存储选项
2. 系统检查用户是否已登录
3. 如未登录，显示登录/注册模态框
4. 用户可以选择：
   - 使用电子邮件/密码注册
   - 使用电子邮件/密码登录
   - 使用 Google 账户登录
5. 认证成功后，启用云同步

### 数据同步

1. 创建笔记：
   - 在本地创建笔记
   - 如果启用了云同步，同时在 Firestore 中创建文档
   - 返回生成的笔记 ID

2. 读取笔记：
   - 尝试从 Firestore 读取笔记
   - 如果云同步未启用或读取失败，回退到本地存储

3. 更新笔记：
   - 更新本地笔记
   - 如果启用了云同步，同时更新 Firestore 文档

4. 笔记列表：
   - 从 Firestore 获取用户的所有笔记
   - 按最后更新时间排序

## 设置说明

详细的设置步骤请参考 [FIREBASE-SETUP.md](FIREBASE-SETUP.md) 文件。

## 未来改进

1. **离线优先架构**：进一步优化离线体验
2. **笔记共享功能**：允许与其他用户共享笔记
3. **实时协作编辑**：多用户同时编辑同一笔记
4. **版本历史**：查看和恢复笔记的历史版本
5. **更多同步选项**：支持更多云存储提供商（如 Dropbox、Google Drive）

## 贡献

欢迎提交 Pull Request 或创建 Issue 来改进这个实现。 