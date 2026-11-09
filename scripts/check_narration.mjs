// Technical narration QA; optional independent model transcription.
// Secrets are read only from the environment and are never written to reports.
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=join(root,'artifacts','video');
const scenes=JSON.parse(await readFile(join(dir,'narration.json'),'utf8'));
function readWave(bytes){
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Invalid WAV header');
  let fmt,data;
  for(let at=12;at+8<=bytes.length;){
    const name=bytes.toString('ascii',at,at+4),len=bytes.readUInt32LE(at+4),start=at+8;
    if(start+len>bytes.length)throw Error('Truncated WAV chunk');
    if(name==='fmt ')fmt={format:bytes.readUInt16LE(start),channels:bytes.readUInt16LE(start+2),rate:bytes.readUInt32LE(start+4),bits:bytes.readUInt16LE(start+14)};
    if(name==='data')data=bytes.subarray(start,start+len);
    at=start+len+(len%2);
  }
  if(!fmt||!data||fmt.format!==1||fmt.bits!==16||fmt.channels!==1||fmt.rate!==24000)throw Error('Expected 24 kHz mono 16-bit PCM WAV');
  let peak=0,clipped=0,squares=0,active=0;
  for(let i=0;i<data.length;i+=2){const v=data.readInt16LE(i);peak=Math.max(peak,Math.abs(v));if(Math.abs(v)>=32767)clipped++;squares+=v*v;if(Math.abs(v)>100)active++;}
  const samples=data.length/2;
  return {fmt,data,stats:{seconds:samples/fmt.rate,peak,clipped_samples:clipped,rms:Math.sqrt(squares/samples),active_fraction:active/samples}};
}
const waves=[];
const report={technical_checks:[],transcription:{performed:false},human_listening_performed:false};
for(const scene of scenes){
  const wave=readWave(await readFile(join(dir,'audio',scene.id+'.wav')));waves.push(wave);
  const passed=wave.stats.seconds>3&&wave.stats.clipped_samples===0&&wave.stats.rms>100&&wave.stats.active_fraction>.1;
  report.technical_checks.push({scene:scene.id,...wave.stats,passed});
}
report.total_narration_seconds=waves.reduce((s,w)=>s+w.stats.seconds,0);
report.technical_passed=report.technical_checks.every(s=>s.passed);
if(process.argv.includes('--transcribe')){
  const key=process.env.GEMINI_API_KEY;if(!key)throw Error('Gemini environment key unavailable');
  const pcm=Buffer.concat(waves.map(w=>w.data));const header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  const merged=Buffer.concat([header,pcm]);
  try{
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:'Transcribe the spoken English in this audio verbatim. Return only the words spoken, with punctuation. Do not summarize, correct, explain, or add headings.'},{inlineData:{mimeType:'audio/wav',data:merged.toString('base64')}}]}],generationConfig:{maxOutputTokens:2048,temperature:0}}),signal:AbortSignal.timeout(90000)
    });
    const result=await response.json();
    if(!response.ok)throw Error(`Transcription HTTP ${response.status}: ${String(result.error?.message||'request failed').split(key).join('[redacted]')}`);
    const transcript=(result.candidates?.[0]?.content?.parts||[]).filter(p=>typeof p.text==='string'&&!p.thought).map(p=>p.text).join('\n').trim();
    if(!transcript)throw Error('No transcription returned');
    await writeFile(join(dir,'audio-transcript.txt'),transcript+'\n');
    const normalize=s=>s.toLowerCase().replace(/[’]/g,"'").replace(/\bteam\s*pilot\b/g,'team pilot').replace(/\b14\b/g,'fourteen').replace(/[^a-z0-9']/g,' ').trim().split(/\s+/);
    const expected=normalize(scenes.map(s=>s.text).join(' ')),actual=normalize(transcript);
    let prev=Array.from({length:actual.length+1},(_,i)=>i);
    for(let i=1;i<=expected.length;i++){const next=[i];for(let j=1;j<=actual.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(expected[i-1]===actual[j-1]?0:1));prev=next;}
    report.transcription={performed:true,model:'gemini-3.1-flash-lite',expected_words:expected.length,transcribed_words:actual.length,word_edits:prev[actual.length],word_error_rate:prev[actual.length]/expected.length,transcript_file:'audio-transcript.txt',note:'Automatic transcription is supporting evidence, not a human listening review.'};
  }catch(error){report.transcription={performed:false,error:String(error.message).split(key).join('[redacted]')};}
}
await writeFile(join(dir,'audio-transcript-qa.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(!report.technical_passed)process.exitCode=1;
