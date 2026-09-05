/* AE Concierge — Brian (business) and Roz (people) as a right-side panel on every page.
 * Accelerated Experiences LLC · v1 (Sep 5 2026)
 * Drop in:  <script src="/ae-concierge.js" data-persona="brian"></script>
 * Text answers come from /api/brian (persona-aware). Voice: the fixed introduction plays
 * in the real house voice from /voice/<persona>-intro.mp3. Live replies speak only when
 * /api/voice is pointed at the house machine (AE_VOICE_URL) — never a cloud vendor.
 */
(function(){
  if (window.__AEConcierge) return; window.__AEConcierge = true;
  var me = document.currentScript || {};
  var PERSONA = (me.dataset && me.dataset.persona === 'roz') ? 'roz' : 'brian';
  var PEOPLE = {
    brian: { name:'Brian Shirley', first:'Brian', title:'COO / Trainer / Coach', letter:'B', img:'/brian-shirley.jpg', tag:'The guy you talk to',
      intro:"Hey — I'm Brian Shirley, Chief Operating Officer here at Accelerated Experiences, and I'm the guy you talk to. I know every operating system we make, every app in the store, every price, and exactly what we can and can't do. Tell me what you're trying to run and I'll point you at the right one and get you in the door. No demo, no sales call. It's all live.",
      chips:[["Which OS fits my business?","What operating system fits my business? Ask me what I do."],["What does it cost?","How does pricing work on the business operating systems?"],["No app store?","How do I put one of these on my phone without the App Store?"],["Talk to Anthony","I'd like to talk to Anthony about a project."]] },
    roz:   { name:'Rosalyn P. Feely', first:'Roz', title:'Director of Operations / Teacher & Trainer', letter:'R', img:'/roz-feely.jpg', tag:'The apps for people',
      intro:"Hi — I'm Roz Feely, Director of Operations at Accelerated Experiences. I look after the apps for people: the family ones, the kids' ones, the journals and the games. Most are free, none have ads, and you don't need an account to start. Tell me what you're trying to do and I'll find the one that fits.",
      chips:[["Something for my kids","What do you have for kids?"],["Free apps","Which apps are free right now?"],["Put it on my phone","How do I add one of these to my home screen?"],["Talk to Anthony","I'd like to talk to Anthony."]] }
  };
  var P = PEOPLE[PERSONA];

  var css = ''+
  ':root{--aec-bg:#101214;--aec-bg2:#16191c;--aec-ink:#f5f6f7;--aec-ink2:#a3abb3;--aec-line:rgba(255,255,255,.10);--aec-acc:#3d8bff;--aec-acc2:#6aa6ff;--aec-gold:#e0a83a;--aec-w:420px}'+
  '.aec-tab{position:fixed;right:0;top:50%;transform:translateY(-50%) rotate(-90deg);transform-origin:right bottom;z-index:9998;background:var(--aec-bg2);color:var(--aec-ink);border:1px solid var(--aec-line);border-bottom:0;border-radius:12px 12px 0 0;padding:10px 18px 12px;font:600 13px/1 Outfit,system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 -6px 24px rgba(0,0,0,.35)}'+
  '.aec-tab .d{width:9px;height:9px;border-radius:50%;background:var(--aec-acc);box-shadow:0 0 0 0 rgba(61,139,255,.6);animation:aecPulse 2s infinite}'+
  '@keyframes aecPulse{0%{box-shadow:0 0 0 0 rgba(61,139,255,.55)}70%{box-shadow:0 0 0 10px rgba(61,139,255,0)}100%{box-shadow:0 0 0 0 rgba(61,139,255,0)}}'+
  '.aec-fab{position:fixed;right:18px;bottom:18px;z-index:9998;width:58px;height:58px;border-radius:50%;border:1px solid var(--aec-line);background:var(--aec-bg2);cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,.45)}'+
  '.aec-av{width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F0CE82,#DCA43E);color:#2a1810;font:600 italic 20px Fraunces,Georgia,serif;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}'+
  '.aec-av.roz{background:radial-gradient(circle at 35% 30%,#ffb6c9,#e0557e);color:#2a0f18}'+
  '.aec-av img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}'+
  '.aec-head .aec-av{box-shadow:0 0 0 2px var(--aec-acc),0 0 24px rgba(61,139,255,.35)}'+
  '.aec-panel{position:fixed;top:0;right:0;bottom:0;width:var(--aec-w);max-width:100vw;z-index:9999;background:var(--aec-bg);color:var(--aec-ink);border-left:1px solid var(--aec-line);box-shadow:-24px 0 60px rgba(0,0,0,.45);display:flex;flex-direction:column;font-family:Outfit,system-ui,sans-serif;transform:translateX(102%);transition:transform .32s cubic-bezier(.22,1,.36,1)}'+
  '.aec-panel.open{transform:none}'+
  '.aec-head{display:flex;align-items:center;gap:12px;padding:18px 18px 14px;border-bottom:1px solid var(--aec-line);background:linear-gradient(180deg,rgba(61,139,255,.10),transparent)}'+
  '.aec-head .aec-av{width:50px;height:50px;font-size:23px}'+
  '.aec-head b{display:block;font-size:16px;font-weight:700;letter-spacing:-.01em}.aec-head span{display:block;font-size:12px;color:var(--aec-ink2);margin-top:2px}'+
  '.aec-head .x{margin-left:auto;background:none;border:1px solid var(--aec-line);color:var(--aec-ink);width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1}'+
  '.aec-live{display:inline-flex;align-items:center;gap:6px;font:600 10px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--aec-acc2);margin-top:4px}.aec-live i{width:6px;height:6px;border-radius:50%;background:var(--aec-acc);display:inline-block}'+
  '.aec-body{flex:1;overflow-y:auto;padding:16px 16px 8px;display:flex;flex-direction:column;gap:10px}'+
  '.aec-msg{max-width:88%;font-size:14px;line-height:1.55;padding:11px 13px;border-radius:14px;white-space:pre-wrap}'+
  '.aec-msg.bot{align-self:flex-start;background:var(--aec-bg2);border:1px solid var(--aec-line);border-bottom-left-radius:4px}'+
  '.aec-msg.user{align-self:flex-end;background:var(--aec-acc);color:#fff;border-bottom-right-radius:4px}'+
  '.aec-typing{align-self:flex-start;font:500 12px "JetBrains Mono",monospace;color:var(--aec-ink2);padding:0 4px}'+
  '.aec-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}'+
  '.aec-chip{font:600 12px Outfit,sans-serif;padding:8px 12px;border-radius:999px;background:transparent;border:1px solid var(--aec-line);color:var(--aec-ink);cursor:pointer}.aec-chip:hover{border-color:var(--aec-acc);color:var(--aec-acc2)}'+
  '.aec-row{display:flex;gap:8px;padding:12px 14px 14px;border-top:1px solid var(--aec-line);background:var(--aec-bg2)}'+
  '.aec-row input{flex:1;border:1px solid var(--aec-line);border-radius:999px;padding:11px 15px;font:400 14px Outfit,sans-serif;background:var(--aec-bg);color:var(--aec-ink)}.aec-row input:focus{outline:none;border-color:var(--aec-acc)}'+
  '.aec-row button{background:var(--aec-acc);color:#fff;border:none;border-radius:999px;padding:11px 16px;font:700 13px Outfit,sans-serif;cursor:pointer}.aec-row button:disabled{opacity:.5}'+
  '.aec-snd{margin-left:6px;background:none;border:1px solid var(--aec-line);color:var(--aec-ink2);width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:15px}.aec-snd.on{color:var(--aec-acc2);border-color:var(--aec-acc)}'+
  '.aec-foot{font:500 10.5px/1.4 "JetBrains Mono",monospace;letter-spacing:.06em;color:var(--aec-ink2);padding:0 16px 10px;text-align:center}'+
  '@media(max-width:720px){.aec-panel{width:100vw}.aec-tab{display:none}.aec-fab{display:flex}}';

  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  var tab=document.createElement('button'); tab.className='aec-tab'; tab.innerHTML='<span class="d"></span>Talk to '+P.first;
  function avHTML(){ return '<span class="aec-av '+PERSONA+'">'+(P.img?'<img src="'+P.img+'" alt="">':P.letter)+'</span>'; }
  var fab=document.createElement('button'); fab.className='aec-fab'; fab.innerHTML=avHTML();
  var panel=document.createElement('aside'); panel.className='aec-panel'; panel.setAttribute('aria-label',P.name+' — '+P.title);
  panel.innerHTML=
   '<div class="aec-head">'+avHTML()+'<div><b>'+P.name+'</b><span class="aec-title">'+P.title+'</span><span class="aec-live"><i></i>live · knows it all</span></div>'+
   '<button class="aec-snd on" title="Voice on/off">🔊</button><button class="x" aria-label="Close">×</button></div>'+
   '<div class="aec-body"></div><div class="aec-chips"></div>'+
   '<div class="aec-row"><input type="text" placeholder="Ask '+P.name+' anything…" maxlength="500"><button>Send</button></div>'+
   '<div class="aec-foot">everything here is live · no demo · anthonye@aexperiences.studio</div>';
  document.body.appendChild(tab); document.body.appendChild(fab); document.body.appendChild(panel);

  var body=panel.querySelector('.aec-body'), chips=panel.querySelector('.aec-chips'), input=panel.querySelector('input'),
      send=panel.querySelector('.aec-row button'), snd=panel.querySelector('.aec-snd'), xbtn=panel.querySelector('.x');
  var history=[], opened=false, voiceOn=true, cur=null, introduced={};

  function renderPersona(){
    var head=panel.querySelector('.aec-head');
    head.querySelector('.aec-av').outerHTML=avHTML();
    head.querySelector('b').textContent=P.name; head.querySelector('.aec-title').textContent=P.title;
    tab.innerHTML='<span class="d"></span>Talk to '+P.first; fab.innerHTML=avHTML();
    input.placeholder='Ask '+P.first+' anything…';
    chips.innerHTML=''; P.chips.forEach(function(c){ var b=document.createElement('button'); b.className='aec-chip'; b.textContent=c[0]; b.onclick=function(){ ask(c[1]); }; chips.appendChild(b); });
  }
  renderPersona();

  function add(text, who){ var d=document.createElement('div'); d.className='aec-msg '+who; d.textContent=text; body.appendChild(d); body.scrollTop=body.scrollHeight; return d; }
  function stopAudio(){ if(cur){ try{cur.pause();}catch(e){} cur=null; } }
  function playUrl(u){ if(!voiceOn) return; stopAudio(); var a=new Audio(u); cur=a; a.play().catch(function(){}); }
  function speak(text){
    if(!voiceOn) return;
    fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text, voice:PERSONA})})
      .then(function(r){ if(!r.ok || (r.headers.get('content-type')||'').indexOf('audio')<0) throw 0; return r.blob(); })
      .then(function(b){ if(b.size>2000) playUrl(URL.createObjectURL(b)); }).catch(function(){});
  }
  function introduce(){ if(introduced[PERSONA]) return; introduced[PERSONA]=true; add(P.intro,'bot'); playUrl('/voice/'+PERSONA+'-intro.mp3'); }
  function open(){
    panel.classList.add('open'); tab.style.display='none'; fab.style.display='none';
    opened=true; introduce();
    setTimeout(function(){ input.focus(); }, 350);
  }
  function setPersona(who){
    who = (who==='roz')?'roz':'brian'; if(who===PERSONA) return;
    stopAudio(); PERSONA=who; P=PEOPLE[who]; history=[]; renderPersona();
    if(panel.classList.contains('open')){ introduce(); }
  }
  function close(){ panel.classList.remove('open'); tab.style.display=''; fab.style.display=''; stopAudio(); }
  tab.onclick=open; fab.onclick=open; xbtn.onclick=close;
  snd.onclick=function(){ voiceOn=!voiceOn; snd.classList.toggle('on',voiceOn); snd.textContent=voiceOn?'🔊':'🔇'; if(!voiceOn) stopAudio(); };
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });

  function ask(q){
    q=(q||input.value||'').trim(); if(!q) return;
    add(q,'user'); history.push({role:'user',content:q}); input.value=''; send.disabled=true;
    var t=document.createElement('div'); t.className='aec-typing'; t.textContent=P.first+' is typing…'; body.appendChild(t); body.scrollTop=body.scrollHeight;
    fetch('/api/brian',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,history:history,persona:PERSONA})})
      .then(function(r){return r.json();})
      .then(function(j){ t.remove(); var reply=(j&&j.reply)||"I didn't catch that — say it once more?"; add(reply,'bot'); history.push({role:'assistant',content:reply}); speak(reply); })
      .catch(function(){ t.remove(); add("I'm having trouble reaching the office. Email anthonye@aexperiences.studio and Anthony will get right back to you.",'bot'); })
      .then(function(){ send.disabled=false; input.focus(); });
  }
  send.onclick=function(){ask();}; input.addEventListener('keydown',function(e){ if(e.key==='Enter') ask(); });
  // The store: Roz takes the Personal aisle, Brian takes Business and Everything.
  document.addEventListener('click', function(e){
    var b=e.target.closest('.seg button, [data-aisle]'); if(!b) return;
    var t=(b.dataset.aisle||b.textContent||'').trim().toLowerCase();
    setTimeout(function(){ setPersona(t==='personal'?'roz':'brian'); }, 0);
  }, true);
  window.AEConcierge={open:open,close:close,ask:ask,setPersona:setPersona,get persona(){return PERSONA;}};
})();
