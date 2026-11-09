import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { validateProject } from './public/planner.js';
import { runCoordinator } from './src/agent.mjs';

const require=createRequire(import.meta.url);
const token=randomBytes(24).toString('hex');
const port=Number(process.env.PORT||4173);
let running=false;
const sdkInstalled=()=>{try{require.resolve('@openai/agents');return true;}catch{return false;}};
const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/planner.js':['planner.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/icon.svg':['icon.svg','image/svg+xml']};
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json',...headers});res.end(JSON.stringify(value));};
async function body(req){let chunks=[],length=0;for await(const chunk of req){length+=chunk.length;if(length>160000)throw new Error('Request is too large (maximum 160 KB).');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export function makeServer(){const server=http.createServer(async(req,res)=>{
  const host=req.headers.host;
  const boundPort=server.address()?.port||port;
  if(![`localhost:${boundPort}`,`127.0.0.1:${boundPort}`].includes(host)){json(res,403,{error:'Localhost access only.'});return;}
  const url=new URL(req.url,`http://${host}`);
  try{
    if(req.method==='GET'&&url.pathname==='/health'){json(res,200,{ok:true});return;}
    if(req.method==='GET'&&url.pathname==='/api/status'){json(res,200,{aiConfigured:Boolean(process.env.OPENAI_API_KEY),sdkInstalled:sdkInstalled(),model:process.env.OPENAI_MODEL||'gpt-5.4-mini',token});return;}
    if(req.method==='POST'&&url.pathname==='/api/agent'){
      if(req.headers.origin!==`http://${host}`||req.headers['x-teampilot-token']!==token){json(res,403,{error:'Open TeamPilot in this browser before starting an agent run.'});return;}
      if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON input is required.'});return;}
      if(running){json(res,409,{error:'One agent run is already in progress.'});return;}
      if(!process.env.OPENAI_API_KEY||!sdkInstalled()){json(res,503,{error:'Live AI is not connected. Complete API setup and SDK installation, then restart TeamPilot. You can inspect the local planner now.'});return;}
      const data=await body(req);validateProject(data.project);
      if(typeof data.goal!=='string'||!data.goal.trim()||data.goal.length>4000){json(res,400,{error:'Enter a goal of 1–4,000 characters.'});return;}
      if(running){json(res,409,{error:'One agent run is already in progress.'});return;}
      running=true;
      const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),60000);
      res.on('close',()=>{if(!res.writableEnded)abort.abort();});
      res.writeHead(200,{'Content-Type':'application/x-ndjson',...headers});
      const emit=event=>{if(!res.destroyed&&!res.writableEnded)res.write(JSON.stringify(event)+'\n');};
      try{await runCoordinator(data.project,data.goal,{emit,signal:abort.signal});}
      catch(error){const message=abort.signal.aborted?'Run cancelled or exceeded 60 seconds. No board changes were applied.':safeError(error);emit({type:'error',message});}
      finally{clearTimeout(timer);running=false;res.end();}
      return;
    }
    if(req.method==='GET'&&files[url.pathname]){
      const [file,type]=files[url.pathname];const bytes=await readFile(new URL(`./public/${file}`,import.meta.url));res.writeHead(200,{'Content-Type':type,...headers});res.end(bytes);return;
    }
    json(res,404,{error:'Not found.'});
  }catch(error){if(!res.headersSent)json(res,400,{error:safeError(error)});else res.end();}
});return server;}
export function safeError(error){
  const status=Number(error.status);
  if(status===401)return 'The API credential was rejected. Check the secure API setup.';
  if(status===429)return 'The API reported a quota or rate limit. Check available credits and retry later.';
  if(status===403||status===404)return 'The API project cannot access the configured model. Check model permissions.';
  const message=String(error.message||'The request failed.').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]');
  return message.slice(0,1200);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const server=makeServer();server.listen(port,'127.0.0.1',()=>console.log(`TeamPilot local preview: http://127.0.0.1:${port}\nAI connection: ${process.env.OPENAI_API_KEY?'configured (not yet verified)':'not configured'}`));
}
