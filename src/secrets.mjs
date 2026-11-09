import {readFile,writeFile,rename,lstat,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {GEMINI_MODELS} from './providers.mjs';

export const DEFAULT_ENV_PATH=fileURLToPath(new URL('../.env.local',import.meta.url));
export async function saveGeminiConfig({apiKey,model},{envPath=DEFAULT_ENV_PATH,env=process.env}={}){
  if(!GEMINI_MODELS.includes(model))throw new Error('Select one of the supported Gemini models.');
  if(typeof apiKey!=='string')throw new Error('The Gemini key must be text.');
  const key=apiKey.trim()||env.GEMINI_API_KEY;
  if(!key||!(/^[A-Za-z0-9._-]{16,1000}$/).test(key))throw new Error('Enter the Gemini key from AI Studio. Spaces, quotes and line breaks are not allowed.');
  let current='';
  try{const info=await lstat(envPath);if(info.isSymbolicLink()||!info.isFile())throw new Error('The configuration target must be a regular local file.');current=await readFile(envPath,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  const updates={AI_PROVIDER:'gemini',GEMINI_MODEL:model,GEMINI_API_KEY:key};
  const lines=current.split(/\r?\n/).filter(line=>!/^\s*(?:export\s+)?(?:AI_PROVIDER|GEMINI_MODEL|GEMINI_API_KEY)\s*=/.test(line));
  const next=lines.join('\n').replace(/\n*$/,'\n')+Object.entries(updates).map(([k,v])=>`${k}=${v}`).join('\n')+'\n';
  const temp=envPath+'.write-'+randomUUID();
  try{await writeFile(temp,next,{flag:'wx',mode:0o600});await rename(temp,envPath);}finally{await unlink(temp).catch(()=>{});}
  Object.assign(env,updates);
  return {provider:'gemini',model,configured:true};
}
