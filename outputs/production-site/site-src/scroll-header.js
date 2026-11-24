/* One directional header for every identity. Native wheel/touch scrolling stays native. */
(()=>{
 const header=document.querySelector('.site-header');if(!header)return;
 const html=document.documentElement;
 const sections=[...header.querySelectorAll('nav a[href^="#"]')].map(link=>({link,target:document.getElementById(link.hash.slice(1))})).filter(item=>item.target);
 function markSection(){
   const line=Math.min(window.innerHeight-1,Math.max(header.offsetHeight+16,window.innerHeight*0.25));
   for(const {link,target} of sections){
     const box=target.getBoundingClientRect();
     if(box.top<=line && box.bottom>line)link.setAttribute('aria-current','location');
     else link.removeAttribute('aria-current');
   }
 }
 let previous=Math.max(0,window.scrollY),travel=0,direction=0;
 const reveal=()=>header.classList.remove('scroll-hidden');
 function update(){
  markSection();
  const y=Math.max(0,Math.min(window.scrollY,document.documentElement.scrollHeight-window.innerHeight));
  const delta=y-previous;previous=y;
  const open=(html.dataset.glassMenu==='true'||html.dataset.glassTools==='true');
  if(y<Math.max(100,header.offsetHeight)||open||header.querySelector(':focus-visible')){reveal();travel=0;return;}
  if(!delta)return;
  const next=Math.sign(delta);if(next!==direction){travel=0;direction=next;}travel+=Math.abs(delta);
  if(travel>=12){header.classList.toggle('scroll-hidden',direction>0);travel=0;}
 }
 window.addEventListener('scroll',update,{passive:true});
 window.addEventListener('resize',markSection);
 markSection();
 header.addEventListener('focusin',reveal);
 window.addEventListener('hashchange',()=>{reveal();travel=0;previous=Math.max(0,window.scrollY);});
 new MutationObserver(()=>{reveal();travel=0;previous=Math.max(0,window.scrollY);}).observe(html,{attributes:true,attributeFilter:['data-design','data-glass-menu','data-glass-tools']});
})();
