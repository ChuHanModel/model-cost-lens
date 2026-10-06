export function weights(cache,input,output){
 const values=[cache,input,output];
 if(values.some(v=>!Number.isFinite(v)||v<0||v>1e15)||values.every(v=>v===0))throw new Error('三项必须是非负数，且至少一项大于 0。');
 const total=cache+input+output;return {cache:cache/total,input:input/total,output:output/total};
}
export function estimate(model,w){
 const prices=[model.cache,model.input,model.output],shares=[w.cache,w.input,w.output];
 if(prices.some((p,i)=>shares[i]>0&&(p===null||!Number.isFinite(p)||p<0)))return null;
 return prices.reduce((sum,p,i)=>sum+(shares[i]===0?0:p*shares[i]),0);
}
export function selectModels(models,category,domestic=false,open=false){
 return models.filter(m=>(!domestic||m.domestic===true)&&(!open||m.open===true)).map(m=>({...m,score:m.scores[category]??null,rank:m.ranks[category]??null}));
}
export function compare(models,w){
 const rows=models.map(m=>({...m,cost:estimate(m,w)}));
 const eligible=m=>m.cost!==null&&Number.isFinite(m.score)&&m.rank!==null;
 const dominates=(n,m)=>eligible(n)&&n.id!==m.id&&n.cost<=m.cost&&n.score>=m.score&&(n.cost<m.cost||n.score>m.score);
 return rows.map(m=>{const dominatedBy=eligible(m)?rows.filter(n=>dominates(n,m)).map(n=>n.name):[];return {...m,dominatedBy,frontier:eligible(m)&&dominatedBy.length===0};});
}
export function toCSV(rows){
  // Avoid spreadsheet formula execution when exported user-provided labels are opened in Excel.
  const q=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return ['model,provider,score,cache,input,output,estimated_cost,frontier',...rows.map(r=>[r.name,r.provider,r.score,r.cache,r.input,r.output,r.cost==null?'':r.cost.toFixed(8),r.frontier?'yes':'no'].map(q).join(','))].join('\r\n');
}
