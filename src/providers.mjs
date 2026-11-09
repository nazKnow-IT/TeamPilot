export const GEMINI_MODELS=['gemini-3.8-flash','gemini-2.5-flash','gemini-2.5-flash-lite'];
export const GEMINI_BASE_URL='https://generativelanguage.googleapis.com/v1beta/openai/';

export function getAIConfig(env=process.env){
  const provider=env.AI_PROVIDER||'gemini';
  if(!['gemini','openai'].includes(provider))throw new Error('AI_PROVIDER must be gemini or openai.');
  const isGemini=provider==='gemini';
  const model=isGemini?(env.GEMINI_MODEL||GEMINI_MODELS[0]):(env.OPENAI_MODEL||'gpt-5.4-mini');
  if(isGemini&&!GEMINI_MODELS.includes(model))throw new Error('Select a supported Gemini model in Connect Gemini.');
  return {provider,label:isGemini?'Google Gemini':'OpenAI',model,keyName:isGemini?'GEMINI_API_KEY':'OPENAI_API_KEY',configured:Boolean(isGemini?env.GEMINI_API_KEY:env.OPENAI_API_KEY)};
}

export async function resolveAgentModel(config,env=process.env){
  if(!config.configured)throw new Error(`${config.label} is not connected. ${config.provider==='gemini'?'Use Connect Gemini to save your key locally.':'Complete secure OpenAI setup.'}`);
  if(config.provider==='openai')return config.model;
  const {OpenAIProvider}=await import('@openai/agents');
  const provider=new OpenAIProvider({apiKey:env.GEMINI_API_KEY,baseURL:GEMINI_BASE_URL,useResponses:false});
  return provider.getModel(config.model);
}

export async function verifyGeminiConnection(env=process.env,{fetchImpl=fetch,signal}={}){
  const config=getAIConfig(env);
  if(config.provider!=='gemini'||!config.configured)throw new Error('Connect Gemini before testing it.');
  const response=await fetchImpl(GEMINI_BASE_URL+'chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.GEMINI_API_KEY}`},
    body:JSON.stringify({model:config.model,messages:[{role:'user',content:'Reply with the single word Connected.'}],max_tokens:512,reasoning_effort:'low'}),signal
  });
  const data=await response.json();
  if(!response.ok){const error=new Error('The Gemini connection test failed.');error.provider='gemini';error.status=response.status;error.code=data.error?.code;error.providerStatus=data.error?.status;throw error;}
  if(!data.choices?.[0]?.message?.content?.trim())throw new Error('Gemini responded without text. The connection is not yet verified.');
  return {provider:'gemini',model:config.model,verified:true};
}
