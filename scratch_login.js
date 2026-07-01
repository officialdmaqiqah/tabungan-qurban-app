const fs = require('fs');

async function scrapeDocs() {
  try {
    console.log("Fetching login page to get CSRF token...");
    const loginRes = await fetch("https://xsender.id/id/login");
    const html = await loginRes.text();
    
    // Extract CSRF token
    const tokenMatch = html.match(/name="_token"\s+value="([^"]+)"/);
    if (!tokenMatch) {
      console.log("Could not find CSRF token");
      return;
    }
    const token = tokenMatch[1];
    
    // Extract cookies
    const cookies = loginRes.headers.get('set-cookie');
    
    console.log("Logging in...");
    const loginData = new URLSearchParams();
    loginData.append('_token', token);
    loginData.append('login_method', 'email');
    loginData.append('email', 'officialsiyoyok@gmail.com');
    loginData.append('password', 'SSHELEDRIe3..');
    
    const postRes = await fetch("https://xsender.id/id/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookies,
        "Referer": "https://xsender.id/id/login",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: loginData.toString(),
      redirect: 'manual'
    });
    
    console.log("Post status:", postRes.status);
    
    const postCookies = postRes.headers.getSetCookie();
    let combinedCookies = cookies;
    if (Array.isArray(postCookies) && postCookies.length > 0) {
        combinedCookies = postCookies.map(c => c.split(';')[0]).join('; ');
    }
    
    console.log("Fetching API docs...");
    const docsRes = await fetch("https://xsender.id/id/api-docs", {
      headers: {
        "Cookie": combinedCookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    const docsHtml = await docsRes.text();
    fs.writeFileSync("docs_output.html", docsHtml);
    console.log("Saved to docs_output.html");
    
  } catch (err) {
    console.error(err);
  }
}

scrapeDocs();
