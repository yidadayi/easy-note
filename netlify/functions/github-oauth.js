// 此文件是一个OAuth代理服务
// 这是一个Netlify Functions格式的实现，可以部署到Netlify

// 需要在Netlify环境变量中设置以下变量：
// GITHUB_CLIENT_ID - GitHub OAuth应用的Client ID
// GITHUB_CLIENT_SECRET - GitHub OAuth应用的Client Secret

exports.handler = async function(event, context) {
  // 允许跨域请求
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // 只处理GET请求
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    // 从查询参数中获取授权码
    const params = new URLSearchParams(event.queryStringParameters);
    const code = params.get("code");
    const redirectUri = params.get("redirect_uri");

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing code parameter" })
      };
    }

    // GitHub OAuth令牌端点
    const tokenUrl = "https://github.com/login/oauth/access_token";
    
    // 使用授权码交换访问令牌
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    // 检查是否有错误
    if (data.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: data.error,
          error_description: data.error_description
        })
      };
    }

    // 返回访问令牌
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope
      })
    };
  } catch (error) {
    console.error("OAuth处理错误:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        details: error.message
      })
    };
  }
}; 