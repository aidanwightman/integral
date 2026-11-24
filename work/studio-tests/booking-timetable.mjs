import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';

// Exercise the built page with Chrome and Playwright (project or bundled runtime).
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),resolve(dirname(process.execPath),'..')]}));
const landing=readFileSync(new URL('../../docs/index.html',import.meta.url),'utf8');
const existingOpenings={
  '2026-11-26':['07:00','18:00'], '2026-11-27':['09:00','18:30'],
  '2026-12-03':['08:30'], '2026-12-11':['18:00']
};
const weekdayTimes=Array.from({length:24},(_,i)=>String(7+Math.floor(i/2)).padStart(2,'0')+':'+(i%2?'30':'00'));
const saturdayTimes=['09:00','09:30','10:00','10:30'];
const sundayTimes=['10:00','10:30'];
const dayTimes=[weekdayTimes,weekdayTimes,weekdayTimes,weekdayTimes,weekdayTimes,saturdayTimes,sundayTimes];
const openCounts=[15,14,15,14,15,2,1];
const dates=Array.from({length:21},(_,i)=>new Date(Date.UTC(2026,10,23+i)).toISOString().slice(0,10));
const browser=await chromium.launch({channel:'chrome'});
const bookingUrl='https://booking.invalid/availability?utm_source=integral';
const email='morgan+uk@example.invalid';
const contactPhone='+44 (0)20 7946-0958';
const notes='Quote A&B + delivery?\nCall after 14:00 #team / café';

async function openPage({now='2026-11-22T20:00:00Z',width=1440,timezoneId='America/Los_Angeles',configured=false,hash='',testTimer=false,closing=false}={}) {
  const page=await browser.newPage({timezoneId,viewport:{width,height:844},reducedMotion:'reduce'});
  if(testTimer){
    await page.clock.install({time:new Date(Date.parse(now)-5000)});
    await page.clock.pauseAt(new Date(now));
  }else await page.clock.setFixedTime(new Date(now));
  const html=configured?landing.replace(/const SITE_CONFIG=(\{[^\n]*?\}); const DEMO_URL=/,(_,text)=>{
    const config=JSON.parse(text);
    config.bookingUrl=bookingUrl;
    config.callSchedule.openings={...config.callSchedule.openings,'2026-11-29':['10:00','17:00','19:30']};
    config.callSchedule.confirmedBookings={'2026-11-26':['07:00','18:00'],'2026-11-29':['10:00','17:00']};
    return 'const SITE_CONFIG='+JSON.stringify(config)+'; const DEMO_URL=';
  }):landing;
  await page.route('**/*',route=>route.request().url()==='https://integral.test/'
    ?route.fulfill({contentType:'text/html',body:html}):route.abort());
  await page.goto('https://integral.test/'+hash);
  const trigger=hash?page.locator('[data-sw-action="call"]'):page.locator('[data-savings-call]').nth(closing?-1:0);
  await trigger.click();
  const dialog=page.locator('#savings-call-dialog');
  await dialog.waitFor({state:'visible'});
  return {page,trigger,dialog};
}
const day=(dialog,date)=>dialog.locator('#booking-days button[data-date="'+date+'"]');
const slot=(dialog,time)=>dialog.locator('#booking-slots [data-time="'+time+'"]');
const activeDate=dialog=>dialog.locator('#booking-days [aria-pressed="true"]').getAttribute('data-date');
const detailsNext=dialog=>dialog.locator('#booking-details-next');

async function enterDetails(dialog){
  await detailsNext(dialog).click();
  await dialog.locator('#booking-intake').waitFor({state:'visible'});
  return {address:dialog.locator('#booking-email'),number:dialog.locator('#booking-phone'),note:dialog.locator('#booking-notes'),
    submit:dialog.locator('#booking-intake-submit'),status:dialog.locator('#booking-intake-status')};
}
async function browserStorage(page) {
  return {
    persistent:await page.context().storageState({indexedDB:true}),
    session:await page.evaluate(()=>Object.entries(sessionStorage))
  };
}

try {
  const {page,trigger,dialog}=await openPage();
  assert.equal(await dialog.getByRole('heading',{name:'Apply for a free consultation',exact:true}).isVisible(),true);
  assert.equal(await activeDate(dialog),'2026-11-23');
  assert.equal(await detailsNext(dialog).isVisible(),true);
  const previous=dialog.locator('#booking-previous-week'),next=dialog.locator('#booking-next-week');
  assert.equal(await previous.isDisabled(),true);
  for(let week=0;week<3;week++){
    const buttons=dialog.locator('#booking-days button[data-date]');
    const weekDates=dates.slice(week*7,(week+1)*7);
    assert.deepEqual(await buttons.evaluateAll(list=>list.map(d=>d.dataset.date)),weekDates);
    let openTotal=0,unavailableTotal=0;
    for(const [weekday,date] of weekDates.entries()){
      await day(dialog,date).click();
      assert.equal(await activeDate(dialog),date);
      assert.equal(await day(dialog,date).evaluate(el=>el===document.activeElement),true);
      const slots=await dialog.locator('#booking-slots .booking-slot').evaluateAll(list=>list.map(el=>[el.dataset.time,el.dataset.state]));
      assert.deepEqual(slots.map(([time])=>time),dayTimes[weekday],date+' visible starts');
      const open=slots.filter(([,state])=>state==='planned').map(([time])=>time);
      const unavailable=slots.filter(([,state])=>state==='blocked');
      assert.equal(open.length,openCounts[weekday],date+' openings');
      assert.equal(open.length+unavailable.length,slots.length,date+' planned or unavailable');
      if(weekday===5)assert.deepEqual(open,['09:00','10:00'],date);
      if(weekday===6)assert.deepEqual(open,['10:00'],date);
      for(const time of existingOpenings[date]||[])assert.ok(open.includes(time),date+' retained opening '+time);
      if(weekday===4)assert.deepEqual(open.slice(-2),['18:00','18:30'],date+' final Friday openings');
      openTotal+=open.length;
      unavailableTotal+=unavailable.length;
      assert.equal(await dialog.locator('[data-state="blocked"]:not(:disabled)').count(),0);
      assert.equal(await day(dialog,date).getAttribute('data-has-opening'),'true');
      assert.equal(await detailsNext(dialog).isVisible(),true);
    }
    assert.deepEqual([openTotal,unavailableTotal],[76,50],'Weekly capacity: 50 of 126 starts unavailable');
    if(week<2)await next.click();
  }
  assert.equal(await next.isDisabled(),true);
  await previous.click();
  assert.equal(await day(dialog,'2026-12-03').count(),1);
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  await page.close();

  const phone=await openPage({width:390,hash:'#walkthrough/automation/linkedin',now:'2026-11-27T00:05:00Z'});
  assert.equal(await activeDate(phone.dialog),'2026-11-27','The UK day has changed while it is still Thursday in California');
  assert.equal(await phone.dialog.locator('#savings-call-estimate').isVisible(),true);
  await day(phone.dialog,'2026-11-26').click();
  assert.equal(await slot(phone.dialog,'18:00').getAttribute('data-state'),'past');
  assert.equal(await slot(phone.dialog,'18:00').isDisabled(),true);
  await phone.page.clock.setFixedTime(new Date('2026-11-27T09:00:00Z'));
  await day(phone.dialog,'2026-11-27').click();
  assert.equal(await slot(phone.dialog,'09:00').getAttribute('data-state'),'past');
  assert.equal(await slot(phone.dialog,'18:30').getAttribute('data-state'),'planned');

  const storageBefore=await browserStorage(phone.page);
  const requests=[];
  phone.page.on('request',r=>requests.push(r.url()));
  const input=await enterDetails(phone.dialog);
  assert.equal(await input.address.evaluate(el=>el===document.activeElement),true);
  assert.match(await phone.dialog.locator('#booking-intake-help').innerText(),/preview/i);
  assert.equal(await input.submit.innerText(),'Check your details');
  assert.equal(await input.address.getAttribute('type'),'email');
  assert.equal(await input.address.evaluate(el=>el.required),true);
  assert.equal(await input.number.evaluate(el=>el.required),true);
  assert.equal(await input.note.evaluate(el=>el.required),false);
  await input.submit.click();
  assert.equal(await input.address.evaluate(el=>el.validity.valueMissing),true);
  await input.address.fill('not-an-email');
  await input.number.fill(contactPhone);
  await input.submit.click();
  assert.equal(await input.address.evaluate(el=>el.validity.typeMismatch),true);
  assert.equal(await input.status.innerText(),'');
  await input.address.fill(email);
  for(const invalidPhone of ['123-456','+1234567890123456','12345abc67']){
    await input.number.fill(invalidPhone);
    await input.submit.click();
    assert.equal(await input.number.evaluate(el=>el.validity.valid),false,invalidPhone);
    assert.equal(await input.status.innerText(),'');
  }
  await input.number.fill(contactPhone);
  await input.note.fill(notes);
  await phone.dialog.locator('#booking-intake-back').click();
  assert.equal(await activeDate(phone.dialog),'2026-11-27');
  assert.equal(await detailsNext(phone.dialog).evaluate(el=>el===document.activeElement),true);
  await enterDetails(phone.dialog);
  assert.deepEqual(await Promise.all([input.address.inputValue(),input.number.inputValue(),input.note.inputValue()]),[email,contactPhone,notes]);
  await input.note.fill('');
  for(const accepted of ['123-4567','+123 4567 8901 2345',contactPhone]){
    await input.number.fill(accepted);
    await input.submit.click();
    assert.equal(await input.number.evaluate(el=>el.validity.valid),true,accepted);
    assert.match(await input.status.innerText(),/preview hasn[’']t sent them or booked a call/i);
  }
  await input.note.fill(notes);
  await phone.page.keyboard.press('Escape');
  await phone.dialog.waitFor({state:'hidden'});
  assert.equal(await phone.trigger.evaluate(el=>el===document.activeElement),true);
  await phone.trigger.click();
  await enterDetails(phone.dialog);
  assert.deepEqual(await Promise.all([input.address.inputValue(),input.number.inputValue(),input.note.inputValue()]),['','','']);
  assert.equal(await input.status.innerText(),'');
  assert.deepEqual(requests,[],'Preview intake must not issue network requests');
  assert.deepEqual(await browserStorage(phone.page),storageBefore,'Preview intake must not persist personal details');
  await phone.page.close();

  for(const optionalNote of [notes,'']){
    const connected=await openPage({configured:true,closing:true});
    assert.equal(await activeDate(connected.dialog),'2026-11-23');
    await day(connected.dialog,'2026-11-26').click();
    assert.equal(await slot(connected.dialog,'07:00').getAttribute('data-state'),'booked');
    assert.equal(await slot(connected.dialog,'07:00').isDisabled(),true);
    assert.equal(await detailsNext(connected.dialog).isVisible(),true,'Other Thursday windows remain available');
    await day(connected.dialog,'2026-11-29').click();
    assert.equal(await slot(connected.dialog,'10:00').getAttribute('data-state'),'booked');
    assert.equal(await slot(connected.dialog,'17:00').count(),0,'A stray booking cannot expand Sunday hours');
    assert.equal(await slot(connected.dialog,'19:30').count(),0,'A stray opening cannot expand Sunday hours');
    assert.equal(await detailsNext(connected.dialog).isVisible(),false,'The only offered Sunday start is booked');
    assert.equal(await day(connected.dialog,'2026-11-29').getAttribute('data-has-opening'),'false');
    await day(connected.dialog,'2026-11-27').click();
    assert.equal(await slot(connected.dialog,'09:00').getAttribute('data-state'),'candidate');
    const live=await enterDetails(connected.dialog);
    assert.equal(await live.submit.innerText(),'Continue to Calendly');
    await live.address.fill(email);
    await live.number.fill(contactPhone);
    await live.note.fill(optionalNote);
    await connected.page.route('https://booking.invalid/**',route=>route.fulfill({contentType:'text/html',body:'<title>Provider fixture</title>'}));
    await live.submit.click();
    await connected.page.waitForURL('https://booking.invalid/**');
    const url=new URL(connected.page.url()),expected=new URL(bookingUrl);
    assert.equal(url.origin+url.pathname,expected.origin+expected.pathname);
    assert.deepEqual(Object.fromEntries(url.searchParams),{
      utm_source:'integral',email,a1:contactPhone,...(optionalNote?{a2:optionalNote}:{})
    });
    await connected.page.close();
  }

  const weekend=await openPage({now:'2026-11-29T09:59:59Z',width:320,timezoneId:'Asia/Tokyo'});
  assert.equal(await activeDate(weekend.dialog),'2026-11-29','10:00 in London is still offered even though it is already evening in Tokyo');
  assert.equal(await weekend.dialog.locator('#booking-day-title').innerText(),'Sunday 29 November');
  assert.equal(await day(weekend.dialog,'2026-11-29').getAttribute('aria-pressed'),'true');
  for(const [date,expected] of [['2026-11-28',saturdayTimes],['2026-11-29',sundayTimes]]){
    await day(weekend.dialog,date).click();
    const mobile=await weekend.dialog.locator('#booking-slots').evaluate(grid=>{
      const box=grid.getBoundingClientRect();
      return {times:Array.from(grid.children,chip=>chip.dataset.time),
        fits:box.left>=0&&box.right<=innerWidth&&Array.from(grid.children).every(chip=>chip.getBoundingClientRect().right<=box.right+1)};
    });
    assert.deepEqual(mobile.times,expected);
    assert.ok(mobile.fits,'320px weekend slots fit');
  }
  await weekend.page.close();

  const ghost=await openPage({now:'2026-11-28T23:59:59Z',configured:true});
  assert.equal(await activeDate(ghost.dialog),'2026-11-30','Skip a fully booked Sunday even when it has an off-hours override');
  await ghost.page.close();

  const expired=await openPage({now:'2026-12-14T02:00:00Z'});
  assert.equal(await activeDate(expired.dialog),'2026-12-13');
  assert.equal(await expired.dialog.locator('#booking-next-week').isDisabled(),true);
  assert.equal(await expired.dialog.locator('[data-state="planned"],[data-state="candidate"]').count(),0);
  await expired.page.close();

  for(const [date,time,remains] of [['2026-11-23','07:00',true],['2026-12-11','18:30',false],['2026-12-13','10:00',false]]){
    const start=Date.parse(date+'T'+time+':00Z');
    const rollover=await openPage({now:new Date(start-400).toISOString(),testTimer:true});
    assert.equal(await activeDate(rollover.dialog),date);
    const opening=slot(rollover.dialog,time);
    assert.equal(await opening.getAttribute('data-state'),'planned');
    await rollover.page.clock.runFor(900);
    assert.equal(await opening.getAttribute('data-state'),'past',date+' '+time+' expires at its UK start');
    assert.equal(await opening.isDisabled(),true);
    assert.equal(await detailsNext(rollover.dialog).isVisible(),remains);
    await rollover.page.close();
  }
  for(const refresh of ['visibility','activation','submit']){
    const stale=await openPage({now:'2026-12-13T09:59:15Z',configured:true});
    let staleForm;
    if(refresh==='submit'){
      staleForm=await enterDetails(stale.dialog);
      await staleForm.address.fill(email);
      await staleForm.number.fill(contactPhone);
    }
    await stale.page.clock.setFixedTime(new Date('2026-12-13T10:00:01Z'));
    if(refresh==='visibility')await stale.page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    else if(refresh==='submit')await staleForm.submit.click();
    else await detailsNext(stale.dialog).click();
    if(staleForm){
      assert.equal(await staleForm.submit.isDisabled(),true);
      assert.match(await staleForm.status.innerText(),/back to times/i);
      await stale.dialog.locator('#booking-intake-back').click();
      assert.equal(await staleForm.address.inputValue(),email);
      assert.equal(await staleForm.number.inputValue(),contactPhone);
    }
    assert.equal(await activeDate(stale.dialog),'2026-12-13');
    assert.equal(await slot(stale.dialog,'10:00').getAttribute('data-state'),'past');
    assert.equal(await detailsNext(stale.dialog).isVisible(),false);
    assert.equal(stale.page.url(),'https://integral.test/');
    await stale.page.close();
  }
  console.log('PASS: three UK weeks, 76 offered and 50 unavailable starts per week, reduced weekends, off-hours overrides, expiry, contact validation, private preview and provider handoff.');
} finally {
  await browser.close();
}
