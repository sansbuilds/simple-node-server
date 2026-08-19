const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function askGroq(message) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are the helpful assistant for SimpleServer. Keep replies concise, friendly, and useful.' },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 300
    });
    const request = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Groq request failed with status ${response.statusCode}`));
          return;
        }
        try {
          const result = JSON.parse(body);
          resolve(result.choices[0].message.content);
        } catch {
          reject(new Error('Invalid response from Groq'));
        }
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function handleChat(req, res) {
  if (!process.env.GROQ_API_KEY) {
    sendJson(res, 503, { error: 'AI chat is not configured yet.' });
    return;
  }
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 10000) req.destroy();
  });
  req.on('end', async () => {
    try {
      const { message } = JSON.parse(body);
      if (typeof message !== 'string' || !message.trim()) {
        sendJson(res, 400, { error: 'A message is required.' });
        return;
      }
      const reply = await askGroq(message.trim());
      sendJson(res, 200, { reply });
    } catch (error) {
      console.error(error.message);
      sendJson(res, 502, { error: 'The AI assistant is temporarily unavailable.' });
    }
  });
}

function sendFile(res, filePath){
  fs.readFile(filePath, (err, data) => {
    if(err){
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      '.html':'text/html',
      '.css':'text/css',
      '.js':'application/javascript',
      '.png':'image/png',
      '.jpg':'image/jpeg',
      '.jpeg':'image/jpeg',
      '.svg':'image/svg+xml',
      '.json':'application/json'
    };
    res.writeHead(200, {'Content-Type': map[ext] || 'application/octet-stream'});
    res.end(data);
  });
}

const server = http.createServer((req,res)=>{
  if (req.method === 'POST' && req.url === '/api/chat') {
    handleChat(req, res);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Allow': 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if(reqPath === '/' ) reqPath = '/index.html';
  const filePath = path.join(publicDir, reqPath);
  if(!filePath.startsWith(publicDir)){
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if(err || !stats.isFile()){
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    sendFile(res, filePath);
  });
});

server.listen(port, ()=> console.log(`Server running at http://localhost:${port}`));
