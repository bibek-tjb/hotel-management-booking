const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)||0);
const pretty=d=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const shiftDate=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const uid=()=>crypto.randomUUID?.()||'booking-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const rooms={deluxe:{id:'deluxe',name:'Deluxe King',price:6500,capacity:2,size:34,bed:'1 king bed',image:'/assets/deluxe.webp'},suite:{id:'suite',name:'Signature Suite',price:10500,capacity:3,size:62,bed:'King bed + daybed',image:'/assets/suite.webp'}};
const state={view:'guest',isManager:false,email:'',available:null,stay:null,room:null,step:1,requestKey:'',bookings:[],managed:[],status:'all',lastBooking:null,bookingPending:false,availabilityRun:0,tourRoom:'deluxe',openingBooking:false};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let motion=!reduced.matches,hotel=null,shot=-1,tourFrame=0,lastFocus=null,toastTimer;
function showError(id,message){const el=$(id);el.textContent=message;el.hidden=!message;}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
async function api(path,options={}){
  let response;
  try{response=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});}catch{throw new Error('We couldn’t connect to reservations. Your details are still here. Please try again.');}
  let data;try{data=await response.json();}catch{throw new Error('Reservations are temporarily unavailable. Please try again shortly.');}
  if(!response.ok){const error=new Error(data.error||'We couldn’t complete that request.');error.status=response.status;throw error;}return data;
}
function initialDates(serverToday=today()){
  $('#check-in').min=serverToday;$('#check-in').max=shiftDate(serverToday,365);
  if(!$('#check-in').value||$('#check-in').value<serverToday)$('#check-in').value=shiftDate(serverToday,1);
  if(!$('#check-out').value||$('#check-out').value<=$('#check-in').value)$('#check-out').value=shiftDate($('#check-in').value,2);
  $('#check-out').min=shiftDate($('#check-in').value,1);$('#check-out').max=shiftDate($('#check-in').value,30);
}
initialDates();
function searchValues(){return {checkIn:$('#check-in').value,checkOut:$('#check-out').value,guests:Number($('#guest-count').value)};}
function resetAvailability(){state.available=null;state.availabilityRun++;showError('#search-error','');$$('[data-reserve]').forEach(b=>{const room=rooms[b.dataset.reserve];b.disabled=Number($('#guest-count').value)>room.capacity;});for(const room of Object.values(rooms)){$(`[data-total="${room.id}"]`).textContent='Choose your dates';$(`[data-available="${room.id}"]`).textContent=Number($('#guest-count').value)>room.capacity?`Up to ${room.capacity} guests`:'All room charges included';}}
$('#check-in').addEventListener('change',()=>{initialDates();resetAvailability();});$('#check-out').addEventListener('change',resetAvailability);$('#guest-count').addEventListener('change',resetAvailability);
$('#search-form').addEventListener('change',updateTourRoom);
async function searchAvailability(scroll=true){
  if(!$('#search-form').reportValidity())return null;
  const values=searchValues();
  if(values.checkOut<=values.checkIn){showError('#search-error','Departure must be after your arrival date.');return null;}
  const run=++state.availabilityRun;const button=$('.search-submit');button.disabled=true;button.textContent='Checking rooms…';showError('#search-error','');
  try{
    const data=await api('/api/availability?'+new URLSearchParams(values));
    if(run!==state.availabilityRun)return null;
    state.available=data;state.stay={...data.stay};
    $('#availability-message').innerHTML=`<span>${esc(pretty(values.checkIn))} — ${esc(pretty(values.checkOut))} · ${data.stay.nights} ${data.stay.nights===1?'night':'nights'} · ${values.guests} ${values.guests===1?'guest':'guests'}</span><span>All room charges included · Pay at hotel</span>`;
    for(const room of data.rooms){rooms[room.id]={...rooms[room.id],...room};$(`[data-total="${room.id}"]`).textContent=money(room.total)+' total stay';$(`[data-available="${room.id}"]`).textContent=values.guests>room.capacity?`Up to ${room.capacity} guests`:(room.available?`${room.available} ${room.available===1?'room':'rooms'} available`:'No rooms for these dates');$(`[data-reserve="${room.id}"]`).disabled=!room.canBook;}
    updateTourRoom();if(scroll)goSection('rooms');return data;
  }catch(e){if(run===state.availabilityRun)showError('#search-error',e.message);return null;}
  finally{button.disabled=false;button.innerHTML='Find my room <span>→</span>';}
}
$('#search-form').addEventListener('submit',e=>{e.preventDefault();searchAvailability();});
function openDialog(id){lastFocus=document.activeElement;$(id).showModal();document.documentElement.style.overflow='hidden';}
function closeDialog(id){$(id).close();}
$$('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.documentElement.style.overflow='';lastFocus?.focus({preventScroll:true});});dialog.addEventListener('click',e=>{if(e.target===dialog&&!state.bookingPending){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
$('#booking-dialog').addEventListener('cancel',e=>{if(state.bookingPending)e.preventDefault();});
function setView(view){
  if($('#booking-dialog').open)closeDialog('#booking-dialog');
  state.view=view;for(const name of ['guest','bookings','management'])$(`#${name}-view`).hidden=name!==view;
  try{history.replaceState(null,'',view==='guest'?'#home':'#'+view);}catch{}
  window.scrollTo({top:0,behavior:'instant'});
  if(view==='bookings')loadBookings();if(view==='management')loadManagement();
  if(view==='guest'){hotel?.resume();requestAnimationFrame(()=>{hotel?.resize();updateTour();});}else hotel?.pause();
}
function goSection(id){if(state.view!=='guest')setView('guest');requestAnimationFrame(()=>{document.getElementById(id)?.scrollIntoView({behavior:motion?'smooth':'instant',block:'start'});});}
function totals(){const r=rooms[state.room],s=state.stay,b=$('#breakfast').checked;return {nights:s.nights,roomTotal:r.price*s.nights,breakfastTotal:b?650*s.guests*s.nights:0,total:r.price*s.nights+(b?650*s.guests*s.nights:0),breakfast:b};}
function updatePrice(){if(!state.room||!state.stay)return;const t=totals();$('#price-summary').innerHTML=`<div><span>${esc(rooms[state.room].name)} · ${t.nights} ${t.nights===1?'night':'nights'}</span><span>${money(t.roomTotal)}</span></div>${t.breakfast?`<div><span>Breakfast · ${state.stay.guests} ${state.stay.guests===1?'guest':'guests'}</span><span>${money(t.breakfastTotal)}</span></div>`:''}<div><span>Total stay <small>INR · all charges included</small></span><strong>${money(t.total)}</strong></div>`;}
async function openBooking(roomId,trigger){
  if(state.bookingPending||state.openingBooking)return;
  state.openingBooking=true;
  const button=trigger||$(`[data-reserve="${roomId}"]`);button.disabled=true;
  let availability=state.available;
  if(!availability)availability=await searchAvailability(false);
  button.disabled=false;state.openingBooking=false;updateTourRoom();
  if(!availability){if(trigger?.id==='tour-reserve')showError('#tour-room-error',$('#search-error').textContent||'Please check your dates and try again.');return;}
  const room=availability.rooms.find(r=>r.id===roomId);
  if(!room?.canBook){toast('That room is unavailable for your selected dates and guest count.');return;}
  state.room=roomId;state.step=1;state.requestKey=uid();state.stay={...availability.stay};
  $('#booking-form').reset();$('#guest-email').value=state.email;
  $('#booking-image').src=room.image;$('#booking-image').alt=room.name;
  $('#selected-room-name').textContent=room.name;$('#selected-room-features').textContent=`${room.size} m² · ${room.bed}`;
  $('#booking-dates').innerHTML=`<span>${esc(pretty(state.stay.checkIn))} → ${esc(pretty(state.stay.checkOut))}</span><small>${state.stay.nights} nights · ${state.stay.guests} guests</small>`;
  $('#booking-flow').hidden=false;$('#booking-success').hidden=true;showError('#booking-error','');setBookingStep(1);updatePrice();$('#booking-dialog').setAttribute('aria-labelledby','booking-title');openDialog('#booking-dialog');
}
function setBookingStep(step){state.step=step;$('#booking-sign-in').hidden=true;$('#guest-details-fields').hidden=step!==1;$('#review-details').hidden=step!==2;$('#terms-row').hidden=step!==2;$('#booking-agree').required=step===2;$('#edit-details').hidden=step!==2;$('#step-one').classList.toggle('active',step===1);$('#step-two').classList.toggle('active',step===2);$('#booking-title').innerHTML=step===1?'Make it <em>your stay.</em>':'One last <em>little look.</em>';$('#booking-submit').innerHTML=step===1?'Review your stay <span>→</span>':'Confirm reservation <span>↗</span>';showError('#booking-error','');}
$('#breakfast').addEventListener('change',updatePrice);
$('#edit-details').addEventListener('click',()=>setBookingStep(1));
$('#booking-form').addEventListener('submit',async e=>{
  e.preventDefault();if(state.bookingPending)return;
  const form=$('#booking-form');if(!form.reportValidity())return;
  const input=Object.fromEntries(new FormData(form));
  if(state.step===1){
    const digits=input.guestPhone.replace(/\D/g,'');if(digits.length<7){showError('#booking-error','Enter a valid phone number.');return;}
    $('#review-details').innerHTML=`<div class="review-details"><div><small>LEAD GUEST</small><p>${esc(input.guestName)}</p></div><div><small>PHONE</small><p>${esc(input.guestPhone)}</p></div><div><small>EMAIL ADDRESS</small><p>${esc(input.guestEmail)}</p></div><div><small>SPECIAL REQUESTS</small><p>${esc(input.requests||'No special requests')}</p></div></div>`;setBookingStep(2);$('#booking-dialog').scrollTop=0;return;
  }
  state.bookingPending=true;$('#booking-submit').disabled=true;$('#edit-details').disabled=true;$('#booking-dialog .dialog-close').disabled=true;$('#booking-submit').textContent='Saving your reservation…';showError('#booking-error','');
  try{
    const payload={...input,...state.stay,roomType:state.room,breakfast:$('#breakfast').checked,agree:$('#booking-agree').checked,requestKey:state.requestKey};
    const data=await api('/api/bookings',{method:'POST',body:JSON.stringify(payload)});
    if(!data.booking?.reference||!data.booking?.id)throw new Error('Please check My bookings before submitting again; your confirmation could not be loaded.');
    state.available=null;showConfirmation(data.booking);if(state.view==='management')loadManagement();
  }catch(error){showError('#booking-error',error.message);$('#booking-sign-in').hidden=error.status!==401;$('#booking-submit').innerHTML='Confirm reservation <span>↗</span>';}
  finally{state.bookingPending=false;$('#booking-submit').disabled=false;$('#edit-details').disabled=false;$('#booking-dialog .dialog-close').disabled=false;}
});
function statusLabel(s){return ({confirmed:'Confirmed',checked_in:'Checked in',checked_out:'Checked out',cancelled:'Cancelled'})[s]||s;}
function badge(s){return `<span class="badge ${esc(s)}">${esc(statusLabel(s))}</span>`;}
function showConfirmation(booking){
  state.lastBooking=booking;$('#booking-flow').hidden=true;$('#booking-success').hidden=false;
  $('#booking-success').innerHTML=`<div class="confirmation"><div class="confirmation-mark">${booking.status==='confirmed'?'✓':'✧'}</div><p class="eyebrow">SOLÈNE HOUSE</p><h2 id="confirmation-title" tabindex="-1">${booking.status==='confirmed'?'Your stay is confirmed.':'Your Solène reservation.'}</h2><p>${booking.status==='confirmed'?`We’re looking forward to welcoming you, ${esc(booking.guestName.split(' ')[0])}.`:'Your booking details are below.'}</p><div class="confirmation-ticket"><div class="ticket-head"><div><small>BOOKING REFERENCE</small><strong>${esc(booking.reference)}</strong></div>${badge(booking.status)}</div><div class="ticket-details"><div><small>YOUR ROOM</small><strong>${esc(booking.roomName)} · ${booking.roomNumber}</strong></div><div><small>YOUR COMPANY</small><strong>${booking.guests} ${booking.guests===1?'guest':'guests'} · ${booking.nights} ${booking.nights===1?'night':'nights'}</strong></div><div><small>CHECK-IN · FROM 2 PM</small><strong>${esc(pretty(booking.checkIn))}</strong></div><div><small>CHECK-OUT · BY 11 AM</small><strong>${esc(pretty(booking.checkOut))}</strong></div></div><div class="stay-contact"><div><small>GUEST CONTACT</small><p>${esc(booking.guestEmail)} · ${esc(booking.guestPhone)}</p></div><div><small>BREAKFAST</small><p>${booking.breakfast?'Included in your total':'Not selected'}</p></div>${booking.requests?`<div><small>SPECIAL REQUESTS</small><p class="special-request">${esc(booking.requests)}</p></div>`:''}</div><div class="ticket-total"><span>Total stay · Pay at hotel</span><strong>${money(booking.total)}</strong></div></div><div class="confirmation-actions"><button type="button" class="button outline" id="download-confirmation">Download confirmation ↓</button><button type="button" class="button dark" data-view="bookings">My bookings ↗</button></div><p class="demo-note">This reservation is saved in the demonstration system.<br>No real hotel stay or payment has been arranged.</p></div>`;
  $('#booking-dialog').setAttribute('aria-labelledby','confirmation-title');if(!$('#booking-dialog').open)openDialog('#booking-dialog');$('#booking-dialog').scrollTop=0;$('#confirmation-title').focus({preventScroll:true});
}
function downloadConfirmation(){const b=state.lastBooking;if(!b)return;const text=['SOLÈNE HOUSE','BOOKING '+statusLabel(b.status).toUpperCase(),'','Reference: '+b.reference,'Guest: '+b.guestName,'Room: '+b.roomName+' · '+b.roomNumber,'Check-in: '+pretty(b.checkIn)+' (from 2 pm)','Check-out: '+pretty(b.checkOut)+' (by 11 am)','Guests: '+b.guests,'Nights: '+b.nights,'Breakfast: '+(b.breakfast?'Included in total':'Not selected'),'Total: INR '+b.total,'Payment: Pay at hotel; no payment collected.','','Demonstration property. This record does not reserve a real hotel stay.'].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=b.reference+'-confirmation.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function errorView(error,retry){return `<div class="error-state"><h2>Let’s try that again.</h2><p>${esc(error.message)}</p>${error.status===401?'<a class="button dark" href="/signin-with-chatgpt?return_to=%2F%23bookings" target="_top">Sign in to continue ↗</a>':`<button type="button" class="button outline" data-retry="${retry}">Try again ↻</button>`}</div>`;}
async function loadBookings(){
  $('#bookings-content').innerHTML='<div class="loading">Finding your stays…</div>';
  try{const data=await api('/api/bookings');state.bookings=data.bookings;const manager=state.isManager?'<p class="manager-shortcut"><button type="button" class="text-button" data-view="management">Open hotel management ↗</button></p>':'';
    if(!data.bookings.length){$('#bookings-content').innerHTML=manager+'<div class="empty-state"><div class="empty-symbol">✧</div><h2>Your next chapter is waiting.</h2><p>You haven’t booked a stay yet.<br>Find a room, choose your dates, and make it yours.</p><button type="button" class="button dark" data-section="rooms">Explore rooms ↗</button></div>';return;}
    $('#bookings-content').innerHTML=manager+'<div class="booking-list">'+data.bookings.map(b=>`<article class="reservation-card"><img src="${esc(rooms[b.roomType]?.image||'/assets/deluxe.webp')}" alt="${esc(b.roomName)}"><div><span class="reference">${esc(b.reference)}</span><h3>${esc(b.roomName)}</h3><p>${esc(pretty(b.checkIn))} — ${esc(pretty(b.checkOut))}<br>${b.nights} nights · ${b.guests} guests · ${esc(b.guestName)}</p></div><div class="reservation-end">${badge(b.status)}<strong>${money(b.total)}</strong><button type="button" data-confirmation="${esc(b.id)}">View confirmation</button>${b.status==='confirmed'&&b.checkIn>today()?`<button type="button" data-action-id="${esc(b.id)}" data-action-status="cancelled">Cancel booking</button>`:''}</div></article>`).join('')+'</div>';
  }catch(error){$('#bookings-content').innerHTML=errorView(error,'bookings');}
}
async function loadManagement(){
  $('#management-content').innerHTML='<div class="loading">Loading your front desk…</div>';
  try{const data=await api('/api/management');state.managed=data.bookings;const s=data.summary;
    $('#management-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
    const stats=[['Active reservations',s.active_bookings||0,'Confirmed and checked-in stays'],['Arrivals today',s.arrivals_today||0,'Guests expected at reception'],['Currently checked in',s.checked_in||0,`${data.totalRooms} rooms in the hotel`],['Reservation value',money(s.reservation_value||0),'Excludes cancelled stays · not collected payments']];
    $('#management-stats').innerHTML=stats.map(([label,value,note])=>`<article class="stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');renderManagement();
  }catch(error){$('#management-content').innerHTML=errorView(error,'management');$('#management-stats').innerHTML='';}
}
function renderManagement(){
  const term=$('#reservation-search').value.trim().toLowerCase();
  const data=state.managed.filter(b=>(state.status==='all'||b.status===state.status)&&(!term||[b.guestName,b.guestEmail,b.reference,String(b.roomNumber)].some(t=>t.toLowerCase().includes(term))));
  if(!data.length){$('#management-content').innerHTML='<div class="empty-state"><div class="empty-symbol">✧</div><h2>No reservations here yet.</h2><p>'+ (state.managed.length?'Try another filter or search.':'Confirmed bookings will appear here, ready to manage.')+'</p></div>';return;}
  $('#management-content').innerHTML='<div class="table-scroll"><table><thead><tr><th>Guest / reference</th><th>Room</th><th>Stay</th><th>Total</th><th>Status</th><th>Manage</th></tr></thead><tbody>'+data.map(b=>{
    let actions=`<button class="table-action" type="button" data-confirmation="${esc(b.id)}">Details</button>`;
    if(b.status==='confirmed'){if(b.checkIn<=today()&&b.checkOut>today())actions+=`<button class="table-action" type="button" data-action-id="${b.id}" data-action-status="checked_in">Check in</button>`;actions+=`<button class="table-action" type="button" data-action-id="${b.id}" data-action-status="cancelled">Cancel</button>`;}
    if(b.status==='checked_in')actions+=`<button class="table-action" type="button" data-action-id="${b.id}" data-action-status="checked_out">Check out</button>`;
    return `<tr><td><strong>${esc(b.guestName)}</strong><small>${esc(b.reference)}</small></td><td>${esc(b.roomName)}<small>Room ${b.roomNumber} · ${b.guests} guests</small></td><td>${esc(pretty(b.checkIn))}<small>to ${esc(pretty(b.checkOut))} · ${b.nights} nights</small></td><td>${money(b.total)}<small>Pay at hotel</small></td><td>${badge(b.status)}</td><td>${actions}</td></tr>`;}).join('')+`</tbody></table></div><div class="table-meta">Showing ${data.length} of ${state.managed.length} loaded reservations · Most recent 500</div>`;
}
let pendingAction=null;
function askAction(id,status){const booking=[...state.bookings,...state.managed].find(b=>b.id===id);if(!booking)return;pendingAction={id,status};$('#action-title').textContent=status==='cancelled'?'Cancel this reservation?':status==='checked_in'?'Welcome your guest?':'Complete this stay?';$('#action-description').textContent=`${booking.guestName} · ${booking.reference}. ${status==='cancelled'?'The room will become available for these dates.':status==='checked_in'?'This reservation will be marked as checked in.':'This reservation will be marked as checked out.'}`;$('#confirm-action').textContent=status==='cancelled'?'Cancel reservation':status==='checked_in'?'Check in guest':'Complete checkout';showError('#action-error','');openDialog('#action-dialog');}
$('#confirm-action').addEventListener('click',async()=>{if(!pendingAction)return;const button=$('#confirm-action');button.disabled=true;try{await api('/api/bookings/'+pendingAction.id,{method:'PATCH',body:JSON.stringify({status:pendingAction.status})});closeDialog('#action-dialog');toast('Reservation updated.');state.available=null;if(state.view==='management')loadManagement();else loadBookings();}catch(error){showError('#action-error',error.message);}finally{button.disabled=false;}});
$('#reservation-search').addEventListener('input',renderManagement);$('#refresh-management').addEventListener('click',loadManagement);
const tourContent=[['A welcome worth the journey.','Discover the architecture, gardens, and warm glow of Solène House.'],['The door to your next chapter.','The double doors open as you arrive. A little warmth, right from the start.'],['Make yourself at home.','A calm reception, comfortable corners, and a team ready to welcome you.'],['Your own little sanctuary.','A king bed, considered comforts, and space to slow down. Choose your room to make it yours.']];
function updateTourRoom(){
  const room=rooms[state.tourRoom];if(!room)return;
  const stay=searchValues(),nights=Math.max(0,(Date.parse(stay.checkOut)-Date.parse(stay.checkIn))/86400000);
  $('#tour-room-name').textContent=room.name;$('#tour-room-facts').textContent=`${room.size} m² · ${room.bed} · Up to ${room.capacity} guests`;
  $('#tour-room-price').textContent=money(room.price);
  $('#tour-room-dates').textContent=stay.checkIn&&stay.checkOut?`${pretty(stay.checkIn)} — ${pretty(stay.checkOut)}`:'Choose arrival and departure dates';
  $('#tour-room-total').textContent=nights?`${money(room.price*nights)} for ${nights} ${nights===1?'night':'nights'} · All room charges included`:'';
  const button=$('#tour-reserve');button.dataset.tourReserve=room.id;
  const available=state.available?.rooms.find(r=>r.id===room.id);
  const overCapacity=stay.guests>room.capacity;
  button.disabled=state.openingBooking||overCapacity||available?.canBook===false;
  button.textContent=overCapacity?`Up to ${room.capacity} guests`:available?.canBook===false?'Unavailable for these dates':'Reserve this room ↗';
  $$('[data-tour-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tourRoom===room.id)));
  showError('#tour-room-error','');
}
function selectTourRoom(type){
  if(!rooms[type])return;state.tourRoom=type;hotel?.setRoomType(type);updateTourRoom();
  if(shot===3){$('#tour-title').textContent=rooms[type].name;$('#tour-description').textContent=type==='suite'?'A separate lounge, a private balcony, and room to make yourself at home.':'A king bed, a quiet reading corner, and thoughtful comforts throughout.';}
}
function updateTour(){
  tourFrame=0;if(state.view!=='guest')return;
  const section=$('#tour'),sticky=$('.tour-sticky'),travel=Math.max(1,section.offsetHeight-sticky.offsetHeight);
  const t=Math.max(0,Math.min(1,(scrollY-section.offsetTop+$('.header').offsetHeight)/travel));hotel?.setProgress(t);
  const current=Math.min(3,Math.round(t*3));
  if(current!==shot){
    shot=current;$('#tour-number').textContent=`0${current+1} / 04`;
    $('#tour-title').textContent=tourContent[current][0];$('#tour-description').textContent=tourContent[current][1];
    $$('[data-shot]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.shot)===current);b.setAttribute('aria-pressed',String(Number(b.dataset.shot)===current));});
    $('#door-button').textContent=current===3?'Compare rooms & rates ↗':current>=2?'Explore the guest room ↗':'Open the entrance doors ↗';
    $('#tour-room-panel').hidden=current!==3;sticky.classList.toggle('is-room',current===3);
    if(current===3)selectTourRoom(state.tourRoom);
    if(motion)$('.tour-information').animate?.([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});
  }
}
function queueTour(){if(!tourFrame)tourFrame=requestAnimationFrame(updateTour);}
function goShot(number){if(state.view!=='guest')setView('guest');const section=$('#tour'),sticky=$('.tour-sticky');scrollTo({top:section.offsetTop-$('.header').offsetHeight+(section.offsetHeight-sticky.offsetHeight)*number/3,behavior:motion?'smooth':'instant'});hotel?.setProgress(number/3);}
$('#door-button').addEventListener('click',()=>{if(!hotel||shot===3)goSection('rooms');else if(shot>=2)goShot(3);else{hotel?.openDoors();goShot(2);}});
$('#motion-button').addEventListener('click',()=>{motion=!motion;$('#motion-button').setAttribute('aria-pressed',String(motion));$('#motion-button').innerHTML=motion?'Ⅱ <span>Motion on</span>':'▷ <span>Motion off</span>';hotel?.setMotion(motion);});
reduced.addEventListener('change',e=>{motion=!e.matches;hotel?.setMotion(motion);$('#motion-button').setAttribute('aria-pressed',String(motion));$('#motion-button').innerHTML=motion?'Ⅱ <span>Motion on</span>':'▷ <span>Motion off</span>';});
addEventListener('scroll',queueTour,{passive:true});addEventListener('resize',queueTour,{passive:true});
document.addEventListener('click',e=>{
  const b=e.target.closest('button,a');if(!b)return;
  if(b.dataset.close){e.preventDefault();if(!state.bookingPending)closeDialog('#'+b.dataset.close);}
  if(b.dataset.view){e.preventDefault();setView(b.dataset.view);}
  if(b.dataset.section){e.preventDefault();if($('#booking-dialog').open)closeDialog('#booking-dialog');goSection(b.dataset.section);}
  if(b.dataset.reserve){e.preventDefault();openBooking(b.dataset.reserve,b);}
  if(b.dataset.tourReserve){e.preventDefault();openBooking(b.dataset.tourReserve,b);}
  if(b.dataset.tourRoom){e.preventDefault();selectTourRoom(b.dataset.tourRoom);}
  if(b.dataset.roomTour){e.preventDefault();selectTourRoom(b.dataset.roomTour);goShot(3);}
  if(b.dataset.shot!==undefined){e.preventDefault();goShot(Number(b.dataset.shot));}
  if(b.dataset.status){state.status=b.dataset.status;$$('[data-status]').forEach(t=>t.classList.toggle('active',t===b));renderManagement();}
  if(b.dataset.actionId)askAction(b.dataset.actionId,b.dataset.actionStatus);
  if(b.dataset.confirmation){const booking=[...state.bookings,...state.managed].find(x=>x.id===b.dataset.confirmation);if(booking)showConfirmation(booking);}
  if(b.dataset.retry==='bookings')loadBookings();if(b.dataset.retry==='management')loadManagement();
  if(b.id==='download-confirmation')downloadConfirmation();
});
async function start(){
  try{const data=await api('/api/rooms');for(const r of data.rooms)rooms[r.id]={...rooms[r.id],...r};initialDates(data.today);}catch{}
  try{const session=await api('/api/session');state.isManager=session.isManager;state.email=session.email||'';$('#manager-nav').hidden=!session.isManager;}catch{}
  updateTourRoom();const initial=location.hash.slice(1);if(initial==='bookings'||initial==='management')setView(initial);else if(initial==='rooms'||initial==='tour')goSection(initial);
  $('#motion-button').setAttribute('aria-pressed',String(motion));if(!motion)$('#motion-button').innerHTML='▷ <span>Motion off</span>';
  try{const {createHotel}=await import('./hotel-scene.js');hotel=await createHotel($('#hotel-canvas'),motion);hotel.setRoomType(state.tourRoom);$('.tour-sticky').classList.add('ready');if(state.view!=='guest')hotel.pause();updateTour();}catch(e){console.warn('Hotel 3D unavailable:',e);$('#motion-button').hidden=true;$('#door-button').textContent='Explore rooms & suites ↗';}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)hotel?.pause();else if(state.view==='guest')hotel?.resume();});
start();
