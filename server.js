const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const groqModel = process.env.GROQ_MODEL || 'groq/compound-mini';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sanitizeReply(reply) {
  let cleaned = reply
    .replace(/<(think|analysis|reasoning|thought|chain_of_thought)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(think|analysis|reasoning|thought|chain_of_thought)[^>]*>/gi, '')
    .trim();
  if (/^\s*(?:here(?:'s| is)\s+(?:my\s+)?(?:thinking process|analysis|reasoning)|thinking process|analysis|reasoning)\s*:/i.test(cleaned)) {
    const finalAnswer = cleaned.match(/\n\s*(?:final answer|answer)\s*:\s*([\s\S]*)$/i);
    cleaned = finalAnswer ? finalAnswer[1] : '';
  }
  return cleaned.replace(/^\s*(?:final answer|answer)\s*:\s*/i, '').trim();
}

function askGroq(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: groqModel,
      messages: [{ role: 'system', content: 'You are the helpful assistant for SimpleServer. Give only the final answer to the user. Never reveal hidden reasoning, chain-of-thought, analysis, scratch work, or a thinking process. Do not include <think>, analysis, reasoning, or similar sections. Keep replies concise, friendly, and useful while still explaining answers clearly when asked.' }, ...messages],
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
          reject(new Error(`Groq returned HTTP ${response.statusCode}. Check the server configuration and API key.`));
          return;
        }
        try {
          const result = JSON.parse(body);
          const reply = result.choices?.[0]?.message?.content;
          if (typeof reply !== 'string' || !reply.trim()) {
            reject(new Error('Groq returned an empty response.'));
            return;
          }
          const sanitizedReply = sanitizeReply(reply);
          if (!sanitizedReply) {
            reject(new Error('Groq returned no visible answer.'));
            return;
          }
          resolve(sanitizedReply);
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
    sendJson(res, 503, { error: 'The AI assistant is unavailable because GROQ_API_KEY is missing on the server.' });
    return;
  }
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 10000) req.destroy();
  });
  req.on('end', async () => {
    try {
      const request = JSON.parse(body);
      const conversation = Array.isArray(request.messages)
        ? request.messages.filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string' && item.content.trim()).slice(-20)
        : typeof request.message === 'string' && request.message.trim()
          ? [{ role: 'user', content: request.message.trim() }]
          : [];
      if (!conversation.length || conversation[conversation.length - 1].role !== 'user') {
        sendJson(res, 400, { error: 'A message is required.' });
        return;
      }
      const reply = await askGroq(conversation);
      sendJson(res, 200, { reply });
    } catch (error) {
      console.error('Chat request failed:', error.message);
      sendJson(res, 502, { error: error.message || 'The AI assistant could not complete that request.' });
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
