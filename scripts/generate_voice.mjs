// Explicit Gemini TTS production utility. Reads a local key; never prints it.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const option=(name,fallback)=>{const i=process.argv.indexOf(name);if(i<0)return fallback;if(!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw new Error(`Missing value for ${name}`);return process.argv[i+1];};
const language=option('--language','en-US');
const malaysianVoice=language==='ms-MY'||language==='en-MY';
const voice=option('--voice',malaysianVoice?'Achird':'Sulafat');
const production=resolve(root,option('--production-dir','artifacts/video'));
const out=join(production,'audio');
const key=process.env.GEMINI_API_KEY;
if(!key)throw new Error('Connect Gemini locally before generating narration.');
const model=option('--model',malaysianVoice?'gemini-3.8-flash-tts':'gemini-3.8-flash-lite-tts');
const style=language==='ms-MY'
  ? 'Bahasa Melayu Malaysia, loghat Melayu Malaysia standard yang semula jadi. Suara lelaki dewasa dengan nada pertengahan rendah yang mesra dan santai. Berbual seperti pelajar Malaysia menerangkan projek kepada panel, bukannya membaca skrip iklan atau berita. Gunakan rentak percakapan yang berubah secara halus, penekanan yang bersahaja dan jeda pendek pada tempat yang masuk akal. Jangan berhenti panjang selepas setiap ayat dan jangan buat intonasi naik turun yang berlebihan. Sebut Team Pilot sebagai dua perkataan bahasa Inggeris, sebut AI sebagai A I, dan sebut Ali, Sara, Mei dan Dan dengan jelas. Baca teks yang diberikan sahaja. Tiada mukadimah tambahan, muzik atau kesan bunyi. Kekalkan suara lelaki dan loghat Malaysia yang sama sepanjang bacaan.'
  : language==='en-MY'
  ? 'Speak the supplied English transcript in the voice of a Malaysian Malay adult man. Retain a natural standard Malaysian English accent influenced by native Bahasa Melayu pronunciation. Keep the same friendly lower-middle male register and relaxed conversational delivery as a Malaysian student explaining a project to a panel. Speak entirely in English; do not translate any sentence into Malay. Use clear, natural Malaysian English, not an American or British accent, and do not exaggerate or caricature the accent. Vary the rhythm gently and use short natural sentence pauses, with warm but restrained emphasis. Avoid an advertising, newsreader or robotic reading style. Pronounce Team Pilot as two English words, A I as separate letters, and Ali and Sara as Malaysian names. Only narrate the supplied transcript, with no added introduction, music or sound effects. Keep the same male voice and Malaysian accent from start to finish.'
  : 'Warm, clear, conversational English. Sound like a thoughtful student presenting a useful project to a judging panel. Relaxed natural phrasing, subtle expression and brief pauses between sentences, around 140 words per minute. Pronounce Team Pilot as two words and A I as separate letters. Speak only the supplied transcript. No introduction, no music, no sound effects, no exaggerated announcer delivery.';
const clean=s=>String(s||'').split(key).join('[redacted]');
function audioBlocks(value,found=[]){if(value&&typeof value==='object'){if(value.type==='audio'&&typeof value.data==='string')found.push(value);for(const v of Object.values(value))if(v&&typeof v==='object')audioBlocks(v,found);}return found;}
async function synthesize(id,text){
  await mkdir(out,{recursive:true});
  const path=join(out,id+'.wav');
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({model,input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style}]}]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice}]}}),signal:AbortSignal.timeout(150000)
  });
  const raw=await response.json();const data=Array.isArray(raw)?raw[0]:raw;
  if(!response.ok){const error=new Error(clean(data.error?.message||data.error?.description||'Google TTS request failed.'));error.status=response.status;throw error;}
  const block=audioBlocks(data).at(-1);if(!block)throw new Error('Google returned no audio block.');
  let bytes=Buffer.from(block.data,'base64');
  if(bytes.subarray(0,4).toString()!=='RIFF'){
    const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(bytes.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes.length,40);bytes=Buffer.concat([header,bytes]);
  }
  await writeFile(path,bytes);
  await writeFile(join(out,id+'.json'),JSON.stringify({id,model,voice,language,style,text},null,2));
  console.log(JSON.stringify({id,model,voice,language,path,bytes:bytes.length}));
}
async function generateWithMinuteRetry(id,text){
  try{await synthesize(id,text);}catch(error){
    const retrySeconds=Number(error.message.match(/retry in (\d+)s\b/i)?.[1]);
    if(error.status!==429||!retrySeconds||retrySeconds>60)throw error;
    const seconds=Math.min(60,retrySeconds+1);
    console.log(JSON.stringify({id,status:'waiting for minute quota',seconds}));
    await new Promise(resolve=>setTimeout(resolve,seconds*1000));
    await synthesize(id,text);
  }
}
try{
  if(process.argv.includes('--list-voices')){
    const query=new URLSearchParams({gender:'male',type:'prebuilt',page_size:'50'});
    if(language!=='any')query.set('language_code',language);
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/voices?'+query,{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(30000)});
    const data=await response.json();if(!response.ok)throw new Error(clean(data.error?.message||'Voice catalog request failed.'));
    await mkdir(production,{recursive:true});await writeFile(join(production,'voice-catalog.json'),JSON.stringify(data,null,2));
    console.log(JSON.stringify(data));
  }
  else if(process.argv.includes('--sample'))await synthesize('voice-sample',language==='ms-MY'
    ? 'Bila buat tugasan berkumpulan, satu kerja lambat, kerja orang lain pun boleh tersangkut. Dengan Team Pilot, kita boleh semak apa yang terjejas dan susun semula pelan, sebelum ketua kumpulan buat keputusan.'
    : 'Group projects can be difficult for a simple reason: everyone\'s work is connected. This is Team Pilot, an A I coordinator that helps student teams recover when their plans change.');
  else{
    const scenes=JSON.parse(await readFile(join(production,'narration.json'),'utf8'));
    if(process.argv.includes('--combined')){
      await generateWithMinuteRetry('narration-full',scenes.map(s=>s.text).join('\n\n<long pause>\n\n'));
    }else{
    const requested=process.argv.indexOf('--scene');
    const start=option('--start-scene',scenes[0]?.id),startIndex=scenes.findIndex(s=>s.id===start);
    if(startIndex<0)throw new Error('Unknown starting scene.');
    const gap=Number(option('--request-gap-ms','22000'));
    if(!Number.isFinite(gap)||gap<0||gap>60000)throw new Error('Request gap must be between 0 and 60000 milliseconds.');
    let generated=0;
    for(const scene of scenes.slice(startIndex)){
      if(requested>=0&&scene.id!==process.argv[requested+1])continue;
      if(generated)await new Promise(resolve=>setTimeout(resolve,gap));
      await generateWithMinuteRetry(scene.id,scene.text);generated++;
    }
    }
  }
}catch(error){console.log(JSON.stringify({error:clean(error.message),status:error.status||null}));process.exitCode=1;}
