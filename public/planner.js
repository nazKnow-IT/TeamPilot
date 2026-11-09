// Shared, deterministic planning rules. No model or network access in this module.
export const STATUSES = ['todo', 'doing', 'blocked', 'done'];
const DAY = 86400000;
const fail = message => { throw new Error(message); };
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const text = (s, max) => typeof s === 'string' && s.length <= max;
export const clone = value => structuredClone(value);
export function validDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
}
export function datesBetween(start, end) {
  if (!validDate(start) || !validDate(end)) fail('Use valid dates in YYYY-MM-DD format.');
  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY);
  if (days < 0 || days > 90) fail('The deadline must be within 90 days of the start date.');
  return Array.from({length:days+1}, (_,i) => new Date(Date.parse(start)+i*DAY).toISOString().slice(0,10));
}
export function validateProject(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) fail('Invalid project.');
  if (p.schemaVersion !== 1) fail('Unsupported project file version.');
  if (!Number.isSafeInteger(p.revision) || p.revision < 0) fail('Invalid project revision.');
  if (!text(p.name,160) || !p.name.trim()) fail('A project name is required (up to 160 characters).');
  if (!text(p.brief,16000) || !text(p.notes,16000)) fail('Brief and notes must be text, up to 16,000 characters each.');
  datesBetween(p.startDate,p.deadline);
  if (!Array.isArray(p.members) || !p.members.length || p.members.length > 12) fail('Add between 1 and 12 team members.');
  const mids = new Set();
  for (const m of p.members) {
    if (!m || !text(m.id,60) || !/^[\w-]+$/.test(m.id) || mids.has(m.id)) fail('Member IDs must be unique letters, numbers, underscores or hyphens.');
    mids.add(m.id);
    if (!text(m.name,100) || !m.name.trim()) fail('Each member needs a name.');
    if (!Array.isArray(m.skills) || m.skills.length>20 || m.skills.some(s=>!text(s,80))) fail('Invalid member skills.');
    if (!m.availability || typeof m.availability!=='object' || Array.isArray(m.availability)) fail('Invalid availability.');
    for (const [d,h] of Object.entries(m.availability)) if (!validDate(d) || !finite(h,0,12) || h*2!==Math.round(h*2)) fail('Available hours must be 0–12 in half-hour steps.');
  }
  if (!Array.isArray(p.tasks) || p.tasks.length>80) fail('A project supports up to 80 tasks.');
  const ids = new Set();
  for (const t of p.tasks) {
    if (!t || !text(t.id,60) || !/^[\w-]+$/.test(t.id) || ids.has(t.id)) fail('Task IDs must be unique letters, numbers, underscores or hyphens.');
    ids.add(t.id);
    if (!text(t.title,180) || !t.title.trim()) fail('Each task needs a title.');
    if (!text(t.ownerId,60) || (t.ownerId && !mids.has(t.ownerId))) fail(`Unknown owner for ${t.title}.`);
    if (!finite(t.effortHours,0.5,120) || t.effortHours*2!==Math.round(t.effortHours*2)) fail('Task effort must be 0.5–120 hours in half-hour steps.');
    if (!finite(t.completedHours,0,t.effortHours) || t.completedHours*2!==Math.round(t.completedHours*2)) fail('Completed effort must fit the task estimate in half-hour steps.');
    if (!STATUSES.includes(t.status)) fail('Invalid task status.');
    if (typeof t.locked!=='boolean' || !text(t.skill,80) || !text(t.notes,2000)) fail('Invalid task details.');
    if (t.locked && !t.ownerId) fail('A locked task needs an owner.');
    if ((t.status==='doing' || t.completedHours>0) && !t.ownerId) fail('Started work needs an owner.');
    if (!Array.isArray(t.dependsOn) || t.dependsOn.length>80 || new Set(t.dependsOn).size!==t.dependsOn.length) fail('Invalid task dependencies.');
    if (t.status==='done' && t.completedHours!==t.effortHours) fail('A completed task must have all effort recorded.');
    if (t.status!=='done' && t.completedHours===t.effortHours) fail('Mark fully completed work as Done.');
  }
  for (const t of p.tasks) for (const id of t.dependsOn) if (!ids.has(id) || id===t.id) fail(`Invalid dependency on ${t.title}.`);
  inspectDependencies(p.tasks); // rejects cycles
  return p;
}
export function inspectDependencies(tasks) {
  const map = new Map(tasks.map(t=>[t.id,t])), seen = new Set(), active = new Set(), order=[];
  function visit(t) {
    if (active.has(t.id)) fail(`Dependency cycle detected at ${t.title}.`);
    if (seen.has(t.id)) return;
    active.add(t.id);
    for (const id of t.dependsOn) { if (!map.has(id)) fail(`Missing dependency ${id}.`); visit(map.get(id)); }
    active.delete(t.id); seen.add(t.id); order.push(t.id);
  }
  tasks.forEach(visit);
  const descendants = Object.fromEntries(tasks.map(t=>[t.id,[]]));
  for (const id of order.slice().reverse()) for (const parent of map.get(id).dependsOn) descendants[parent] = [...new Set([...descendants[parent],id,...descendants[id]])];
  return {order,descendants};
}
export function scheduleProject(project, {reassign=false}={}) {
  validateProject(project);
  const days = datesBetween(project.startDate,project.deadline), {order,descendants}=inspectDependencies(project.tasks);
  const tasks = new Map(project.tasks.map(t=>[t.id,t]));
  const used = Object.fromEntries(project.members.map(m=>[m.id,new Set()]));
  const finish = {}, owners={}, allocations=[], unscheduled=[], warnings=[];
  const fit = (t,m) => !t.skill || m.skills.some(s=>s.toLowerCase().includes(t.skill.toLowerCase()) || t.skill.toLowerCase().includes(s.toLowerCase()));
  for (const id of order) {
    const t=tasks.get(id);
    if (t.status==='done') {finish[id]=0; owners[id]=t.ownerId; continue;}
    const blockedParent=t.dependsOn.find(d=>finish[d]===undefined);
    if (t.status==='blocked' || blockedParent) {
      unscheduled.push({taskId:id,remainingHours:t.effortHours-t.completedHours,reason:t.status==='blocked'?(t.notes||'Explicit blocker needs to be resolved.'):`Waiting for ${tasks.get(blockedParent).title}.`});
      continue;
    }
    const earliest=Math.max(0,...t.dependsOn.map(d=>finish[d]));
    const candidates = t.ownerId && (!reassign || t.locked || t.completedHours>0 || t.status==='doing') ? project.members.filter(m=>m.id===t.ownerId) : project.members;
    const need=(t.effortHours-t.completedHours)*2;
    const options=candidates.map(m=>{
      const slots=[];
      for (let di=0;di<days.length && slots.length<need;di++) {
        const cap=(m.availability[days[di]]||0)*2;
        for (let s=0;s<cap && slots.length<need;s++) {const absolute=di*48+s;if(absolute>=earliest && !used[m.id].has(absolute)) slots.push(absolute);}
      }
      return {member:m,slots,score:(slots.length<need?100000:0)+(fit(t,m)?0:96)+(slots.at(-1)??99999)};
    }).sort((a,b)=>a.score-b.score || a.member.id.localeCompare(b.member.id));
    const best=options[0];
    if (!best || best.slots.length!==need) {
      unscheduled.push({taskId:id,remainingHours:need/2,reason:`Not enough available time before ${project.deadline}${t.ownerId?' for the assigned member':''}.`});
      continue;
    }
    owners[id]=best.member.id;
    finish[id]=best.slots.at(-1)+1;
    best.slots.forEach(s=>used[best.member.id].add(s));
    const perDay={};
    for(const slot of best.slots) {const di=Math.floor(slot/48), date=days[di];if(!perDay[date])perDay[date]={taskId:id,memberId:best.member.id,date,hours:0,startSlot:slot%48,endSlot:slot%48+1};perDay[date].hours+=0.5;perDay[date].endSlot=slot%48+1;}
    allocations.push(...Object.values(perDay));
    if(!fit(t,best.member))warnings.push({taskId:id,message:`No declared ${t.skill} match for ${best.member.name}; review the proposed owner.`});
  }
  const capacity=project.members.map(m=>({memberId:m.id,availableHours:days.reduce((s,d)=>s+(m.availability[d]||0),0),plannedHours:allocations.filter(a=>a.memberId===m.id).reduce((s,a)=>s+a.hours,0)}));
  return {feasible:!unscheduled.length,allocations,owners,unscheduled,warnings,capacity,descendants,totalRemainingHours:project.tasks.reduce((s,t)=>s+(t.status==='done'?0:t.effortHours-t.completedHours),0),assumption:'Half-hour planning blocks use the start of each member’s declared daily work window. These are work allocations, not booked clock times. The greedy scheduler can miss other feasible arrangements.'};
}
export function compareTasks(before,after) {
  const old=new Map(before.map(t=>[t.id,t]));
  return after.flatMap(t=>{
    const prev=old.get(t.id);
    if(!prev)return [{taskId:t.id,title:t.title,changes:['New task'],before:null,after:t}];
    const changes=['title','ownerId','effortHours','completedHours','status','skill','notes','locked'].filter(k=>prev[k]!==t[k]).map(k=>`${k}: ${String(prev[k])||'unassigned'} → ${String(t[k])||'unassigned'}`);
    if(JSON.stringify(prev.dependsOn)!==JSON.stringify(t.dependsOn))changes.push('Dependencies updated');
    return changes.length?[{taskId:t.id,title:t.title,changes,before:prev,after:t}]:[];
  });
}
export function createProposal(project,tasks,summary,evidence=[],{availabilityChanges=[],allowBlockedResolution=false}={}) {
  validateProject(project);
  const candidate=clone(project);candidate.tasks=clone(tasks);
  const availabilityKeys=new Set();
  for(const change of availabilityChanges) {
    const m=candidate.members.find(m=>m.id===change.memberId);
    if(!m || !validDate(change.date) || !finite(change.hours,0,12) || change.hours*2!==Math.round(change.hours*2))fail('Invalid availability change.');
    if(change.date<project.startDate || change.date>project.deadline)fail('Availability changes must be inside the planning window.');
    const changeKey=change.memberId+':'+change.date;
    if(availabilityKeys.has(changeKey))fail('Duplicate availability change.');
    availabilityKeys.add(changeKey);
    m.availability[change.date]=change.hours;
  }
  validateProject(candidate);
  for(const old of project.tasks) {
    const next=tasks.find(t=>t.id===old.id);
    if(!next)fail('Existing tasks cannot be deleted by a proposal.');
    if(old.status==='done' && JSON.stringify(old)!==JSON.stringify(next))fail('Completed tasks cannot be altered by the agent.');
    if(old.locked && (next.ownerId!==old.ownerId || !next.locked))fail('A locked owner cannot be changed.');
    if(old.completedHours!==next.completedHours || old.status!==next.status) {
      if(!(allowBlockedResolution && old.status==='blocked' && next.status==='todo' && old.completedHours===next.completedHours))fail('Progress and task status are human-controlled.');
    }
    if((old.completedHours>0 || old.status==='doing') && next.ownerId!==old.ownerId)fail('Started work must keep its owner. Split the remaining work manually if needed.');
  }
  for(const t of tasks)if(!project.tasks.some(x=>x.id===t.id) && (t.completedHours!==0 || t.status!=='todo'))fail('New agent tasks must start as To do with no completed effort.');
  const schedule=scheduleProject(candidate);
  return {id:crypto.randomUUID(),baseRevision:project.revision,summary:String(summary).slice(0,3000),evidence:evidence.map(String).slice(0,30),tasks:candidate.tasks,members:candidate.members,schedule,changes:compareTasks(project.tasks,candidate.tasks),availabilityChanges:clone(availabilityChanges)};
}
export function applyProposal(project,proposal) {
  if(project.revision!==proposal.baseRevision)fail('This proposal is stale because the project changed. Generate a new plan.');
  const checked=createProposal(project,proposal.tasks,proposal.summary,proposal.evidence,{availabilityChanges:proposal.availabilityChanges||[]});
  if(!checked.schedule.feasible)fail('Resolve the unscheduled work before applying this proposal.');
  return {...clone(project),tasks:checked.tasks,members:checked.members,revision:project.revision+1};
}
export function makeSample(start='2026-11-10') {
  const days=datesBetween(start,new Date(Date.parse(start)+5*DAY).toISOString().slice(0,10));
  const member=(id,name,skills,hours)=>({id,name,skills,availability:Object.fromEntries(days.map((d,i)=>[d,hours[i]??0]))});
  const task=(id,title,ownerId,effortHours,dependsOn,skill)=>({id,title,ownerId,effortHours,completedHours:0,dependsOn,skill,status:'todo',locked:false,notes:''});
  return {schemaVersion:1,revision:0,name:'Campus recycling awareness project',startDate:days[0],deadline:days.at(-1),brief:'Create an evidence-based campus recycling awareness presentation. Required deliverables: research summary, analysis of a fictional 20-response survey, a 6-slide deck, a poster mockup, and a team rehearsal. Use synthetic data only. Each deliverable needs an owner and a completion checklist.',notes:'Meeting: Sara leads research. Ali handles survey analysis. Mei designs the poster. Dan assembles the slides after research and analysis. Rehearsal depends on the slides and poster. Keep the Friday evening free for final checks. All effort estimates are provisional and need review.',members:[member('sara','Sara',['research','analysis'],[2,2,2,2,2,1]),member('ali','Ali',['analysis','research'],[2,2,2,0,1,0]),member('mei','Mei',['design','slides'],[1,2,2,2,2,1]),member('dan','Dan',['slides','presentation'],[1,2,2,2,2,1])],tasks:[task('research','Research summary','sara',3,[],'research'),task('analysis','Analyse the sample survey','ali',3,[],'analysis'),task('poster','Design poster mockup','mei',3,['research'],'design'),task('slides','Build the six-slide deck','dan',4,['research','analysis'],'slides'),task('rehearsal','Team rehearsal and final checks','dan',1,['poster','slides'],'presentation')]};
}
