/* Progressive enhancement: add real chapter/application navigation; keep demo iframe intact. */
(()=>{
 function install(){
  const hero=document.querySelector('.hero'),demo=document.querySelector('.demo-wrap');
  if(!hero||hero.querySelector('.es-landing-index'))return;
  const chapters=[['walkthrough','Explore savings','Automations, data and software'],['approach','How we build it','From scoping to handover'],['savings','How pricing works','Our fee and your savings'],['about','Our experience','Meet the founder']];
  const index=document.createElement('nav');index.className='es-landing-index';index.setAttribute('aria-label','Editorial contents');
  const heading=document.createElement('p');heading.className='es-index-label';heading.textContent='In this edition';index.append(heading);
  const links=()=>chapters.map(([id,title,description],i)=>{const a=document.createElement('a');a.href='#'+id;const n=document.createElement('span');n.className='es-index-number';n.textContent=String(i+1).padStart(2,'0');n.setAttribute('aria-hidden','true');const text=document.createElement('span');const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=description;text.append(strong,small);a.append(n,text);return a;});
  index.append(...links());hero.prepend(index);
  if(demo){const bar=document.createElement('div');bar.className='es-demo-titlebar';const name=document.createElement('strong');name.textContent='Integral / Interactive workspace';const status=document.createElement('span');status.textContent='Synthetic data';bar.append(name,status);demo.prepend(bar);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
