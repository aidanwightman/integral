const savingsCallDialog=document.getElementById('savings-call-dialog');
const savingsCallSummary=document.getElementById('savings-call-summary');
let savingsCallTrigger;

const callSchedule=SITE_CONFIG.callSchedule;
const bookingDays=document.getElementById('booking-days');
const bookingSlots=document.getElementById('booking-slots');
const previousWeek=document.getElementById('booking-previous-week');
const nextWeek=document.getElementById('booking-next-week');
const bookingSchedule=savingsCallDialog.querySelector('.booking-schedule');
const bookingDetails=document.getElementById('booking-details-next');
const bookingIntake=document.getElementById('booking-intake');
const bookingEmail=document.getElementById('booking-email');
const bookingPhone=document.getElementById('booking-phone');
const bookingNotes=document.getElementById('booking-notes');
const bookingSubmit=document.getElementById('booking-intake-submit');
const intakeStatus=document.getElementById('booking-intake-status');
const shortDay=new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'UTC'});
const fullDay=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
const weekDates=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const londonClock=new Intl.DateTimeFormat('en-GB',{
  timeZone:callSchedule.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
});
let selectedBookingDate;
let bookingRefreshTimer;

function londonNow(){
  const parts=Object.fromEntries(londonClock.formatToParts(new Date()).map(part=>[part.type,part.value]));
  return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;
}
function calendarDay(isoDate){
  return new Date(isoDate+'T12:00:00Z');
}
function shiftDays(isoDate,offset){
  const day=calendarDay(isoDate);
  day.setUTCDate(day.getUTCDate()+offset);
  return day.toISOString().slice(0,10);
}
function mondayOf(isoDate){
  return shiftDays(isoDate,-((calendarDay(isoDate).getUTCDay()+6)%7));
}
function minutesAfterMidnight(time){
  const [hour,minute]=time.split(':').map(Number);
  return hour*60+minute;
}
const bookingTimetable=new Map();
for(let date=callSchedule.firstDay;date<=callSchedule.lastDay;date=shiftDays(date,1)){
  const weekday=shortDay.format(calendarDay(date));
  const hours=callSchedule.weeklySchedule?.[weekday];
  const start=minutesAfterMidnight(hours?.dayStartsAt ?? callSchedule.dayStartsAt);
  const end=minutesAfterMidnight(hours?.dayEndsAt ?? callSchedule.dayEndsAt);
  const openings=callSchedule.openings?.[date] ?? hours?.openings ?? [];
  const times=[];
  for(let minute=start;minute+callSchedule.durationMinutes<=end;minute+=callSchedule.durationMinutes){
    times.push(String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'));
  }
  bookingTimetable.set(date,{times,openings});
}
function slotState(date,time,now){
  if(date+'T'+time<=now)return 'past';
  if(callSchedule.confirmedBookings[date]?.includes(time))return 'booked';
  if(!bookingTimetable.get(date).openings.includes(time))return 'blocked';
  return SITE_CONFIG.bookingUrl?'candidate':'planned';
}
function hasOpening(date,now){
  return bookingTimetable.get(date).times.some(time=>['planned','candidate'].includes(slotState(date,time,now)));
}
function initialBookingDate(now){
  const today=now.slice(0,10);
  for(const date of bookingTimetable.keys()){
    if(date>=today && hasOpening(date,now))return date;
  }
  if(today<callSchedule.firstDay)return callSchedule.firstDay;
  return today>callSchedule.lastDay?callSchedule.lastDay:today;
}
function renderBookingDate(date,now=londonNow()){
  selectedBookingDate=date;
  const monday=mondayOf(date);
  const sunday=shiftDays(monday,6);
  const refocusDay=bookingDays.contains(document.activeElement);
  document.getElementById('booking-week-label').textContent=weekDates.formatRange(calendarDay(monday),calendarDay(sunday));
  previousWeek.disabled=monday<=callSchedule.firstDay;
  nextWeek.disabled=sunday>=callSchedule.lastDay;
  const days=document.createDocumentFragment();
  for(let i=0;i<7;i++){
    const day=shiftDays(monday,i);
    if(day<callSchedule.firstDay || day>callSchedule.lastDay)continue;
    const value=calendarDay(day);
    const button=document.createElement('button');
    button.type='button';
    button.className='booking-day';
    button.dataset.date=day;
    const offered=hasOpening(day,now);
    button.dataset.hasOpening=String(offered);
    button.setAttribute('aria-pressed',String(day===date));
    button.setAttribute('aria-label',fullDay.format(value)+(offered?', has booking windows':', unavailable'));
    const weekday=document.createElement('span');
    weekday.textContent=shortDay.format(value);
    const number=document.createElement('span');
    number.textContent=String(value.getUTCDate());
    button.append(weekday,number);
    days.append(button);
  }
  bookingDays.replaceChildren(days);
  if(refocusDay)bookingDays.querySelector('[aria-pressed="true"]').focus({preventScroll:true});

  document.getElementById('booking-day-title').textContent=fullDay.format(calendarDay(date));
  const grid=document.createDocumentFragment();
  const labels={blocked:'Unavailable',booked:'Booked',past:'Past',planned:'Planned opening',candidate:'Check with Calendly'};
  for(const time of bookingTimetable.get(date).times){
    const state=slotState(date,time,now);
    const unavailable=state==='blocked' || state==='booked' || state==='past';
    const chip=document.createElement(unavailable?'button':'span');
    if(unavailable){chip.type='button';chip.disabled=true;}
    chip.className='booking-slot';
    chip.dataset.time=time;
    chip.dataset.state=state;
    chip.textContent=time;
    if(state==='booked'){
      const label=document.createElement('small');
      label.textContent='Booked';
      chip.append(label);
    }else if(!unavailable){
      const label=document.createElement('span');
      label.className='sr-only';
      label.textContent=' · '+labels[state];
      chip.append(label);
    }
    chip.title=time+' · '+labels[state];
    if(unavailable)chip.setAttribute('aria-label',chip.title);
    grid.append(chip);
  }
  bookingSlots.replaceChildren(grid);
  const open=hasOpening(date,now);
  const live=Boolean(SITE_CONFIG.bookingUrl);
  document.getElementById('booking-open-label').textContent=live?'Booking window':'Planned opening';
  const status=document.getElementById('booking-status');
  if(!open)status.textContent='No openings on this date.';
  else if(live)status.textContent='Add your details, then choose a time on Calendly.';
  else status.textContent='These are proposed call times. Online booking hasn’t opened yet.';
  bookingDetails.hidden=!open;
  bookingSubmit.disabled=!open;
  if(!open && !bookingIntake.hidden)intakeStatus.textContent='The last opening on this day has passed. Go back to times to choose another day.';
}
bookingDays.addEventListener('click',event=>{
  const day=event.target.closest('button[data-date]');
  if(day)renderBookingDate(day.dataset.date);
});
function moveBookingWeek(offset){
  const next=shiftDays(selectedBookingDate,offset);
  const date=next<callSchedule.firstDay?callSchedule.firstDay:next>callSchedule.lastDay?callSchedule.lastDay:next;
  renderBookingDate(date);
  if((offset<0?previousWeek:nextWeek).disabled)bookingDays.querySelector('[aria-pressed="true"]').focus({preventScroll:true});
}
previousWeek.addEventListener('click',()=>moveBookingWeek(-7));
nextWeek.addEventListener('click',()=>moveBookingWeek(7));

function refreshBookingTimes(){
  clearTimeout(bookingRefreshTimer);
  if(!savingsCallDialog.open)return;
  const now=londonNow();
  const slotsChanged=Array.from(bookingSlots.children).some(slot=>slot.dataset.state!==slotState(selectedBookingDate,slot.dataset.time,now));
  const daysChanged=Array.from(bookingDays.children).some(day=>day.dataset.hasOpening!==String(hasOpening(day.dataset.date,now)));
  if(slotsChanged || daysChanged)renderBookingDate(selectedBookingDate,now);
  bookingRefreshTimer=setTimeout(refreshBookingTimes,60000-Date.now()%60000);
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')refreshBookingTimes();
});
function showBookingStep(showIntake){
  bookingIntake.hidden=!showIntake;
  bookingSchedule.hidden=showIntake;
  document.getElementById('savings-call-estimate').hidden=showIntake || !savingsCallSummary.textContent;
  savingsCallDialog.scrollTop=0;
}
bookingDetails.addEventListener('click',()=>{
  refreshBookingTimes();
  if(bookingDetails.hidden)return;
  intakeStatus.textContent='';
  showBookingStep(true);
  bookingEmail.focus();
});
document.getElementById('booking-intake-back').addEventListener('click',()=>{
  refreshBookingTimes();
  showBookingStep(false);
  const target=bookingDetails.hidden?bookingDays.querySelector('[aria-pressed="true"]'):bookingDetails;
  target.focus();
});
bookingIntake.addEventListener('input',()=>{
  if(!bookingSubmit.disabled)intakeStatus.textContent='';
  bookingPhone.setCustomValidity('');
});
bookingIntake.addEventListener('submit',event=>{
  event.preventDefault();
  refreshBookingTimes();
  if(bookingSubmit.disabled || bookingIntake.hidden)return;
  const phone=bookingPhone.value.trim();
  const digitCount=phone.replace(/\D/g,'').length;
  if(!/^\+?[\d\s().-]+$/.test(phone) || digitCount<7 || digitCount>15){
    bookingPhone.setCustomValidity('Enter a phone number with 7 to 15 digits. You can include a country code, spaces or brackets.');
    bookingPhone.reportValidity();
    return;
  }
  if(!SITE_CONFIG.bookingUrl){
    intakeStatus.textContent='Your details look ready. This preview hasn’t sent them or booked a call.';
    return;
  }
  const destination=new URL(SITE_CONFIG.bookingUrl);
  destination.searchParams.set('email',bookingEmail.value.trim());
  destination.searchParams.set('a1',phone);
  const notes=bookingNotes.value.trim();
  if(notes)destination.searchParams.set('a2',notes);
  else destination.searchParams.delete('a2');
  window.location.assign(destination.href);
});

function openSavingsCall(trigger,summary=''){
  const now=londonNow();
  renderBookingDate(initialBookingDate(now),now);
  savingsCallTrigger=trigger;
  savingsCallSummary.textContent=summary;
  showBookingStep(false);
  const live=Boolean(SITE_CONFIG.bookingUrl);
  document.getElementById('booking-intake-help').textContent=live?'Continue to share these details with Calendly and choose a time.':'This is a preview. Your details stay in this window until you close it.';
  bookingSubmit.textContent=live?'Continue to Calendly':'Check your details';
  savingsCallDialog.showModal();
  refreshBookingTimes();
}
document.querySelectorAll('[data-savings-call]').forEach(button=>{
  button.addEventListener('click',()=>openSavingsCall(button));
});
function clearBookingDetails(){
  bookingIntake.reset();
  bookingPhone.setCustomValidity('');
  intakeStatus.textContent='';
}
window.addEventListener('pagehide',clearBookingDetails);
savingsCallDialog.addEventListener('close',()=>{
  clearTimeout(bookingRefreshTimer);
  clearBookingDetails();
  savingsCallTrigger?.focus({preventScroll:true});
});
document.getElementById('savings-call-download').addEventListener('click',()=>{
  const blob=new Blob(['Integral savings walkthrough\n\n',savingsCallSummary.textContent,'\n'],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='integral-savings-summary.txt';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
