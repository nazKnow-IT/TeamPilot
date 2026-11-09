import test from 'node:test';
import assert from 'node:assert/strict';
import {Usage} from '@openai/agents';
import {runCoordinator} from '../src/agent.mjs';
import {makeSample,clone} from '../public/planner.js';

// These exercise the real SDK runner and real application tools with a scripted
// local Model adapter. They are not live inference and are never shown in the UI.
function scriptedModel(steps){let index=0;return {async getResponse(request){
  assert.ok(request.tools.some(t=>t.name==='propose_plan'));
  const step=steps[index++];assert.ok(step,'Unexpected extra model call');
  return {usage:new Usage(),output:step.name?[{type:'function_call',callId:`call-${index}`,name:step.name,arguments:JSON.stringify(step.args)}]:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(step.output)}]}]};
},async *getStreamedResponse(){throw new Error('Streaming model adapter not used by this test.');}};}
test('SDK executes real tools and returns a staged proposal without mutating the board',async()=>{
  const p=makeSample(),original=clone(p),events=[];
  await runCoordinator(p,'Check and propose this plan.',{emit:e=>events.push(e),model:scriptedModel([
    {name:'read_project',args:{}},
    {name:'inspect_dependencies',args:{tasks:p.tasks}},
    {name:'calculate_schedule',args:{tasks:p.tasks,availabilityChanges:[],reassign:false}},
    {name:'propose_plan',args:{tasks:p.tasks,availabilityChanges:[],summary:'The plan fits the supplied capacity.',evidence:[{source:'notes',quote:'Sara leads research.'}]}},
    {output:{message:'A proposal is ready for review.',questions:[],assumptions:['Effort estimates require review.']}}
  ])});
  assert.deepEqual(p,original);const done=events.find(e=>e.type==='done');assert.ok(done.proposal);assert.equal(done.proposal.schedule.feasible,true);assert.equal(done.toolCalls,4);assert.equal(events.filter(e=>e.type==='tool_result').length,4);
});
test('fabricated evidence cannot stage a proposal',async()=>{
  const p=makeSample(),events=[];
  await runCoordinator(p,'Prepare a plan.',{emit:e=>events.push(e),model:scriptedModel([
    {name:'read_project',args:{}},
    {name:'propose_plan',args:{tasks:p.tasks,availabilityChanges:[],summary:'Invalid evidence',evidence:[{source:'brief',quote:'The deadline is extended by a month.'}]}},
    {output:{message:'The quoted evidence could not be verified.',questions:[],assumptions:[]}}
  ])});
  assert.equal(events.find(e=>e.type==='done').proposal,null);assert.match(events.find(e=>e.type==='tool_result'&&e.name==='propose_plan').result.error,/not found/);
});
