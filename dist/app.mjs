import {snapshot,metadata} from './data.mjs';
import {weights,compare,selectModels,toCSV} from './core.mjs';
const $=id=>document.getElementById(id);
const categoryNames={overall:'综合',coding:'编程',reasoning:'科研',professional:'专业办公',knowledge:'知识问答'};
let values=[97,2,1],category='overall',domestic=false,open=false,search='',rows=[],sortKey='cost',sortDirection=1;
const money=p=>p===null?'未知':'¥'+Number(p.toFixed(4)).toString();
const costMoney=p=>p===null?'无法计算':'¥'+p.toFixed(3);
const setText=(id,t)=>{$(id).textContent=t;};
function chart(){
 const valid=rows.filter(r=>r.cost!==null&&Number.isFinite(r.score)&&r.rank!==null),front=valid.filter(r=>r.frontier).sort((a,b)=>a.cost-b.cost||b.score-a.score);
 if(!valid.length){$('chart').textContent='当前筛选下没有已入榜且价格可计算的模型。';return;}
 const width=780,height=275,left=56,right=27,top=30,bottom=53,pw=width-left-right,ph=height-top-bottom;
 const maxPrice=Math.max(...valid.map(r=>r.cost),.1)*1.18,low=Math.floor((Math.min(...valid.map(r=>r.score))-4)/5)*5,high=Math.ceil((Math.max(...valid.map(r=>r.score))+5)/5)*5;
 const x=v=>left+Math.log1p(v/.1)/Math.log1p(maxPrice/.1)*pw,y=v=>top+(high-v)/(high-low)*ph;
 const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','模型折算价与当前分类评分散点图，绿色为性价比边界。具体数据可在下方表格查看。');
 const el=(tag,attrs={},text)=>{const n=document.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;svg.append(n);return n;};
 for(let t=low;t<=high;t+=5){el('line',{x1:left,x2:width-right,y1:y(t),y2:y(t),stroke:'#e6ebf2','stroke-dasharray':'3 4'});el('text',{x:left-11,y:y(t)+4,'text-anchor':'end',fill:'#8290a5','font-size':10},t);}
 const ticks=[0,.03,.1,.3,1,3,10,30,100,300,1000].filter(v=>v<=maxPrice);
 for(const t of ticks){el('line',{x1:x(t),x2:x(t),y1:top,y2:height-bottom,stroke:'#f0f3f7'});el('text',{x:x(t),y:height-bottom+21,'text-anchor':'middle',fill:'#8290a5','font-size':10},'¥'+t);}
 el('text',{x:left,y:17,fill:'#6b778a','font-size':10},'当前分类评分');el('text',{x:width-right,y:height-9,'text-anchor':'end',fill:'#6b778a','font-size':10},'折算成本 / 百万总 Token');
 if(front.length>1)el('polyline',{points:front.map(r=>`${x(r.cost)},${y(r.score)}`).join(' '),fill:'none',stroke:'#087b67','stroke-width':2,'stroke-dasharray':'5 4',opacity:.7});
 const labelSlots=[];const labelIds=new Set(front.length<=6?front.map(r=>r.id):Array.from({length:6},(_,i)=>front[Math.round(i*(front.length-1)/5)].id));
 for(const r of valid.sort((a,b)=>Number(a.frontier)-Number(b.frontier))){const xx=x(r.cost),yy=y(r.score);const c=el('circle',{cx:xx,cy:yy,r:r.frontier?6:4.2,fill:r.frontier?'#087b67':'#bac6d8',stroke:'#fff','stroke-width':2,tabindex:0});const title=document.createElementNS(svgNS,'title');title.textContent=`${r.name}：${costMoney(r.cost)}，当前分类评分 ${r.score}，${r.frontier?'边界模型':'被支配'}`;c.append(title);
 if(r.frontier&&labelIds.has(r.id)){let labelX=xx+12,labelY=yy-10;if(labelX>width-190)labelX=xx-12;while(labelSlots.some(s=>Math.abs(s.y-labelY)<16&&Math.abs(s.x-labelX)<180))labelY+=17;labelSlots.push({x:labelX,y:labelY});el('text',{x:labelX,y:labelY,'text-anchor':labelX<xx?'end':'start',fill:'#087b67','font-size':11,'font-weight':600,style:'paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round'},r.name);}
 }
 $('chart').replaceChildren(svg);
}
function table(){
 const ordered=[...rows].sort((a,b)=>{const av=a[sortKey],bv=b[sortKey];if(av==null&&bv==null)return a.name.localeCompare(b.name);if(av==null)return 1;if(bv==null)return -1;return (av-bv)*sortDirection||a.name.localeCompare(b.name);});
 const fragment=document.createDocumentFragment();
 for(const r of ordered.filter(r=>!search||(`${r.name} ${r.provider}`).toLowerCase().includes(search))){const tr=document.createElement('tr');if(r.frontier)tr.className='is-frontier';const cell=(text,cls)=>{const td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;tr.append(td);return td;};cell(r.rank??'—');const modelCell=cell('','model');const name=document.createElement(r.id.startsWith('import-')?'span':'a');name.textContent=r.name;if(name.tagName==='A'){name.href=r.url;name.target='_blank';name.rel='noopener';}modelCell.append(name);const provider=document.createElement('small');provider.textContent=r.provider;modelCell.append(provider);cell(money(r.cache),'price');cell(money(r.input),'price');cell(money(r.output),'price');const c=cell(costMoney(r.cost),'price cost');if(r.cost!==null)c.title=`未取整折算价：¥${r.cost.toFixed(8)}`;cell(r.score===null?'—':r.score.toFixed(1),'price');const status=cell('');const pill=document.createElement('span');pill.className='pill'+(r.cost===null?' missing':r.frontier?' good':'');pill.textContent=r.rank===null?'暂未入榜':r.cost===null?'价格缺失':r.frontier?'在边界上':'有更优替代';if(r.dominatedBy.length)pill.title='价格不高、评分不低的替代：'+r.dominatedBy.join('、');status.append(pill);fragment.append(tr);}
 $('model-rows').replaceChildren(fragment);setText('model-count',`${$('model-rows').children.length} 个 / 当前筛选 ${rows.length} 个`);$('empty').hidden=$('model-rows').children.length>0;
 document.querySelectorAll('[data-sort]').forEach(b=>{const labels={rank:'原榜名次',cache:'缓存价',input:'输入价',output:'输出价',cost:'折算价',score:categoryNames[category]+'评分'};b.textContent=labels[b.dataset.sort]+(b.dataset.sort===sortKey?(sortDirection===1?' ▲':' ▼'):'');b.closest('th').setAttribute('aria-sort',b.dataset.sort===sortKey?(sortDirection===1?'ascending':'descending'):'none');});
}

function render(){
 const w=weights(...values);rows=compare(selectModels(snapshot,category,domestic,open),w);
 for(const key of ['cache','input','output']){setText('w-'+key,(w[key]*100).toFixed(2)+'%');$('mix-'+key).style.width=w[key]*100+'%';}
 setText('frontier-count',rows.filter(r=>r.frontier).length+' 个边界模型');
 setText('missing-count',`${rows.filter(r=>r.rank===null).length} 个暂未入榜 · ${rows.filter(r=>r.rank!==null&&r.cost===null).length} 个价格不全`);
 setText('control-error','');setText('dataset-note',`使用${categoryNames[category]}评分；价格为 ¥ / 百万 Token，折算价为 ¥ / 百万总 Token。`);chart();table();
}
function custom(){const next=['cache-weight','input-weight','output-weight'].map(id=>$(id).valueAsNumber);try{weights(...next);values=next;render();}catch(e){setText('control-error',e.message+' 暂时保留上一次有效结果。');}}
for(const id of ['cache-weight','input-weight','output-weight'])$(id).addEventListener('input',custom);
document.querySelectorAll('[data-values]').forEach(b=>b.addEventListener('click',()=>{values=b.dataset.values.split(',').map(Number);['cache-weight','input-weight','output-weight'].forEach((id,i)=>$(id).value=values[i]);render();}));
$('category').addEventListener('change',()=>{category=$('category').value;render();});$('domestic').addEventListener('change',()=>{domestic=$('domestic').checked;render();});$('open').addEventListener('change',()=>{open=$('open').checked;render();});$('search').addEventListener('input',()=>{search=$('search').value.trim().toLowerCase();table();});
document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.sort;if(sortKey===key)sortDirection*=-1;else{sortKey=key;sortDirection=key==='score'?-1:1;}table();}));
$('export').addEventListener('click',()=>{const csv=toCSV(rows.filter(r=>!search||(`${r.name} ${r.provider}`).toLowerCase().includes(search)));const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`model-cost-${category}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setText('data-status','已导出当前表格的成本比较。');});
setText('snapshot-note',`AIHOT · ${metadata.modelCount} 个型号 · 5 个分类`);setText('coverage-note',`${metadata.coverage} 抓取时间：2026-10-06 23:51–23:53（北京时间），源站更新：${metadata.sourceUpdated}。其中 ${metadata.rankedCount} 个型号已入榜，其余暂未入榜。`);render();
if(document.modelContext?.registerTool){
 const tool={name:'configure_cost_scenario',title:'设置 Token 比例',description:'按缓存输入、普通输入、输出的相对用量更新本页折算价和斩杀线。',inputSchema:{type:'object',properties:{cached_input:{type:'number',minimum:0,maximum:1e15},uncached_input:{type:'number',minimum:0,maximum:1e15},output:{type:'number',minimum:0,maximum:1e15}},required:['cached_input','uncached_input','output'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||Object.keys(input).some(k=>!['cached_input','uncached_input','output'].includes(k)))throw new Error('无效参数');const next=[input.cached_input,input.uncached_input,input.output];weights(...next);values=next;['cache-weight','input-weight','output-weight'].forEach((id,i)=>$(id).value=values[i]);render();return {weights:weights(...values),category,frontier:rows.filter(r=>r.frontier).map(r=>({model:r.name,cost:r.cost,score:r.score}))};}};
 try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}
}
