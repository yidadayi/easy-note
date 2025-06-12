# GitHub OAuth应用设置指南

为了使Easy Note应用能够直接与GitHub API通信，避开CORS限制，我们采用OAuth授权方式。以下是完整的设置步骤：

## 1. 创建GitHub OAuth应用

1. 登录到您的GitHub账户
2. 进入 "Settings" > "Developer settings" > "OAuth Apps"
3. 点击 "New OAuth App" 按钮
4. 填写以下信息：
   - **Application name**: Easy Note
   - **Homepage URL**: 您的应用URL，例如 `https://yourusername.github.io/easy-note/`
   - **Application description**: 一个简单的在线笔记应用，使用GitHub Gist进行跨设备同步
   - **Authorization callback URL**: 与Homepage URL相同，例如 `https://yourusername.github.io/easy-note/`
5. 点击 "Register application" 按钮
6. 创建成功后，您将获得 Client ID
7. 点击 "Generate a new client secret" 生成Client Secret

## 2. 设置OAuth代理服务

由于GitHub OAuth流程需要后端来交换访问令牌，您需要部署一个简单的代理服务：

### 使用Netlify Functions（推荐）

1. 创建一个新的GitHub仓库或使用现有仓库
2. 将 `oauth-proxy-sample.js` 文件复制到仓库的 `netlify/functions/github-oauth.js` 路径下
3. 在仓库根目录创建 `netlify.toml` 文件，内容如下：
   ```toml
   [build]
     functions = "netlify/functions"
   
   [[redirects]]
     from = "/.netlify/functions/*"
     to = "/.netlify/functions/:splat"
     status = 200
     force = true
   ```
4. 创建Netlify账户并连接到此仓库
5. 在Netlify环境变量设置中添加：
   - `GITHUB_CLIENT_ID`: 您的OAuth应用Client ID
   - `GITHUB_CLIENT_SECRET`: 您的OAuth应用Client Secret
6. 部署完成后，您将获得一个类似 `https://your-app.netlify.app/.netlify/functions/github-oauth` 的URL

## 3. 更新Easy Note OAuth配置

1. 打开 `oauth.js` 文件
2. 更新以下常量：
   ```javascript
   const OAUTH_CLIENT_ID = '您的GitHub OAuth应用Client ID';
   // 在第29行找到tokenUrl变量，替换为您的Netlify Function URL
   const tokenUrl = `https://your-app.netlify.app/.netlify/functions/github-oauth?code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
   ```

## 4. 部署更新后的Easy Note应用

1. 提交所有更改并推送到GitHub
2. GitHub Pages将自动部署更新后的应用

## 5. 测试OAuth流程

1. 访问您的Easy Note应用
2. 点击同步图标，然后点击"使用GitHub授权"按钮
3. 您将被重定向到GitHub授权页面
4. 授权后，您将被重定向回应用，并且可以开始使用云同步功能

## 注意事项

- 保持Client Secret的安全，永远不要在前端代码中暴露它
- OAuth代理服务应该只用于交换访问令牌，不应该存储任何用户数据
- 在生产环境中，建议添加更多安全措施，如状态验证和HTTPS

如果您有任何问题，请参考GitHub OAuth文档：https://docs.github.com/en/developers/apps/building-oauth-apps 