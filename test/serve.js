'use strict';

const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const contentTypes={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json'
};

http.createServer((request,response)=>{
  let pathname;
  try{
    pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  }catch(error){
    response.writeHead(400).end('Invalid URL');
    return;
  }
  const requested=pathname==='/'?'index.html':pathname.replace(/^\/+/,'');
  const filename=path.resolve(root,requested);
  if(filename!==root&&!filename.startsWith(root+path.sep)){
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filename,(error,contents)=>{
    if(error){
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200,{'content-type':contentTypes[path.extname(filename)]||'application/octet-stream'});
    response.end(contents);
  });
}).listen(Number(process.env.PORT)||4173,'127.0.0.1');
