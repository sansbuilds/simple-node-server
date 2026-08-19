const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

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
