import http from 'node:http';
import {readFile} from 'node:fs/promises';
http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const file=path==='/'?'index.html':path.slice(1);if(!['index.html','style.css','contrast.css','app.js','tutorial.js'].includes(file))throw Error();res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
