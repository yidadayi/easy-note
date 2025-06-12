# Easy Note 部署指南

本文档提供了几种部署 Easy Note 应用的方法。由于 Easy Note 是一个纯静态 Web 应用，它可以部署在任何支持静态网站托管的平台上。

## 选项 1: GitHub Pages 部署

GitHub Pages 是最简单的部署方式之一。

1. 在 GitHub 上创建一个新的仓库
2. 将所有项目文件上传到该仓库
3. 前往仓库的 "Settings" > "Pages"
4. 在 "Source" 部分，选择 "main" 分支和根目录 (/)
5. 点击 "Save"，GitHub 将自动为您的网站创建一个 URL

## 选项 2: Netlify 部署

Netlify 提供了免费的静态网站托管，并自动提供 HTTPS。

1. 在 [Netlify](https://www.netlify.com/) 上注册账号
2. 点击 "New site from Git" 或直接上传文件夹
3. 选择您的 Git 提供商并授权 Netlify
4. 选择您的仓库
5. 构建设置保持默认，点击 "Deploy site"

## 选项 3: Vercel 部署

Vercel 也是一个优秀的静态网站托管平台。

1. 在 [Vercel](https://vercel.com/) 上注册账号
2. 点击 "New Project"
3. 导入您的 Git 仓库或上传文件夹
4. 保持默认设置，点击 "Deploy"

## 选项 4: 传统虚拟主机

如果您有传统的虚拟主机服务：

1. 使用 FTP 客户端连接到您的虚拟主机
2. 上传所有项目文件到网站的根目录或子目录
3. 确保 index.html 文件位于指定的目录中

## 重要注意事项

1. **HTTPS 支持**：为了保护用户数据，建议使用支持 HTTPS 的托管服务。GitHub Pages、Netlify 和 Vercel 都默认提供 HTTPS。

2. **自定义域名**：如果您希望使用自定义域名，所有以上平台都支持绑定自定义域名。请参考各平台的文档进行设置。

3. **缓存配置**：如果您使用 CDN 或其他缓存机制，确保正确设置缓存头，特别是对于 service worker 文件，以确保离线功能正常工作。

## 部署后检查

部署完成后，请检查以下功能是否正常工作：

1. 创建新笔记功能
2. 自动保存功能
3. 分享功能（生成链接）
4. 加密/解密功能
5. 在移动设备上的响应式布局
6. 离线访问功能 

## 其他可能的解决方案

1. **使用第三方CORS代理**：
   如果移动设备上仍然出现CORS问题，可以通过在服务器上设置CORS代理来解决。这需要在服务器端做一些配置。

2. **配置HTTPS**：
   为本地开发服务器配置HTTPS可以解决混合内容问题。您可以使用以下命令创建自签名证书并启动HTTPS服务器：

```
python -m pip install pyopenssl
python -m http.server 8000 --bind 0.0.0.0 --cgi 