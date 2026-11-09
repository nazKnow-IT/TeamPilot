// Explicit Gemini TTS production utility. Reads a local key; never prints it.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'artifacts','video','audio');
const key=process.env.GEMINI_API_KEY;
if(!key)throw new Error('Connect Gemini locally before generating narration.');
const model='gemini-3.8-flash-lite-tts';
const style='Warm, clear, conversational English. Sound like a thoughtful student presenting a useful project to a judging panel. Relaxed natural phrasing, subtle expression and brief pauses between sentences, around 140 words per minute. Pronounce Team Pilot as two words and A I as separate letters. Speak only the supplied transcript. No introduction, no music, no sound effects, no exaggerated announcer delivery.';
const clean=s=>String(s||'').split(key).join('[redacted]');
function audioBlocks(value,found=[]){if(value&&typeof value==='object'){if(value.type==='audio'&&typeof value.data==='string')found.push(value);for(const v of Object.values(value))if(v&&typeof v==='object')audioBlocks(v,found);}return found;}
async function synthesize(id,text){
  await mkdir(out,{recursive:true});
  const path=join(out,id+'.wav');
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({model,input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style}]}]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:'Sulafat'}]}}),signal:AbortSignal.timeout(150000)
  });
  const raw=await response.json();const data=Array.isArray(raw)?raw[0]:raw;
  if(!response.ok){const error=new Error(clean(data.error?.message||data.error?.description||'Google TTS request failed.'));error.status=response.status;throw error;}
  const block=audioBlocks(data).at(-1);if(!block)throw new Error('Google returned no audio block.');
  let bytes=Buffer.from(block.data,'base64');
  if(bytes.subarray(0,4).toString()!=='RIFF'){
    const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(bytes.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes.length,40);bytes=Buffer.concat([header,bytes]);
  }
  await writeFile(path,bytes);console.log(JSON.stringify({id,model,voice:'Sulafat',path,bytes:bytes.length}));
}
try{
  if(process.argv.includes('--sample'))await synthesize('voice-sample','Group projects can be difficult for a simple reason: everyone\'s work is connected. This is Team Pilot, an A I coordinator that helps student teams recover when their plans change.');
  else{
    const scenes=JSON.parse(await readFile(join(root,'artifacts','video','narration.json'),'utf8'));
    const requested=process.argv.indexOf('--scene');
    for(const scene of scenes){if(requested>=0&&scene.id!==process.argv[requested+1])continue;await synthesize(scene.id,scene.text);}
  }
}catch(error){console.log(JSON.stringify({error:clean(error.message),status:error.status||null}));process.exitCode=1;}
