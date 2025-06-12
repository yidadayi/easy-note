# Easy Note 本地开发指南

## 1. 快速开始（仅本地模式）

如果您只想在本地模式下测试应用，不使用GitHub云同步功能：

1. 克隆仓库：
   ```bash
   git clone https://github.com/yourusername/easy-note.git
   cd easy-note
   ```

2. 启动本地服务器：
   ```bash
   # 使用Python
   python -m http.server 8000
   
   # 或使用Node.js
   npx http-server
   ```

3. 在浏览器中访问: http://localhost:8000/?local=true

   添加`?local=true`参数将强制应用使用本地存储模式，完全绕过GitHub授权。

## 2. 设置GitHub OAuth（开发环境）

如果您想测试完整的云同步功能，需要设置GitHub OAuth应用：

### 创建GitHub OAuth应用

1. 登录到您的GitHub账户
2. 进入 "Settings" > "Developer settings" > "OAuth Apps"
3. 点击 "New OAuth App" 按钮
4. 填写以下信息：
   - **Application name**: Easy Note (Dev)
   - **Homepage URL**: `http://localhost:8000/` 或您的本地开发URL
   - **Application description**: 本地开发版Easy Note
   - **Authorization callback URL**: 与Homepage URL相同，例如 `http://localhost:8000/`
5. 点击 "Register application" 按钮
6. 获取 Client ID（不需要Client Secret）

### 配置应用

1. 打开 `oauth.js` 文件
2. 更新 `OAUTH_CLIENT_ID` 常量：
   ```javascript
   const OAUTH_CLIENT_ID = '您获取的Client ID';
   ```

### 使用公共OAuth代理服务（仅适用于开发）

应用已配置为使用公共OAuth代理服务，适合开发测试：
```javascript
const tokenUrl = `https://github-oauth-proxy.vercel.app/api/github-oauth?code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
```

⚠️ **安全警告**:
- 此公共代理仅供开发测试使用
- 生产环境请部署自己的代理服务（见OAUTH-SETUP.md）
- 不要在生产应用中使用公共代理

## 3. 测试IPv4地址访问

如果您想从局域网内的其他设备（如手机）访问：

1. 获取您计算机的IPv4地址：
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig 或 ip addr
   ```

2. 使用IPv4地址访问应用：
   `http://192.168.x.x:8000/?local=true`

3. 如果您配置了OAuth，需要在GitHub OAuth应用设置中添加此地址为授权回调URL。

## 4. 常见问题

1. **OAuth授权404错误**
   - 确认您已正确设置`OAUTH_CLIENT_ID`
   - 检查授权回调URL是否与您访问应用的URL完全匹配

2. **CORS错误**
   - 本地开发时使用`?local=true`参数
   - 或正确配置OAuth以避免CORS问题

3. **其他设备无法访问**
   - 检查防火墙设置
   - 确保所有设备在同一局域网内 

## 5. 启用云同步模式

在localStorage中设置云同步启用：
```javascript
localStorage.setItem('easy_note_cloud_sync', 'true');
```

请按照以下步骤操作：
1. 点击右上角的同步状态图标
2. 在弹出的对话框中选择"**使用GitHub Gist存储 (默认)**"选项
3. 点击"保存设置"按钮 