/* ND OS — the Owner's Manual, written into the system. Accelerated Experiences LLC · Sep 19 2026
   Anthony: "her system should have a manual written into it. so should mine."
   Self-injecting, loaded by nd-os.js on every room. A "?" button opens a searchable manual of the
   whole office plus an Ask tab that answers from the same articles. Same architecture as the AE OS
   manual (hub-manual.js). It talks to no server. Every article states only what the office really does;
   when a room changes, change its article here in the same commit. */
(function(){
if(window.__ndManual) return; window.__ndManual=true;
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
var CATS=[
{k:'start',label:'Start here',ic:'◉'},
{k:'rooms',label:'Your rooms',ic:'▦'},
{k:'post',label:'Posting',ic:'✎'},
{k:'money',label:'Jobs and money',ic:'$'},
{k:'people',label:'People and email',ic:'☺'},
{k:'quality',label:'Your Quality Department',ic:'✓'},
{k:'coming',label:'Coming next',ic:'→'},
{k:'help',label:'If something is off',ic:'!'}
];
var DOC=[
{c:'start',t:'What ND OS is',g:'what is office os overview purpose start',b:'ND OS is your office. Everything The Neuro-Divulge does lives here: your writing, your posts, your jobs, your books, your files, your people and your records. It runs on your phone and on a computer, and it is yours.'},
{c:'start',t:'Getting in',g:'sign in login password gear open enter get into getting',b:'Go to neurodivulge.com and tap the gear at the top. Tap Sign in with AE OS. It is the same sign-in as AE OS: signed in there, you are signed in here. On the phone app you can type your AE OS email and password instead. Too many wrong tries and it asks you to wait fifteen minutes.'},
{c:'start',t:'Put it on your home screen',g:'home screen install app icon iphone android share add',b:'On an iPhone, open your office in Safari, tap the Share button (the square with the arrow pointing up), then Add to Home Screen. On Android, open the menu and tap Add to Home screen. After that it opens like any other app.'},
{c:'start',t:'Getting around: the dock and More',g:'dock more menu navigation rooms sheet bottom bar move',b:'The bar at the bottom is the dock. It holds three rooms and a More button. Tap More to see every room with its icon. The raised button in the middle belongs to the room you are in: it adds a job in Jobs, adds a person in People, and so on.'},
{c:'start',t:'Light or dark',g:'dark light theme lamp night mode color',b:'Tap More, then the little sun or moon at the top of the sheet. The office opens dark, for working at night, and it remembers whichever you pick.'},
{c:'start',t:'Signing out',g:'sign out log out leave',b:'Tap More. At the bottom of the sheet it says who is signed in, with Sign out next to it.'},
{c:'rooms',t:'Desk',g:'desk home dashboard visitors sold traffic',b:'Your front page. Who came, from where, and what sold.'},
{c:'rooms',t:'Write',g:'write note blog post publish draft',b:'Write a note and publish it. To show a picture or a video in a note, upload it in Files first, copy its link, and paste the link into the note.'},
{c:'rooms',t:'Notes',g:'notes blog posts published read public',b:'Your posts, exactly as everyone sees them.'},
{c:'rooms',t:'Blastpack',g:'blast blastpack media network queue post social send',b:'Your Media Network. Queue a post, with pictures or video, and Blastpack sends it. See the Posting section for the best days and hours.'},
{c:'rooms',t:'List',g:'list todo tasks one list',b:'One list, not four places.'},
{c:'rooms',t:'Calendar',g:'calendar month dates schedule time jobs',b:'Everything with a time, in one month. Give a job a day and it shows up here by itself.'},
{c:'rooms',t:'Docs',g:'docs document write word save',b:'Write a real document. It saves itself.'},
{c:'rooms',t:'Records (your Hall of Records)',g:'records hall folders decisions file attach history ledger',b:'What was decided, what it cost, what went out and when, in folders, with the files. Pick a kind (Decision, Money, Sent, Received, Client, Idea, Note or File), write one thing plainly, pick a folder, and tap Enter it in the record. You can attach a file up to about four megabytes; bigger files go in Files and you paste the link. Entries with a hollow ring are yours. The rest the office wrote by itself as things happened, and those cannot be edited. That is what makes it a record.'},
{c:'rooms',t:'Files',g:'files upload photo video pdf link storage',b:'Photos, videos, PDFs, anything. Upload it once, then tap Copy link and use that link in a note or anywhere else. A link to a file works anywhere.'},
{c:'rooms',t:'Clock',g:'clock time clock hours punch',b:'Your door to the AE OS time clock. It is greyed out until that door is opened for you.'},
{c:'post',t:'When to post',g:'when post best time day hour instagram tiktok facebook youtube pinterest schedule chart',b:'Instagram: Monday to Thursday, eleven to one and seven to nine at night. TikTok: Tuesday to Friday, six to nine in the morning and seven to eleven at night. Facebook: Monday to Thursday, nine to noon and seven to nine at night. YouTube: Thursday to Saturday, two to four and six to nine. Pinterest: Friday to Sunday, eight to eleven at night. These are the same windows Blastpack uses.'},
{c:'post',t:'Posting a picture or a video',g:'picture video photo post upload media reel',b:'Upload it in Files, copy its link, and use it in Write or in a Blastpack post. Upload once, link anywhere.'},
{c:'money',t:'Jobs: your production board',g:'jobs board production add job lanes next doing done',b:'Everything you are making, in three lanes: Up next, Working on, and Done. Add a job, tick every kind of work it includes (one job can be TikTok, Instagram and Email together), and give it a day so it lands on your calendar.'},
{c:'money',t:'Pricing a job',g:'price estimate margin cost time gpm quote sixty-seven',b:'Every job is an estimate. Enter your costs and your time. The price is costs plus time, divided by one minus your margin. The margin starts at sixty-seven percent and you can change it. If you type a price yourself, your price wins and the margin is read off it. Pass-through costs are added at cost. An internal job is only a cost tally, with no markup.'},
{c:'money',t:'Books',g:'books accounting estimates expenses spent money',b:'Your estimates and what you spent. What you spend on a job is entered once and shows in both places: the job shows its total and Books shows the line. No double entry.'},
{c:'people',t:'People: your email list',g:'people email list contacts subscribers database csv download',b:'Everyone who gave you their email, in one place. It fills itself from your site. You can add someone by hand, add tags and notes, search, and tap Download for a file any mailer can read.'},
{c:'people',t:'Who can get a newsletter',g:'consent newsletter yes permission email blast',b:'Only someone marked Said yes to email can ever get a newsletter from here. People who asked for the free checklist were promised one email and no list, so they come in as not yet.'},
{c:'quality',t:'What your Quality Department is',g:'quality department agent clinic affirm head referee two schools',b:'Your own agent department. Two readers from two schools that differ on purpose read your draft separately: Clinic (clinical and behavioral: evidence, structure, skills in steps) and Affirm (neurodiversity-affirming: difference not deficit, the child\'s voice, sensory needs first). A referee only lets a ruling through when both have answered and both are confident. Then the Head, the one voice you hear, tells you where they agree, who is right for this case, and what to change. The names are working names; you and Anthony get to name them.'},
{c:'quality',t:'How to use it',g:'quality use draft paste question send ruling',b:'Paste a draft post, or ask a question, and tap Send it in. The two reads land first, then the ruling. You can forget a ruling afterwards.'},
{c:'quality',t:'What it will not do',g:'quality limits crisis medical diagnose names privacy refuse',b:'If a draft touches self-harm, abuse, a crisis, medication doses, restraint or a medical decision, it holds the ruling and tells you which kind of professional that belongs to. It never diagnoses anyone. Leave names, emails and phone numbers out. It refuses them.'},
{c:'rooms',t:'Inbox — your line to the house',g:'inbox outbox message request production work room approve changes anthony ask',b:'A private line between your office and Anthony\'s. It sits right under Desk. It is not email, and nothing in it leaves the system. Write a message, or tap New production request when you need something made. Everything you send shows when he opened it.'},
{c:'rooms',t:'Taking a message back',g:'unsend take back undo delete remove mistake wrong sent',b:'If you send something and change your mind, open it and tap Unsend, then tap again to be sure. It only works while the other person has not opened it yet — the card tells you which. Once it is opened it stays, and nothing else in this room is ever deleted. Taking back a production request takes the notes you added under it too.'},
{c:'rooms',t:'Alerts on your phone',g:'alerts notification push phone buzz turn on',b:'In the Inbox, tap Turn on alerts once on your phone and say yes when it asks. After that your phone tells you when something lands here, even with nothing open. Tap the notification and it opens the right room. It only works on a phone where you said yes; do it once on each phone you use. If you ever said no, the phone will not ask again until you turn notifications back on for the site in its settings.'},
{c:'rooms',t:'Work rooms — asking for something and getting it',g:'work room request changes approve review proof files done',b:'Every production request opens a work room you both see: the conversation, the work to look at, and where it stands. When it is ready for you it says Ready for review. Type what you want different and tap Ask for changes — only you have that button. When it is right, tap Approve. Every file in the room lands in your Files the moment you do. A file added to a room tops out near four megabytes; anything bigger goes in Files and its link goes in the room.'},
{c:'rooms',t:'Helper: just ask',g:'helper assistant agent ask question talk voice microphone speak help writing hear do it web search internet constitution triad',b:'Your own helper lives in the Helper room. Ask it anything, or ask it to do something: add to your list or check something off, put it on your calendar, start a doc, file a record, add a job, log an expense, queue a post for Blastpack, save a draft post, or send Anthony a note or a request. It can search the web and read pages, and it tells you which ones. Before anything it reads your constitution, the Constitution folder in your Hall of Records. Every action runs on the AETRIAD: the helper proposes it, the Guard argues against it, and the Pacemaker only shows you what cleared. A held one says why. Nothing happens until you tap Do it. It never publishes a post; it saves a draft and you publish it in Write. Type or tap the microphone. Hear it has Roz read the answer. The conversation stays on your device.'},
{c:'coming',t:'Email from your own address',g:'email domain neurodivulge.com sender blast newsletter',b:'The plan is email sent from a neurodivulge.com address, with newsletters going only to people who said yes. It needs mail records set up for the domain first. Not live yet.'},
{c:'help',t:'Something looks wrong',g:'broken error wrong bug problem help support',b:'Tell Anthony the exact words on the screen, and which room. That is all it takes to fix it fast. Nothing you tap in your office can break the company.'},
{c:'help',t:'It asked me to sign in again',g:'signed out sign in again expired locked',b:'Sign-ins expire on purpose. Tap Sign in with AE OS and you are back. Nothing you wrote is lost.'},
{c:'help',t:'A big file will not upload',g:'upload failed too big video file stuck',b:'In Records the limit is about four megabytes; put bigger files in Files. If a file will not go up in Files either, tell Anthony the exact words on the screen and the size of the file.'},
{c:'help',t:'No connection',g:'offline no connection internet lost',b:'If it says No connection, nothing was lost. Your writing is still on the screen. Try again when you are back online.'}
];
var GREETING='I am the manual for your office. Ask me how anything works, or tap one:'+
'<div class="nm-sugg">'+
'<button onclick="nmAskQuick(\'How do I price a job?\')">How do I price a job?</button>'+
'<button onclick="nmAskQuick(\'When should I post?\')">When should I post?</button>'+
'<button onclick="nmAskQuick(\'How do I post a video?\')">How do I post a video?</button>'+
'<button onclick="nmAskQuick(\'What is the Quality Department?\')">What is Quality?</button>'+
'</div>';
var MAN={mode:'guide',q:'',cat:'',chat:[]};
function catOf(k){for(var i=0;i<CATS.length;i++)if(CATS[i].k===k)return CATS[i];return {ic:'•',label:k};}
var css=document.createElement('style'); css.textContent=
'#nm-btn{position:fixed;right:16px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:9990;width:46px;height:46px;border-radius:50%;border:1px solid rgba(0,0,0,.12);cursor:pointer;background:#b5643c;color:#fff;font:700 22px/1 Lora,Georgia,serif;box-shadow:0 8px 22px -8px rgba(60,30,10,.7)}'+
'.nm{position:fixed;inset:0;z-index:99999;display:none;font-family:Karla,-apple-system,"Segoe UI",Roboto,sans-serif}.nm.on{display:block}'+
'.nm-scrim{position:absolute;inset:0;background:rgba(30,26,23,.55)}'+
'.nm-panel{position:absolute;top:0;right:0;height:100%;width:min(470px,100%);background:#F3EEE5;color:#3a322c;display:flex;flex-direction:column;box-shadow:-24px 0 70px rgba(0,0,0,.45)}'+
'.nm-top{display:flex;align-items:center;gap:12px;padding:18px 18px;background:#2a2420;color:#F3EEE5}'+
'.nm-top img{width:40px;height:40px;border-radius:10px}.nm-top b{font:700 19px/1.1 Lora,Georgia,serif;display:block}.nm-top small{opacity:.7;font-size:12px}'+
'.nm-x{margin-left:auto;background:rgba(255,255,255,.12);border:0;color:#F3EEE5;font-size:22px;cursor:pointer;width:38px;height:38px;border-radius:10px}'+
'.nm-tabs{display:flex;gap:6px;padding:10px 16px 0;background:#2a2420}'+
'.nm-tabs button{flex:1;padding:11px;border:0;border-radius:12px 12px 0 0;background:rgba(255,255,255,.07);color:#d8cbb8;font:inherit;font-weight:700;font-size:14px;cursor:pointer}.nm-tabs button.on{background:#F3EEE5;color:#2a2420}'+
'.nm-body{flex:1;overflow:auto;padding:16px;-webkit-overflow-scrolling:touch}'+
'.nm-body input{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:12px;border:1px solid #e2d8c6;background:#fffdf7;color:#3a322c;font:inherit;font-size:16px}'+
'.nm-chips{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}'+
'.nm-chip{padding:8px 12px;border-radius:99px;border:1px solid #e2d8c6;background:#fffdf7;color:#5a4f45;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.nm-chip.on{background:#b5643c;color:#fff;border-color:#b5643c}'+
'.nm-art{background:#fffdf7;border:1px solid #e2d8c6;border-radius:14px;margin-bottom:9px;overflow:hidden}.nm-art[open]{border-color:#b5643c}'+
'.nm-art summary{list-style:none;cursor:pointer;padding:14px 15px;display:flex;align-items:center;gap:12px;min-height:48px}.nm-art summary::-webkit-details-marker{display:none}'+
'.nm-ic{width:34px;height:34px;flex:0 0 auto;border-radius:10px;background:#ead9b8;color:#4a3a22;display:flex;align-items:center;justify-content:center;font-weight:800}'+
'.nm-cat{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:#b5643c;font-weight:800;display:block}.nm-t{font-weight:700;font-size:15.5px;line-height:1.25}'+
'.nm-b{padding:0 16px 16px 61px;color:#5a4f45;font-size:15px;line-height:1.6}'+
'.nm-empty{color:#6f655b;text-align:center;padding:34px 16px}'+
'.nm-foot{padding:12px 16px;border-top:1px solid #e2d8c6;color:#6f655b;font-size:12px}'+
'.nm-ask{display:flex;flex-direction:column;height:100%}.nm-chat{flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-bottom:12px}'+
'.nmc{max-width:92%;padding:12px 15px;border-radius:16px;font-size:15px;line-height:1.55}.nmc.u{align-self:flex-end;background:#b5643c;color:#fff}.nmc.b{align-self:flex-start;background:#fffdf7;border:1px solid #e2d8c6}.nmc.b p{margin:5px 0 0}'+
'.nm-sugg{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.nm-sugg button,.nm-rel{background:#ead9b8;border:0;border-radius:99px;padding:8px 13px;font:inherit;font-size:13px;color:#4a3a22;cursor:pointer;font-weight:700}'+
'.nm-row{display:flex;gap:8px;padding-top:10px;border-top:1px solid #e2d8c6}.nm-row button{background:#b5643c;color:#fff;border:0;border-radius:12px;padding:0 18px;font:inherit;font-weight:700;cursor:pointer}';
document.head.appendChild(css);
var btn=document.createElement('button'); btn.id='nm-btn'; btn.type='button'; btn.title='The manual — how your office works'; btn.setAttribute('aria-label','Open the manual'); btn.textContent='?';
var wrap=document.createElement('div'); wrap.className='nm'; wrap.id='nm';
wrap.innerHTML='<div class="nm-scrim" onclick="nmClose()"></div><aside class="nm-panel" role="dialog" aria-label="ND OS manual">'+
'<header class="nm-top"><img src="/logo-nd.png" alt=""><div><b>Your office, explained</b><small>The ND OS manual · every room</small></div><button class="nm-x" onclick="nmClose()" aria-label="Close">&times;</button></header>'+
'<div class="nm-tabs"><button id="nmGuide" class="on" onclick="nmMode(\'guide\')">The manual</button><button id="nmAskT" onclick="nmMode(\'ask\')">Ask</button></div>'+
'<div class="nm-body" id="nmBody"></div>'+
'<footer class="nm-foot">ND OS Owner\'s Manual · built by Accelerated Experiences, LLC</footer></aside>';
function ready(){ document.body.appendChild(btn); document.body.appendChild(wrap); btn.onclick=function(){ window.nmOpen(); }; }
if(document.body) ready(); else document.addEventListener('DOMContentLoaded',ready);
window.nmOpen=function(){ document.getElementById('nm').classList.add('on'); document.body.style.overflow='hidden'; nmMode(MAN.mode); };
window.nmClose=function(){ document.getElementById('nm').classList.remove('on'); document.body.style.overflow=''; };
window.nmMode=function(m){ MAN.mode=m; document.getElementById('nmGuide').classList.toggle('on',m==='guide'); document.getElementById('nmAskT').classList.toggle('on',m==='ask'); if(m==='guide')guide(); else ask(); };
function guide(){ var b=document.getElementById('nmBody');
  b.innerHTML='<input id="nmQ" type="search" placeholder="Search the manual" value="'+esc(MAN.q)+'" oninput="nmSearch(this.value)">'+
  '<div class="nm-chips">'+[['','All']].concat(CATS.map(function(c){return [c.k,c.label];})).map(function(a){return '<button class="nm-chip'+(MAN.cat===a[0]?' on':'')+'" onclick="nmCat(\''+a[0]+'\')">'+a[1]+'</button>';}).join('')+'</div><div id="nmList"></div>'; list(); }
window.nmSearch=function(v){ MAN.q=v; list(); };
window.nmCat=function(k){ MAN.cat=k; guide(); };
function list(){ var arr=DOC.slice(); if(MAN.cat)arr=arr.filter(function(a){return a.c===MAN.cat;});
  var q=(MAN.q||'').trim(); if(q){ var sc=score(q),rk={}; sc.forEach(function(r){rk[DOC.indexOf(r.a)]=r.s;}); arr=arr.filter(function(a){return rk[DOC.indexOf(a)]>0;}).sort(function(x,y){return rk[DOC.indexOf(y)]-rk[DOC.indexOf(x)];}); }
  var L=document.getElementById('nmList'); if(!L)return;
  L.innerHTML=arr.length?arr.map(function(a){var c=catOf(a.c);return '<details class="nm-art"><summary><span class="nm-ic">'+c.ic+'</span><span><span class="nm-cat">'+c.label+'</span><span class="nm-t">'+esc(a.t)+'</span></span></summary><div class="nm-b">'+esc(a.b)+'</div></details>';}).join(''):'<div class="nm-empty">Nothing matches. Try the Ask tab, or tell Anthony what you were looking for.</div>'; }
function score(q){
  var stop={the:1,a:1,an:1,to:1,how:1,'do':1,i:1,can:1,is:1,of:1,and:1,'for':1,my:1,'in':1,on:1,it:1,'this':1,that:1,'with':1,you:1,your:1,me:1,use:1,what:1,where:1,why:1,are:1,be:1,or:1,'if':1,from:1,at:1,does:1,should:1};
  var syn={post:['posting','blast','blastpack','publish','social'],price:['pricing','estimate','quote','margin','cost'],email:['newsletter','people','list','subscribers'],file:['files','upload','video','photo','picture','pdf'],record:['records','hall','folder'],sign:['login','password','signin'],quality:['clinic','affirm','head','department','agent'],job:['jobs','board','production']};
  var toks=q.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(function(w){return w&&!stop[w];});
  var exp={}; toks.forEach(function(t){exp[t]=1; for(var k in syn){ if(k===t||syn[k].indexOf(t)>-1){exp[k]=1; syn[k].forEach(function(x){exp[x]=1;});} }});
  var words=Object.keys(exp);
  return DOC.map(function(a){var T=a.t.toLowerCase(),G=(a.g||'').toLowerCase(),B=a.b.toLowerCase(),s=0; words.forEach(function(w){ if(T.indexOf(w)>-1)s+=4; else if(G.indexOf(w)>-1)s+=2; else if(B.indexOf(w)>-1)s+=1; }); if(toks.length&&toks.every(function(w){return T.indexOf(w)>-1;}))s+=10; return {a:a,s:s};}).sort(function(x,y){return y.s-x.s;});
}
function ask(){ var b=document.getElementById('nmBody');
  b.innerHTML='<div class="nm-ask"><div class="nm-chat" id="nmChat"></div><div class="nm-row"><input id="nmIn" placeholder="Ask how anything works" enterkeyhint="send" onkeydown="if(event.key===\'Enter\')nmAsk()"><button onclick="nmAsk()">Ask</button></div></div>';
  if(!MAN.chat.length)MAN.chat.push({r:'b',html:GREETING}); chat(); }
function chat(){ var box=document.getElementById('nmChat'); if(!box)return; box.innerHTML=MAN.chat.map(function(m){return m.r==='u'?'<div class="nmc u">'+esc(m.t)+'</div>':'<div class="nmc b">'+m.html+'</div>';}).join(''); box.scrollTop=box.scrollHeight; }
window.nmAskQuick=function(q){ nmMode('ask'); nmAsk(q); };
window.nmAsk=function(force){ var inp=document.getElementById('nmIn'); var q=(force||(inp?inp.value:'')||'').trim(); if(!q)return; if(inp)inp.value='';
  MAN.chat.push({r:'u',t:q}); var res=score(q).filter(function(x){return x.s>0;}).slice(0,3);
  if(!res.length) MAN.chat.push({r:'b',html:'That is not in the manual yet. Tell Anthony what you asked, and it gets written in.'});
  else{ var top=res[0].a, html='<b>'+esc(top.t)+'</b><p>'+esc(top.b)+'</p>'; if(res.length>1) html+='<div class="nm-sugg">'+res.slice(1).map(function(r){return '<button class="nm-rel" onclick="nmShow('+DOC.indexOf(r.a)+')">'+esc(r.a.t)+'</button>';}).join('')+'</div>'; MAN.chat.push({r:'b',html:html}); }
  chat(); };
window.nmShow=function(i){ var a=DOC[i]; if(!a)return; MAN.chat.push({r:'b',html:'<b>'+esc(a.t)+'</b><p>'+esc(a.b)+'</p>'}); chat(); };
document.addEventListener('keydown',function(e){ if(e.key==='Escape') nmClose(); });
})();
