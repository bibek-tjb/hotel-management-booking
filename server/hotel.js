export const ROOMS = [
  {id:'deluxe',name:'Deluxe King',subtitle:'Your quiet corner of the world.',price:6500,capacity:2,size:34,bed:'1 king bed',image:'/assets/deluxe.webp',features:['Garden view','Rain shower','Wi-Fi','Coffee station'],numbers:Array.from({length:12},(_,i)=>201+i)},
  {id:'suite',name:'Signature Suite',subtitle:'A little more room to linger.',price:10500,capacity:3,size:62,bed:'1 king bed + daybed',image:'/assets/suite.webp',features:['Private balcony','Separate lounge','Soaking tub','Breakfast option'],numbers:[301,302,303,304]}
];
export const BREAKFAST_PRICE=650;
export const dayNow=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const allowedStates=['confirmed','checked_in','checked_out','cancelled'];
const activeStates=['confirmed','checked_in'];
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function db(env){if(!env.DB)throw fail('Reservations are temporarily unavailable. Your details have not been submitted. Please try again shortly.',503);return env.DB;}
export function validateStay(input, today=dayNow()){
  for(const field of ['checkIn','checkOut']){
    if(typeof input[field]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input[field]))throw fail('Choose valid arrival and departure dates.');
    const date=new Date(input[field]+'T00:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==input[field])throw fail('Choose valid arrival and departure dates.');
  }
  if(input.checkIn<today)throw fail('Your arrival date cannot be in the past.');
  const nights=(Date.parse(input.checkOut)-Date.parse(input.checkIn))/86400000;
  if(nights<1||nights>30)throw fail('Choose a stay between 1 and 30 nights.');
  if(Date.parse(input.checkIn)>Date.parse(today)+365*86400000)throw fail('Reservations open up to one year in advance.');
  const guests=Number(input.guests);
  if(!Number.isInteger(guests)||guests<1||guests>3)throw fail('Choose between 1 and 3 guests per room.');
  return {checkIn:input.checkIn,checkOut:input.checkOut,guests,nights};
}
export function quoteStay(input, today=dayNow()){
  const stay=validateStay(input,today);const room=ROOMS.find(r=>r.id===input.roomType);
  if(!room)throw fail('Choose a room for your stay.');
  if(stay.guests>room.capacity)throw fail(`${room.name} accommodates up to ${room.capacity} guests.`);
  const breakfast=input.breakfast===true;
  const roomTotal=room.price*stay.nights;
  const breakfastTotal=breakfast?BREAKFAST_PRICE*stay.guests*stay.nights:0;
  return {...stay,roomType:room.id,roomName:room.name,nightlyPrice:room.price,breakfast,roomTotal,breakfastTotal,total:roomTotal+breakfastTotal,currency:'INR'};
}
function clean(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
function validateGuest(input){
  const guestName=clean(input.guestName,100),guestEmail=clean(input.guestEmail,160).toLowerCase(),guestPhone=clean(input.guestPhone,30),requests=clean(input.requests,800);
  if(guestName.length<2)throw fail('Enter the lead guest’s full name.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))throw fail('Enter a valid email address.');
  if(!/^[+()\d .-]{7,30}$/.test(guestPhone)||guestPhone.replace(/\D/g,'').length<7)throw fail('Enter a valid phone number.');
  if(input.agree!==true)throw fail('Please accept the booking terms to continue.');
  return {guestName,guestEmail,guestPhone,requests};
}
function userFrom(request,env){
  const platformId=(request.headers.get('oai-authenticated-user-id')||'').trim();
  const email=(request.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase();
  const managerEmail=(env.HOTEL_MANAGER_EMAIL||'').trim().toLowerCase();
  const manager=Boolean(email&&managerEmail)&&email===managerEmail;
  // Production dispatch can forward the verified owner's email without its ID.
  // This compatibility path is limited to the configured manager allowlist;
  // other visitors still require the platform's stable authenticated user ID.
  const ownerKey=manager?'hotel-owner:'+email:'';
  const id=ownerKey||platformId;
  if(!id)throw fail('Please sign in to view or save your reservations.',401);
  return {id,legacyId:platformId||id,email,manager};
}
function publicBooking(row){
  if(!row)return null;const room=ROOMS.find(r=>r.id===row.room_type);
  return {id:row.id,reference:row.reference,roomType:row.room_type,roomName:room?.name||row.room_type,roomNumber:row.room_number,checkIn:row.check_in,checkOut:row.check_out,guests:row.guests,guestName:row.guest_name,guestEmail:row.guest_email,guestPhone:row.guest_phone,requests:row.requests,breakfast:Boolean(row.breakfast),nightlyPrice:row.nightly_price,nights:row.nights,total:row.total,status:row.status,createdAt:row.created_at,payment:'pay_at_hotel',currency:'INR'};
}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function readBody(request){
  if(Number(request.headers.get('content-length')||0)>15000)throw fail('This request is too large.',413);
  const text=await request.text();if(text.length>15000)throw fail('This request is too large.',413);
  let value;try{value=JSON.parse(text);}catch{throw fail('Please send valid reservation details.');}if(!value||typeof value!=='object'||Array.isArray(value))throw fail('Please send valid reservation details.');return value;
}
async function hash(value){const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return [...a].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function availability(env,stay){
  const database=db(env);const rooms=[];
  for(const room of ROOMS){
    const rows=await database.prepare("SELECT DISTINCT room_number FROM hotel_bookings WHERE room_type = ? AND status IN ('confirmed','checked_in') AND check_in < ? AND check_out > ?").bind(room.id,stay.checkOut,stay.checkIn).all();
    const taken=new Set((rows.results||[]).map(r=>r.room_number));
    rooms.push({...room,numbers:undefined,available:room.numbers.filter(n=>!taken.has(n)).length,canBook:stay.guests<=room.capacity&&room.numbers.some(n=>!taken.has(n)),total:room.price*stay.nights});
  }
  return {rooms,stay,currency:'INR',breakfastPrice:BREAKFAST_PRICE};
}
async function createBooking(request,env,user){
  const input=await readBody(request);const quote=quoteStay(input);const guest=validateGuest(input);
  const requestKey=clean(input.requestKey,100);
  if(!/^[a-zA-Z0-9-]{16,100}$/.test(requestKey))throw fail('Please refresh the booking form and try again.');
  const requestHash=await hash(JSON.stringify({quote,guest}));
  const database=db(env);
  const prior=await database.prepare('SELECT * FROM hotel_bookings WHERE user_id IN (?,?) AND request_key = ?').bind(user.id,user.legacyId,requestKey).first();
  if(prior){if(prior.request_hash!==requestHash)throw fail('This request has already been used. Start a new reservation.',409);return json({booking:publicBooking(prior),replayed:true});}
  const room=ROOMS.find(r=>r.id===quote.roomType),now=new Date().toISOString(),id=crypto.randomUUID(),reference='SLN-'+crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
  const sql=`INSERT INTO hotel_bookings (id,reference,user_id,request_key,request_hash,room_type,room_number,check_in,check_out,guests,guest_name,guest_email,guest_phone,requests,breakfast,nightly_price,nights,total,status,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'confirmed',?,?
    WHERE NOT EXISTS (SELECT 1 FROM hotel_bookings WHERE room_type = ? AND room_number = ? AND status IN ('confirmed','checked_in') AND check_in < ? AND check_out > ?)`;
  for(const number of room.numbers){
    try{
      const result=await database.prepare(sql).bind(id,reference,user.id,requestKey,requestHash,room.id,number,quote.checkIn,quote.checkOut,quote.guests,guest.guestName,guest.guestEmail,guest.guestPhone,guest.requests,quote.breakfast?1:0,quote.nightlyPrice,quote.nights,quote.total,now,now,room.id,number,quote.checkOut,quote.checkIn).run();
      if(result.meta?.changes===1){const saved=await database.prepare('SELECT * FROM hotel_bookings WHERE id = ?').bind(id).first();if(!saved)throw fail('We could not load the confirmation. Please check My bookings before trying again.',503);return json({booking:publicBooking(saved)},201);}
    }catch(error){
      if(String(error.message).includes('UNIQUE')){const existing=await database.prepare('SELECT * FROM hotel_bookings WHERE user_id = ? AND request_key = ?').bind(user.id,requestKey).first();if(existing&&existing.request_hash===requestHash)return json({booking:publicBooking(existing),replayed:true});}
      throw error;
    }
  }
  throw fail('That room category just sold out for these dates. Please choose another room or change your dates.',409);
}
async function changeBooking(request,env,user,id){
  const input=await readBody(request),status=input.status;
  if(!allowedStates.includes(status))throw fail('Choose a valid reservation status.');
  const database=db(env),row=await database.prepare('SELECT * FROM hotel_bookings WHERE id = ?').bind(id).first();
  if(!row||(!user.manager&&row.user_id!==user.id))throw fail('Reservation not found.',404);
  if(!user.manager&&status!=='cancelled')throw fail('Only hotel management can change arrival or departure status.',403);
  const transitions={confirmed:['checked_in','cancelled'],checked_in:['checked_out'],checked_out:[],cancelled:[]};
  if(!(transitions[row.status]||[]).includes(status))throw fail('This reservation can no longer be changed in that way.',409);
  if(!user.manager&&row.check_in<=dayNow())throw fail('Online cancellation closes on the arrival date. Please contact hotel management.',409);
  if(status==='checked_in'&&(row.check_in>dayNow()||row.check_out<=dayNow()))throw fail('Check-in is available only during the scheduled stay.',409);
  const result=await database.prepare('UPDATE hotel_bookings SET status = ?, updated_at = ? WHERE id = ? AND status = ?').bind(status,new Date().toISOString(),id,row.status).run();
  if(result.meta?.changes!==1)throw fail('This reservation was updated elsewhere. Please refresh and try again.',409);
  return json({booking:publicBooking(await database.prepare('SELECT * FROM hotel_bookings WHERE id = ?').bind(id).first())});
}
export async function handleApi(request,env){
  const url=new URL(request.url),path=url.pathname;
  try{
    if(!['GET','POST','PATCH'].includes(request.method))return json({error:'Method not allowed.'},405);
    if(request.method!=='GET'){
      const origin=request.headers.get('origin');
      if(origin&&origin!==url.origin)throw fail('This request must come from the hotel website.',403);
      if(!(request.headers.get('content-type')||'').includes('application/json'))throw fail('Use the booking form to submit this request.',415);
    }
    if(path==='/api/rooms'&&request.method==='GET')return json({rooms:ROOMS.map(({numbers,...room})=>room),breakfastPrice:BREAKFAST_PRICE,today:dayNow(),currency:'INR'});
    if(path==='/api/availability'&&request.method==='GET')return json(await availability(env,validateStay(Object.fromEntries(url.searchParams))));
    const user=userFrom(request,env);
    if(path==='/api/session'&&request.method==='GET')return json({email:user.email,isManager:user.manager});
    if(path==='/api/bookings'&&request.method==='POST')return await createBooking(request,env,user);
    if(path==='/api/bookings'&&request.method==='GET'){
      const rows=await db(env).prepare('SELECT * FROM hotel_bookings WHERE user_id IN (?,?) ORDER BY created_at DESC LIMIT 200').bind(user.id,user.legacyId).all();return json({bookings:(rows.results||[]).map(publicBooking)});
    }
    if(path.startsWith('/api/bookings/')&&request.method==='PATCH')return await changeBooking(request,env,user,path.split('/').pop());
    if(path==='/api/management'&&request.method==='GET'){
      if(!user.manager)throw fail('This view is available to hotel management only.',403);
      const database=db(env),today=dayNow();
      const rows=await database.prepare('SELECT * FROM hotel_bookings ORDER BY created_at DESC LIMIT 500').all();
      const summary=await database.prepare("SELECT COUNT(*) AS total_bookings, SUM(CASE WHEN status IN ('confirmed','checked_in') THEN 1 ELSE 0 END) AS active_bookings, SUM(CASE WHEN status = 'confirmed' AND check_in = ? THEN 1 ELSE 0 END) AS arrivals_today, SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in, SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) AS reservation_value FROM hotel_bookings").bind(today).first();
      return json({bookings:(rows.results||[]).map(publicBooking),summary,today,totalRooms:16});
    }
    return json({error:'Page not found.'},404);
  }catch(error){if(!error.status)console.error('Hotel API failed',{path,message:error.message});return json({error:error.status?error.message:'Reservations are temporarily unavailable. Your details are still here. Please try again shortly.'},error.status||503);}
}
