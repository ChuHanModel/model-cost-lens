export const LINKE = Object.freeze({input:1739294,cache:11531904,output:333691,total:13604889,sessions:52,responses:453});
export const presets = Object.freeze({linke:{ratio:(LINKE.input+LINKE.cache)/LINKE.output,hit:LINKE.cache/(LINKE.input+LINKE.cache)*100},board:{ratio:99,hit:97/99*100},cold:{ratio:40,hit:0}});
export function weights(ratio,hit){
  if(!Number.isFinite(ratio)||ratio<0||ratio>1000000||!Number.isFinite(hit)||hit<0||hit>100)throw new Error('输入输出比必须在 0–1,000,000，缓存命中率必须在 0–100%。');
  const inputTotal=ratio/(ratio+1);return {cache:inputTotal*hit/100,input:inputTotal*(1-hit/100),output:1/(ratio+1)};
}
export function estimate(model,w){
  const prices=[model.cache,model.input,model.output], shares=[w.cache,w.input,w.output];
  if(prices.some((p,i)=>shares[i]>0 && (p===null||!Number.isFinite(p)||p<0)))return null;
  return prices.reduce((s,p,i)=>s+(shares[i]===0?0:p*shares[i]),0);
}
export function compare(models,w){
  const rows=models.map(m=>({...m,cost:estimate(m,w)}));
  return rows.map(m=>({...m,dominatedBy:m.cost===null?[]:rows.filter(n=>n.id!==m.id&&n.cost!==null&&n.cost<=m.cost&&n.score>=m.score&&(n.cost<m.cost||n.score>m.score)).map(n=>n.name),frontier:m.cost!==null&&!rows.some(n=>n.id!==m.id&&n.cost!==null&&n.cost<=m.cost&&n.score>=m.score&&(n.cost<m.cost||n.score>m.score))}));
}
export function parseCSV(text){
  // RFC 4180 quoting, BOM, CRLF; a quoted field can contain commas and newlines.
  const records=[];let row=[],field='',quoted=false,closed=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(closed&&c!==','&&c!=='\r'&&c!=='\n'&&c!==' '&&c!=='\t')throw new Error('CSV 引号后的内容无效。');
    if(c==='"'){if(field.trim()||closed)throw new Error('CSV 引号位置无效。');quoted=true;field='';}
    else if(c===','){row.push(field);field='';closed=false;}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))records.push(row);row=[];field='';closed=false;}
    else if(!closed)field+=c;
  }
  if(quoted)throw new Error('CSV 有未闭合的引号。');
  row.push(field);if(row.some(v=>v.trim()))records.push(row);
  if(records.length<2)throw new Error('CSV 至少需要表头和一条模型数据。');
  if(records.length>501)throw new Error('一次最多导入 500 个模型。');
  const head=records.shift().map(x=>x.trim().toLowerCase()),required=['model','score','cache','input','output'];
  if(new Set(head).size!==head.length)throw new Error('CSV 表头不能重复。');
  if(required.some(k=>!head.includes(k)))throw new Error('表头需要 model,score,cache,input,output；provider 可选。');
  return records.map((r,i)=>{
    if(r.length!==head.length)throw new Error(`第 ${i+2} 行的列数与表头不一致。`);
    const get=k=>r[head.indexOf(k)]?.trim()??'';
    const price=k=>{const v=get(k);if(!v||v==='—'||v==='待核验')return null;if(!/^\d+(\.\d+)?$/.test(v))throw new Error(`第 ${i+2} 行 ${k} 必须是非负价格或留空。`);const n=Number(v);if(!Number.isFinite(n)||n>1000000000)throw new Error('价格必须在 0–1,000,000,000。');return n;};
    const name=get('model'),scoreText=get('score'),score=Number(scoreText);
    if(!name||name.length>160||!scoreText||!Number.isFinite(score)||score<0||score>1000)throw new Error(`第 ${i+2} 行模型名称或评分无效。`);
    return {id:`import-${i}`,name,provider:get('provider')||'自定义',score,cache:price('cache'),input:price('input'),output:price('output'),rank:null};
  });
}
export function toCSV(rows){
  // Avoid spreadsheet formula execution when exported user-provided labels are opened in Excel.
  const q=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return ['model,provider,score,cache,input,output,estimated_cost,frontier',...rows.map(r=>[r.name,r.provider,r.score,r.cache,r.input,r.output,r.cost==null?'':r.cost.toFixed(8),r.frontier?'yes':'no'].map(q).join(','))].join('\r\n');
}
