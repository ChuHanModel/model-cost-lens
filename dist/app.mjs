import {snapshot} from './data.mjs';
import {weights,compare,presets,parseCSV,toCSV} from './core.mjs';
const $=id=>document.getElementById(id);
let models=snapshot.map(m=>({...m})),rows=[],ratio=presets.linke.ratio,hit=presets.linke.hit,sortKey='cost',sortDirection=1;
const money=p=>p===null?'待核验':'¥'+Number(p.toFixed(4)).toString();
const costMoney=p=>p===null?'无法计算':'¥'+p.toFixed(3);
const setText=(id,t)=>{$(id).textContent=t;};
function applyPreset(name){const p=presets[name];if(!p)throw new Error('未知场景');ratio=p.ratio;hit=p.hit;$('ratio').value=Number(ratio.toFixed(3));$('hit').value=hit;document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));setText('preset-note',name==='linke'?'52 个本地业务会话、453 次模型响应的汇总构成。':name==='board'?'缓存输入 : 普通输入 : 输出 = 97 : 2 : 1。':'输入 : 输出 = 40 : 1；所有输入均按普通输入计费。');render();}
function chart(){
 const valid=rows.filter(r=>r.cost!==null),front=valid.filter(r=>r.frontier).sort((a,b)=>a.cost-b.cost||b.score-a.score);
 if(!valid.length){$('chart').textContent='当前场景下没有价格完整的模型。补齐有用量部分的单价后即可计算。';return;}
 const width=780,height=355,left=56,right=27,top=30,bottom=53,pw=width-left-right,ph=height-top-bottom;
 const maxPrice=Math.max(...valid.map(r=>r.cost),.1)*1.18,low=Math.floor((Math.min(...valid.map(r=>r.score))-4)/5)*5,high=Math.ceil((Math.max(...valid.map(r=>r.score))+5)/5)*5;
 const x=v=>left+Math.log1p(v/.1)/Math.log1p(maxPrice/.1)*pw,y=v=>top+(high-v)/(high-low)*ph;
 const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','模型折算价与综合评分散点图，绿色为性价比边界。具体数据可在下方表格查看。');
 const el=(tag,attrs={},text)=>{const n=document.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;svg.append(n);return n;};
 for(let t=low;t<=high;t+=5){el('line',{x1:left,x2:width-right,y1:y(t),y2:y(t),stroke:'#e6ebf2','stroke-dasharray':'3 4'});el('text',{x:left-11,y:y(t)+4,'text-anchor':'end',fill:'#8290a5','font-size':10},t);}
 const ticks=[0,.03,.1,.3,1,3,10,30,100,300,1000].filter(v=>v<=maxPrice);
 for(const t of ticks){el('line',{x1:x(t),x2:x(t),y1:top,y2:height-bottom,stroke:'#f0f3f7'});el('text',{x:x(t),y:height-bottom+21,'text-anchor':'middle',fill:'#8290a5','font-size':10},'¥'+t);}
 el('text',{x:left,y:17,fill:'#6b778a','font-size':10},'综合评分');el('text',{x:width-right,y:height-9,'text-anchor':'end',fill:'#6b778a','font-size':10},'折算成本 / 百万总 Token');
 if(front.length>1)el('polyline',{points:front.map(r=>`${x(r.cost)},${y(r.score)}`).join(' '),fill:'none',stroke:'#087b67','stroke-width':2,'stroke-dasharray':'5 4',opacity:.7});
 const labelSlots=[];const labelIds=new Set(front.length<=6?front.map(r=>r.id):Array.from({length:6},(_,i)=>front[Math.round(i*(front.length-1)/5)].id));
 for(const r of valid.sort((a,b)=>Number(a.frontier)-Number(b.frontier))){const xx=x(r.cost),yy=y(r.score);const c=el('circle',{cx:xx,cy:yy,r:r.frontier?6:4.2,fill:r.frontier?'#087b67':'#bac6d8',stroke:'#fff','stroke-width':2,tabindex:0});const title=document.createElementNS(svgNS,'title');title.textContent=`${r.name}：${costMoney(r.cost)}，综合评分 ${r.score}，${r.frontier?'边界模型':'被支配'}`;c.append(title);
 if(r.frontier&&labelIds.has(r.id)){let labelX=xx+12,labelY=yy-10;if(labelX>width-190)labelX=xx-12;while(labelSlots.some(s=>Math.abs(s.y-labelY)<16&&Math.abs(s.x-labelX)<180))labelY+=17;labelSlots.push({x:labelX,y:labelY});el('text',{x:labelX,y:labelY,'text-anchor':labelX<xx?'end':'start',fill:'#087b67','font-size':11,'font-weight':600,style:'paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round'},r.name);}
 }
 $('chart').replaceChildren(svg);
}
function table(){
 const ordered=[...rows].sort((a,b)=>{const av=a[sortKey],bv=b[sortKey];if(av==null&&bv==null)return a.name.localeCompare(b.name);if(av==null)return 1;if(bv==null)return -1;return (av-bv)*sortDirection||a.name.localeCompare(b.name);});
 const fragment=document.createDocumentFragment();
 for(const r of ordered){const tr=document.createElement('tr');if(r.frontier)tr.className='is-frontier';const cell=(text,cls)=>{const td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;tr.append(td);return td;};cell(r.rank??'—');const modelCell=cell('','model');const name=document.createElement(r.id.startsWith('import-')?'span':'a');name.textContent=r.name;if(name.tagName==='A'){name.href='https://aihot.news/leaderboard/'+r.id;name.target='_blank';name.rel='noopener';}modelCell.append(name);const provider=document.createElement('small');provider.textContent=r.provider;modelCell.append(provider);cell(money(r.cache),'price');cell(money(r.input),'price');cell(money(r.output),'price');const c=cell(costMoney(r.cost),'price cost');if(r.cost!==null)c.title=`未取整折算价：¥${r.cost.toFixed(8)}`;cell(r.score.toFixed(1),'price');const status=cell('');const pill=document.createElement('span');pill.className='pill'+(r.cost===null?' missing':r.frontier?' good':'');pill.textContent=r.cost===null?'价格缺失':r.frontier?'在边界上':'被支配';if(r.dominatedBy.length)pill.title='价格不高、评分不低的替代：'+r.dominatedBy.join('、');status.append(pill);fragment.append(tr);}
 $('model-rows').replaceChildren(fragment);
 document.querySelectorAll('[data-sort]').forEach(b=>{const labels={rank:'原榜名次',cache:'缓存价',input:'输入价',output:'输出价',cost:'折算价',score:'综合评分'};b.textContent=labels[b.dataset.sort]+(b.dataset.sort===sortKey?(sortDirection===1?' ▲':' ▼'):'');b.closest('th').setAttribute('aria-sort',b.dataset.sort===sortKey?(sortDirection===1?'ascending':'descending'):'none');});
}
function render(){
 const w=weights(ratio,hit);rows=compare(models,w);setText('hit-label',hit.toFixed(2)+'%');
 for(const key of ['cache','input','output']){setText('w-'+key,(w[key]*100).toFixed(2)+'%');$('mix-'+key).style.width=w[key]*100+'%';}
 setText('frontier-count',rows.filter(r=>r.frontier).length+' 个边界模型');setText('missing-count',rows.filter(r=>r.cost===null).length+' 个模型因价格缺失未入图');setText('control-error','');chart();table();
}
function custom(){const nextRatio=$('ratio').valueAsNumber,nextHit=$('hit').valueAsNumber;try{weights(nextRatio,nextHit);ratio=nextRatio;hit=nextHit;document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('active'));setText('preset-note','自定义场景；按当前比例重新计算。');render();}catch(e){setText('control-error',e.message+' 图表暂时保留上一次有效结果。');}}
function importData(text){try{const imported=parseCSV(text);models=imported;render();setText('dataset-note',`自定义 CSV · ${models.length} 个模型。请使用同一评分体系和相同货币单位。`);setText('data-status',`已导入 ${models.length} 个模型；原榜快照可随时恢复。`);return {models:models.length};}catch(e){setText('data-status',e.message);throw e;}}
function download(text,name){const blob=new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('ratio').addEventListener('input',custom);$('hit').addEventListener('input',custom);document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));
$('export').addEventListener('click',()=>{download(toCSV(rows),'model-cost-lens-results.csv');setText('data-status','已导出当前场景的估算结果。');});$('template').addEventListener('click',()=>download('model,provider,score,cache,input,output\r\nExample A,Custom,60,0.1,1,3\r\nExample B,Custom,65,0.2,2,6','model-cost-lens-template.csv'));
$('import-text').addEventListener('click',()=>{try{importData($('csv-text').value);}catch{}});
$('csv-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('CSV 不能超过 1 MB。');importData(await file.text());}catch(err){setText('data-status',err.message);}finally{e.target.value='';}});
$('restore').addEventListener('click',()=>{models=snapshot.map(m=>({...m}));render();setText('dataset-note','AIHOT 综合榜当前国产筛选的 25 个模型；快照并非实时更新。');setText('data-status','已恢复 2026-10-06 快照，当前使用比例保持不变。');});
 document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.sort;if(sortKey===key)sortDirection*=-1;else{sortKey=key;sortDirection=key==='score'?-1:1;}table();}));
applyPreset('linke');
// Optional WebMCP, sharing exactly the same UI state and validation.
if(document.modelContext?.registerTool){
 const tool={name:'configure_cost_scenario',title:'设置模型成本场景',description:'设置输入输出比和输入缓存命中率，并更新本页折算价与性价比边界。',inputSchema:{type:'object',properties:{input_output_ratio:{type:'number',minimum:0,maximum:1000000},input_cache_hit_percent:{type:'number',minimum:0,maximum:100}},required:['input_output_ratio','input_cache_hit_percent'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||Object.keys(input).some(k=>!['input_output_ratio','input_cache_hit_percent'].includes(k)))throw new Error('无效参数');weights(input.input_output_ratio,input.input_cache_hit_percent);ratio=input.input_output_ratio;hit=input.input_cache_hit_percent;$('ratio').value=Number(ratio.toFixed(3));$('hit').value=hit;document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('active'));setText('preset-note','自定义场景；按当前比例重新计算。');render();return {input_output_ratio:ratio,input_cache_hit_percent:hit,frontier:rows.filter(r=>r.frontier).map(r=>({model:r.name,estimated_cost:r.cost,score:r.score}))};}};
 try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}
}
