import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {makeServer,safeError} from '../server.mjs';

test('local server health, static allowlist and cross-origin protection',async t=>{
  const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const headers={};
  assert.equal((await fetch(base+'/health',{headers})).status,200);
  const index=await fetch(base+'/',{headers});assert.equal(index.status,200);assert.match(await index.text(),/TeamPilot/);
  assert.equal((await fetch(base+'/.env.local',{headers})).status,404);
  assert.equal((await fetch(base+'/BUILD_SPEC.md',{headers})).status,404);
  assert.equal((await fetch(base+'/api/agent',{method:'POST',headers:{...headers,Origin:'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403);
  const evilStatus=await new Promise((resolve,reject)=>{const req=http.get(base+'/health',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});
  assert.equal(evilStatus,403);
});
test('API errors redact key-shaped text and classify quota/access issues',()=>{assert.doesNotMatch(safeError(new Error('bad sk-proj-123456789abcdef')),/sk-proj/);assert.match(safeError({status:429},'openai'),/quota/);assert.match(safeError({status:401},'openai'),/credential/);assert.doesNotMatch(safeError(new Error('invalid AIza123456789abcdefghijklmnop')),/AIza/);});
test('exhausted credits are distinguished from a transient rate limit',()=>{const message=safeError({status:429,code:'credit_balance_exhausted',type:'insufficient_quota'},'openai');assert.match(message,/No API credits/);assert.match(message,/does not need to be replaced/);assert.doesNotMatch(message,/rate limit/);});
