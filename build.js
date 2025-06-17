const fs = require('fs');
const path = require('path');

// 确保dist目录存在
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 复制index.html
fs.copyFileSync(
  path.join(__dirname, 'index.html'),
  path.join(distDir, 'index.html')
);

// 创建目录结构
const directories = [
  'src/js',
  'src/css',
  'src/assets'
];

directories.forEach(dir => {
  const fullPath = path.join(distDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// 复制JavaScript文件
const jsFiles = [
  'firebase-config.js',
  'firebase-service.js',
  'ui-controller.js',
  'auth-ui.js',
  'note-service.js',
  'app.js',
  'sw.js'
];

jsFiles.forEach(file => {
  const srcPath = path.join(__dirname, 'src/js', file);
  const destPath = path.join(distDir, 'src/js', file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  } else {
    console.warn(`Warning: File not found: ${srcPath}`);
  }
});

// 复制CSS文件
const cssFiles = [
  'styles.css'
];

cssFiles.forEach(file => {
  const srcPath = path.join(__dirname, 'src/css', file);
  const destPath = path.join(distDir, 'src/css', file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  } else {
    console.warn(`Warning: File not found: ${srcPath}`);
  }
});

// 复制Netlify配置
fs.copyFileSync(
  path.join(__dirname, 'netlify.toml'),
  path.join(distDir, 'netlify.toml')
);

console.log('Build completed successfully!'); 