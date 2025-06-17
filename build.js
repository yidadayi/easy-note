const fs = require('fs');
const path = require('path');

// 确保src目录结构完整
const directories = [
  'src/js',
  'src/css',
  'src/assets',
  'src/assets/icons'
];

directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// 复制Netlify配置到根目录
try {
  fs.copyFileSync(
    path.join(__dirname, 'netlify.toml'),
    path.join(__dirname, 'netlify.toml')
  );
  console.log('Netlify配置文件已复制');
} catch (error) {
  console.error('复制Netlify配置文件失败:', error);
}

// 复制.nojekyll到根目录
try {
  fs.copyFileSync(
    path.join(__dirname, '.nojekyll'),
    path.join(__dirname, '.nojekyll')
  );
  console.log('.nojekyll文件已复制');
} catch (error) {
  console.error('复制.nojekyll文件失败:', error);
}

// 在根目录创建一个重定向文件
try {
  fs.writeFileSync(
    path.join(__dirname, 'index.html'),
    `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="refresh" content="0; url=/src/" />
  </head>
  <body>
    <p>重定向到 <a href="/src/">应用</a>...</p>
  </body>
</html>`
  );
  console.log('根目录重定向文件已创建');
} catch (error) {
  console.error('创建根目录重定向文件失败:', error);
}

console.log('构建完成！'); 