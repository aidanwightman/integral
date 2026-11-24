import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = name => readFileSync(new URL('../../outputs/production-site/site-src/'+name, import.meta.url), 'utf8');
const script = ['savings-paths.js','savings-field-industries.js','savings-industries.js','savings-walkthrough.js'].map(source).join('\n');
const visibleCopy=html=>html.replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"');

function openLanding(hash='') {
  const location={hash}, entries=[{hash,state:null}];
  let index=0, click, onHashChange, onDesignChange, look='glass';
  const demoLink={};
  const ui={focus:'',scrolls:0,call:null,demo:null,top:180,header:100};
  let onClose;
  const dialog={
    open:false,
    showModal(){this.open=true;ui.focus='.sw-example-close';},
    close(){this.open=false;onClose?.();onClose=null;},
    addEventListener(name,fn){if(name==='close')onClose=fn;}
  };
  const mount={
    innerHTML:'',contains:()=>true,
    querySelector(selector){
      if(selector==='.sw-example-dialog')return this.innerHTML.includes('<dialog')?dialog:null;
      if(selector==='[data-sw-action="demo"]')return this.innerHTML.includes('data-sw-action="demo"')?demoLink:null;
      return {
        focus(){ui.focus=selector;},
        getBoundingClientRect:()=>({top:ui.top,bottom:ui.top+40}),
        scrollIntoView(){ui.scrolls++;}
      };
    }
  };
  function move(offset) {
    if(!entries[index+offset])return;
    const oldURL='https://example.test/'+location.hash;
    index+=offset;
    location.hash=entries[index].hash;
    onHashChange({oldURL});
  }
  const history={
    get state(){return entries[index].state;},
    pushState(state,_title,hash){entries.splice(index+1,entries.length,{hash,state});index++;location.hash=hash;},
    replaceState(state,_title,hash){entries[index]={hash,state};location.hash=hash;},
    back:()=>move(-1),forward:()=>move(1)
  };
  const page=vm.createContext({
    document:{
      querySelector:selector=>selector==='[data-savings-content]'?mount:selector==='.site-header'?{getBoundingClientRect:()=>({bottom:ui.header})}:null,
      querySelectorAll:()=>[],
      addEventListener(type,fn){if(type==='click')click=fn;}
    },
    window:{innerHeight:844,addEventListener(type,fn){
      if(type==='hashchange')onHashChange=fn;
      if(type==='data-saver-design-change')onDesignChange=fn;
    }},
    history,location,URL,DEMO_URL:'demo.html',selectedLook:()=>look,
    workspaceURL:r=>'#studio/agency/'+r.role+'/'+r.look+'/'+r.view+(r.outcomeCase?'/'+r.outcomeCase:''),
    openWorkspace:(...args)=>ui.demo=args,openSavingsCall:(_trigger,text)=>ui.call=text
  });
  vm.runInContext(script,page);
  function press(dataset,options={},href=null) {
    const target={dataset,isConnected:true,getAttribute:name=>name==='href'?href:null,
      closest:selector=>selector==='dialog'?dialog:target,
      focus(){ui.focus=dataset.swAction;}
    };
    let prevented=false;
    click({target,button:0,preventDefault(){prevented=true;},...options});
    return prevented;
  }
  function changeDesign(value){look=value;onDesignChange();}
  return {mount,location,history,ui,press,dialog,changeDesign,paths:vm.runInContext('SAVINGS_PATHS',page),industries:vm.runInContext('SAVINGS_INDUSTRIES',page)};
}

const first=openLanding();
assert.equal(first.ui.focus,'', 'Loading the ordinary homepage leaves focus in place');
assert.equal(first.press({},{ctrlKey:true},'#walkthrough'),false);
assert.equal(first.press({}, {}, '#walkthrough'),true);
assert.equal(first.ui.scrolls,0,'A visible hero panel must stay in place');
first.ui.top=-200;
first.press({}, {}, '#walkthrough');
assert.equal(first.ui.scrolls,1,'A panel above the sticky header must be brought into view');
const {mount,location,history,ui,press,dialog,paths,industries}=openLanding('#walkthrough');
assert.equal(ui.focus,'.sw-step-title');
assert.equal((mount.innerHTML.match(/data-savings-start=/g)||[]).length,3);
assert.doesNotMatch(mount.innerHTML,/£|%|<form|<input/);
assert.match(mount.innerHTML,/Choose my business type/);
const reception=openLanding('#walkthrough/automation/reception');
const [receptionFinding,receptionExample]=reception.mount.innerHTML.split('<dialog');
assert.match(receptionFinding,/Staff time/);
assert.match(receptionFinding,/Costs to check/);
assert.doesNotMatch(receptionFinding,/£|freed up per month/);
assert.match(receptionExample,/180 incoming calls per month at 4 minutes each before the change and 2 minutes each afterwards/);
assert.match(receptionExample,/6 hours freed up per month/);
assert.match(receptionFinding,/<details class="sw-related"><summary>CRM demo and related workflows<\/summary>/);

for(const [finding,route] of [
  ['#walkthrough/data/signature','demo.html?example=incoming-signature#studio/agency/sales/forest/contacts'],
  ['#walkthrough/automation/handoff','demo.html#studio/agency/operations/forest/outcomes/delivery']
]){
  const landing=openLanding(finding);
  const link=landing.mount.querySelector('[data-sw-action="demo"]');
  assert.ok(landing.mount.innerHTML.includes(route.replace('/forest/','/glass/')));
  landing.press({swAction:'example'});
  landing.changeDesign('forest');
  assert.equal(link.href,route,'Copied links and links opened in a new tab must use the selected design');
  assert.equal(landing.location.hash,finding);
  assert.equal(landing.ui.focus,'.sw-example-close','Updating the link must leave the walkthrough in place');
}

const seatsExample=openLanding('#walkthrough/software/seats').mount.innerHTML.split('<dialog')[1];
assert.match(seatsExample,/First-year cash saving before our fee<\/span><strong>£72,000/);
assert.match(seatsExample,/£120,000 − £48,000 = £72,000/);

let tailored=0;
function checkExample(expected) {
  const html=mount.innerHTML;
  assert.doesNotMatch(html,/Try this follow-up|data-event=|data-sw-action="simulate"/i);
  assert.equal(html.includes('View worked example'),expected);
  assert.equal((html.match(/<dialog /g)||[]).length,Number(expected));
  if(!expected)return;
  assert.equal((html.match(/id="sw-example-title"/g)||[]).length,1);
  assert.doesNotMatch(html,/<dialog[^>]*\sopen(?:\s|>)/);
  assert.match(html,/<dialog[^>]*aria-labelledby="sw-example-title"/);
  const routeBefore=location.hash;
  press({swAction:'example'});
  assert.equal(dialog.open,true);
  assert.equal(ui.focus,'.sw-example-close');
  press({swAction:'close-example'});
  assert.equal(dialog.open,false);
  assert.equal(ui.focus,'example');
  assert.equal(location.hash,routeBefore);
}
assert.deepEqual(Object.keys(industries).sort(),['construction','electrical','events','services','sales','consulting','trading','other'].sort());
for(const [id,industry] of Object.entries(industries)){
  press({swAction:'quiz'});assert.equal(location.hash,'#walkthrough/business');
  assert.ok(visibleCopy(mount.innerHTML).includes(industry.label));
  press({swAction:'industry',industry:id});
  assert.equal(location.hash,'#walkthrough/business/'+id);
  assert.match(mount.innerHTML,/Where do you lose the most time or money\?/);
  for(const issue of industry.choices){
    press({swAction:'issue',issue:issue.id});
    assert.equal(location.hash,'#walkthrough/business/'+id+'/'+issue.id);
    assert.match(mount.innerHTML,/data-step="finding"/);
    assert.ok(visibleCopy(mount.innerHTML).includes(issue.findingTitle));
    assert.ok(visibleCopy(mount.innerHTML).includes(issue.spend));
    if(issue.alternative)assert.ok(visibleCopy(mount.innerHTML).includes(issue.alternative));
    checkExample(!!issue.example);
    assert.ok(mount.innerHTML.includes('Costs to check'));
    assert.ok(mount.innerHTML.includes('Book a free call'));
    press({swAction:'call'});assert.equal(ui.call,[industry.label+' · '+issue.label,issue.time,issue.spend,issue.nextStep].filter(Boolean).join('\n'));
    press({swAction:'back'});
    assert.equal(ui.focus,'[data-issue="'+issue.id+'"]');
    tailored++;
  }
  press({swAction:'back'});assert.equal(ui.focus,'[data-industry="'+id+'"]');
  press({swAction:'back'});assert.equal(ui.focus,'[data-sw-action="quiz"]');
}
const firm=openLanding('#walkthrough/business');
firm.press({swAction:'industry',industry:'construction'});
const firstIssue=firm.industries.construction.choices[0].id;
firm.press({swAction:'issue',issue:firstIssue});
firm.history.back();assert.match(firm.mount.innerHTML,/data-step="issue"/);
firm.history.forward();assert.match(firm.mount.innerHTML,/data-step="finding"/);
assert.match(openLanding(firm.location.hash).mount.innerHTML,/data-step="finding"/);

let findings=0;
for(const [key,path] of Object.entries(paths)){
  for(const choice of path.choices){
    press({savingsStart:key});
    assert.match(mount.innerHTML,/data-step="inputs"/);
    assert.doesNotMatch(mount.innerHTML,/£|%|sw-example/);
    press({swAction:'diagnose',choice:choice.id});
    assert.equal(location.hash,'#walkthrough/'+key+'/'+choice.id);
    assert.equal(ui.focus,'.sw-step-title');
    assert.ok(visibleCopy(mount.innerHTML).includes(choice.findingTitle));
    checkExample(true);
    assert.ok(mount.innerHTML.includes('Book a free call'));
    assert.doesNotMatch(mount.innerHTML,/<form|<input|your estimate|edit figures|estimate time saved/i);
    const example=mount.innerHTML.match(/<dialog class="sw-example-dialog"[\s\S]*?<\/dialog>/)?.[0];
    assert.ok(example);
    assert.match(example,/Illustrative first-year example/);
    assert.match(example,/of the original £[\d,]+ annual cost/);
    assert.doesNotMatch(mount.innerHTML.replace(example,''),/£|\d+(?:\.\d+)?%/);
    const costs=choice.example?.costs || path.costs;
    const before=12*costs.currentSpend;
    const after=12*(costs.retainedSpend+costs.replacementSpend)+costs.transitionCost;
    const format=x=>x.toLocaleString('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0});
    assert.ok(example.includes(format(before)+' − '+format(after)+' = '+format(before-after)));
    press({swAction:'call'});
    assert.equal(ui.call,[path.label+' · '+choice.label,choice.time,choice.spend,choice.nextStep || (!choice.time && choice.finding)].filter(Boolean).join('\n'));
    press({swAction:'demo'});
    assert.equal(ui.demo[0],choice.demo.role);
    assert.equal(ui.demo[2],choice.demo.view);
    assert.equal(ui.demo[4],choice.demo.outcomeCase || null);
    assert.equal(ui.demo[6],choice.demo.example);
    if(choice.demo.example)assert.ok(mount.innerHTML.includes('?example='+choice.demo.example+'#studio/'));
    findings++;
  }
}
const route=openLanding('#walkthrough');
route.press({savingsStart:'software'});
route.press({swAction:'diagnose',choice:'owned'});
route.history.back();
assert.match(route.mount.innerHTML,/data-step="inputs"/);
route.history.forward();
assert.match(route.mount.innerHTML,/data-step="result"/);
route.press({swAction:'back'});
assert.equal(route.ui.focus,'[data-choice="owned"]');
route.press({swAction:'back'});
assert.equal(route.ui.focus,'[data-savings-start="software"]');
assert.equal(route.ui.scrolls,0,'A heading or return control already on screen should not trigger scrolling');
const legacy=openLanding('#walkthrough/software/owned/edit');
assert.equal(legacy.location.hash,'#walkthrough/software/owned');
assert.match(legacy.mount.innerHTML,/data-step="result"/);
assert.doesNotMatch(legacy.mount.innerHTML,/<form|<input/);
for(const [id,view] of [['linkedin','contacts'],['email','contacts'],['noshow','dialer']]){
  const linked=openLanding('#walkthrough/automation/'+id);
  assert.match(linked.mount.innerHTML,/data-step="result"/);
  linked.press({swAction:'demo'});
  assert.equal(linked.ui.demo[2],view);
  assert.equal(linked.ui.demo[4],null);
}
console.log('PASS: 3 categories and '+findings+' findings, '+Object.keys(industries).length+' business choices and '+tailored+' specific issues, accessible worked-example dialogs, scoped examples, booking, header scroll, keyboard focus and history.');
