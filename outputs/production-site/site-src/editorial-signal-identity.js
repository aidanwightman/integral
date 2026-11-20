/* Progressive enhancement: add real chapter/application navigation; keep demo iframe intact. */
(()=>{
 function install(){
  const hero=document.querySelector('.hero'),aside=hero?.querySelector('.hero-aside'),demo=document.querySelector('.demo-wrap');
  if(!hero||!aside||hero.querySelector('.es-landing-index'))return;
  const chapters=[['demo','Explore the workspace','A working example'],['approach','How we build it','From friction to flow'],['savings','The savings model','Incentives, aligned'],['walkthrough','Your guided tour','Start with your role'],['about','Our experience','The operating perspective']];
  const index=document.createElement('nav');index.className='es-landing-index';index.setAttribute('aria-label','Editorial contents');
  const heading=document.createElement('p');heading.className='es-index-label';heading.textContent='In this edition';index.append(heading);
  const links=()=>chapters.map(([id,title,description],i)=>{const a=document.createElement('a');a.href='#'+id;const n=document.createElement('span');n.className='es-index-number';n.textContent=String(i+1).padStart(2,'0');n.setAttribute('aria-hidden','true');const text=document.createElement('span');const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=description;text.append(strong,small);a.append(n,text);return a;});
  index.append(...links());hero.prepend(index);
  const launch=document.createElement('nav');launch.className='es-launchpad';launch.setAttribute('aria-label','Signal workspace launcher');const title=document.createElement('p');title.className='es-launchpad-title';title.textContent='Choose an application';launch.append(title,...links());aside.prepend(launch);
  if(demo){const bar=document.createElement('div');bar.className='es-demo-titlebar';const name=document.createElement('strong');name.textContent='Integral / Interactive workspace';const status=document.createElement('span');status.textContent='Synthetic data';bar.append(name,status);demo.prepend(bar);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
