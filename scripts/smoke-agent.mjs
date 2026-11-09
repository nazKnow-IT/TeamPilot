// Explicit live test: uses the selected provider and its real quota.
// The synthetic project is separate from the browser project; nothing is applied.
import {mkdir,writeFile} from 'node:fs/promises';
import {makeSample,clone} from '../public/planner.js';
import {runCoordinator} from '../src/agent.mjs';
import {getAIConfig} from '../src/providers.mjs';
import {safeError} from '../server.mjs';

const config=getAIConfig(),project=makeSample('2026-11-10'),original=clone(project),events=[];
const goal='Ali is unavailable from 2026-11-10 through 2026-11-12 inclusive. Set his available hours to zero on those dates. Read the project, evaluate the delay, preserve every deliverable and all recorded progress, and find a feasible recovery plan within the existing deadline. Use actual tool results to choose owners, verify the final schedule, and stage a proposal for human review. Do not apply changes.';
let result;
try{
  await runCoordinator(project,goal,{signal:AbortSignal.timeout(60000),emit:event=>{
    events.push(event);
    if(event.type==='tool_start')console.log(JSON.stringify({event:'tool_start',name:event.name}));
    if(event.type==='tool_result')console.log(JSON.stringify({event:'tool_result',name:event.name,error:event.result?.error||null}));
    if(event.type==='done')result=event;
  }});
  if(!result?.proposal)throw new Error('The live run did not produce a reviewable proposal.');
  if(!result.proposal.schedule.feasible)throw new Error('The live proposal did not pass the scheduling constraints.');
  const ali=result.proposal.members.find(m=>m.id==='ali');
  if(!['2026-11-10','2026-11-11','2026-11-12'].every(d=>ali?.availability[d]===0))throw new Error('The proposal did not include all requested unavailable dates.');
  for(const originalTask of original.tasks){const next=result.proposal.tasks.find(t=>t.id===originalTask.id);if(!next||next.effortHours!==originalTask.effortHours||next.completedHours!==originalTask.completedHours||next.status!==originalTask.status)throw new Error('The recovery altered task scope, estimates or recorded progress.');}
  if(JSON.stringify(project)!==JSON.stringify(original))throw new Error('The live test changed the approved project.');
  const report={verifiedAt:new Date().toISOString(),provider:config.provider,model:config.model,scenario:'synthetic delay recovery',passed:true,toolCalls:result.toolCalls,toolNames:events.filter(e=>e.type==='tool_start').map(e=>e.name),boardUnchanged:true,proposal:result.proposal,output:result.output};
  await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
  await writeFile(new URL('../artifacts/live-agent-smoke.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,provider:report.provider,model:report.model,toolCalls:report.toolCalls,toolNames:report.toolNames,feasible:true,boardUnchanged:true,changes:report.proposal.changes.map(c=>({task:c.title,changes:c.changes}))}));
}catch(error){
  await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
  const message=safeError(error,config.provider);
  await writeFile(new URL('../artifacts/live-agent-smoke.json',import.meta.url),JSON.stringify({verifiedAt:new Date().toISOString(),provider:config.provider,model:config.model,passed:false,error:message,toolNames:events.filter(e=>e.type==='tool_start').map(e=>e.name)},null,2));
  console.log(JSON.stringify({passed:false,error:message}));process.exitCode=1;
}
