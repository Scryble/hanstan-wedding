/* ============================================================
   HANSTAN VISUAL EDITOR v5 — All bugs fixed, all features built
   Fixes: element positioning, loader position, global color
   consumption, DOM rebuild separation, gradient/shadow state
   parsing, dead code removal, token validation, text double-write
   Added: background slideshow, shape dividers, pull-from-server
   v5: tooltips, floating/draggable panel, panel self-styling (width, font, opacity, accent)
   ============================================================ */
(function () {
'use strict';

var TK='hanstan_admin_write_token',SK='hanstan_ve4',OK='hanstan_ve4_open';
var PID='veRoot',SID='veOverrides',HID='veHL',SLID='veSL';
var SAVE_EP='/.netlify/functions/ve-save';
var _elC=0;
var _checkpoints=[{name:'Original',state:null}];

var S={
  on:false,picking:false,sel:null,selCSS:null,
  ov:{},globals:{colors:{},fonts:{body:'',display:''}},tokens:{},
  text:{},anims:{},responsive:{},attrs:{},
  elements:[],clipboard:null,undos:[],redos:[],
  vp:'desktop',hover:false,editingText:false,
  _tab:'style',_addPosition:'after',_bc:null,_needsElRebuild:false,
  panelMode:'docked',panelW:340,panelFontSize:12,panelOpacity:0.97,panelAccent:'#d8b55b',
  panelX:null,panelY:null,_dragging:false,_dragOff:{x:0,y:0},multiSel:[],multiSelCSS:[],_nearEdge:null,_navFilter:'',_sampling:false,
};

var ELTYPES=[
  {type:'nav',icon:'\uD83E\uDDED',label:'Navigation Strip'},
  {type:'heading',icon:'\uD83D\uDD24',label:'Heading',def:'New Heading'},
  {type:'text',icon:'\uD83D\uDCDD',label:'Text Block',def:'New text block. Double-click to edit.'},
  {type:'image',icon:'\uD83D\uDDBC',label:'Image'},
  {type:'button',icon:'\uD83D\uDD18',label:'Link / Button',def:'Click Here'},
  {type:'divider',icon:'\u2796',label:'Divider'},
  {type:'spacer',icon:'\u2195\uFE0F',label:'Spacer'},
  {type:'section',icon:'\uD83D\uDCE6',label:'Section Container'},
  {type:'list',icon:'\uD83D\uDCCB',label:'List'},
  {type:'html',icon:'\uD83E\uDDE9',label:'Custom HTML',def:'<p>Custom HTML here</p>'},
  {type:'slideshow',icon:'\uD83C\uDF05',label:'BG Slideshow'},
  {type:'shapedivider',icon:'\uD83C\uDF0A',label:'Shape Divider'},
];

if(loc('panel')||sessionStorage.getItem(OK)==='1')go();
// Stage 3 (2026-04-26): expose go() + tog() on window so the planner header CSS-tool
// button (master-only) can invoke them. Triple-tap-bottom-right + Ctrl-Shift-P shortcuts
// continue to work as before.
window.veGo = function(){ go(); };
window.veToggle = function(){ S.on ? tog() : go(); };
document.addEventListener('keydown',function(e){
  if(e.ctrlKey&&e.shiftKey&&e.key==='P'){e.preventDefault();S.on?tog():go();}
  if(S.on&&e.ctrlKey&&e.key==='z'){e.preventDefault();undo();}
  if(S.on&&e.ctrlKey&&e.key==='y'){e.preventDefault();redo();}
  if(S.on&&e.key==='Delete'&&S.sel&&S.sel.getAttribute('data-ve-id')){e.preventDefault();rmEl(S.sel.getAttribute('data-ve-id'));}
});
var _tc=0,_tt;
document.addEventListener('touchend',function(e){var t=e.changedTouches[0];if(!t)return;if(t.clientX>window.innerWidth*0.8&&t.clientY>window.innerHeight*0.85){_tc++;clearTimeout(_tt);_tt=setTimeout(function(){_tc=0;},600);if(_tc>=3){_tc=0;S.on?tog():go();}}else _tc=0;});

function loc(k){return location.search.indexOf(k)!==-1;}
function go(){
  // Stage 2 Phase C (PL-41): single-prompt fix. Token cache hierarchy: sessionStorage (this tab) →
  // localStorage (this browser, persistent across tabs/reloads). Once Hannah/Stan enter the admin
  // token once, no re-prompt until they explicitly clear it. Only stored in localStorage if a
  // matching planner-master gate has already passed (identity.isMaster check via the planner's
  // hanstan_planner_token presence as a soft guard — admin token alone wouldn't have entered planner).
  if(S.on)return;
  var t=sessionStorage.getItem(TK);
  if(!t){
    try{ t=localStorage.getItem(TK); }catch(e){}
    if(t){ sessionStorage.setItem(TK,t); }
  }
  if(!t){
    t=prompt('Admin token:');
    if(!t)return;
    sessionStorage.setItem(TK,t);
    // Persist across tabs only if the planner master gate has already been passed in this browser
    try{ if(localStorage.getItem('hanstan_planner_token')){ localStorage.setItem(TK,t); } }catch(e){}
  }
  S.on=true;sessionStorage.setItem(OK,'1');
  document.body.classList.add('ve-active');
  initCheckpoints();ld();injectCSS();injectPanel();injectOverlay();injectCtx();rebuildEls();applyCSS();loadServerCSS();applyPanelStyle();
  fetch(SAVE_EP,{method:'PATCH',headers:{'Content-Type':'application/json','x-admin-token':t},body:JSON.stringify({action:'list'})}).then(function(r){if(r.status===401)toast('\u26A0 Token may be invalid');});
}
function tog(){
  var e=$(PID);if(!e)return;
  var goingOn = (e.style.display==='none');
  e.style.display = goingOn ? '' : 'none';
  S.on = goingOn;
  sessionStorage.setItem(OK, goingOn?'1':'0');
  // Hide all editor overlays/menus when toggling off
  if(!goingOn){
    var hl=$(HID); if(hl) hl.style.display='none';
    var sl=$(SLID); if(sl) sl.style.display='none';
    var tip=document.getElementById('veTip'); if(tip) tip.style.display='none';
    var ctx=document.getElementById('veCtx'); if(ctx) ctx.style.display='none';
    var inl=document.getElementById('veInline'); if(inl) inl.remove();
    document.body.classList.remove('ve-active');
  } else {
    document.body.classList.add('ve-active');
  }
}

function ld(){try{var d=JSON.parse(localStorage.getItem(SK))||{};S.ov=d.ov||{};S.globals=d.globals||{colors:{},fonts:{body:'',display:''}};S.text=d.text||{};S.anims=d.anims||{};S.responsive=d.responsive||{};S.attrs=d.attrs||{};S.elements=d.elements||[];if(d.panel){S.panelMode=d.panel.mode||'docked';S.panelW=d.panel.w||340;S.panelFontSize=d.panel.fs||12;S.panelOpacity=d.panel.op||0.97;S.panelAccent=d.panel.ac||'#d8b55b';S.panelX=d.panel.x;S.panelY=d.panel.y;}_elC=S.elements.reduce(function(m,e){var n=parseInt((e.id||'').replace('ve-el-',''));return n>m?n:m;},0);}catch(e){}}
function recalcC(){_elC=S.elements.reduce(function(m,e){var n=parseInt((e.id||'').replace('ve-el-',''));return n>m?n:m;},0);}
function sv(){localStorage.setItem(SK,JSON.stringify({ov:S.ov,globals:S.globals,text:S.text,anims:S.anims,responsive:S.responsive,attrs:S.attrs,elements:S.elements,panel:{mode:S.panelMode,w:S.panelW,fs:S.panelFontSize,op:S.panelOpacity,ac:S.panelAccent,x:S.panelX,y:S.panelY}}));}
function snap(){return JSON.stringify({ov:S.ov,globals:S.globals,text:S.text,anims:S.anims,responsive:S.responsive,attrs:S.attrs,elements:S.elements,panel:{mode:S.panelMode,w:S.panelW,fs:S.panelFontSize,op:S.panelOpacity,ac:S.panelAccent,x:S.panelX,y:S.panelY}});}
function pu(){S.undos.push(snap());S.redos=[];if(S.undos.length>60)S.undos.shift();}
function undo(){if(!S.undos.length)return;S.redos.push(snap());rstr(S.undos.pop());}
function redo(){if(!S.redos.length)return;S.undos.push(snap());rstr(S.redos.pop());}
function rstr(j){var d=JSON.parse(j);S.ov=d.ov;S.globals=d.globals;S.text=d.text;S.anims=d.anims;S.responsive=d.responsive;S.attrs=d.attrs;S.elements=d.elements||[];recalcC();sv();rebuildEls();applyCSS();refresh();}

function gSel(el){var vid=el.getAttribute&&el.getAttribute('data-ve-id');if(vid)return'[data-ve-id="'+vid+'"]';if(el.id&&el.id.indexOf('ve')!==0)return'#'+CSS.escape(el.id);var p=[];while(el&&el!==document.body&&el!==document.documentElement){if(el.getAttribute&&el.getAttribute('data-ve-id')){p.unshift('[data-ve-id="'+el.getAttribute('data-ve-id')+'"]');break;}if(el.id&&el.id.indexOf('ve')!==0){p.unshift('#'+CSS.escape(el.id));break;}var s=el.tagName.toLowerCase();if(el.className&&typeof el.className==='string'){var cl=el.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0&&c!=='editing';});if(cl.length)s+='.'+cl.map(function(c){return CSS.escape(c);}).join('.');}var par=el.parentElement;if(par){var sib=Array.from(par.children).filter(function(x){return x.tagName===el.tagName;});if(sib.length>1)s+=':nth-child('+(Array.from(par.children).indexOf(el)+1)+')';}p.unshift(s);el=el.parentElement;}return p.join(' > ')||'body';}
function fName(el){var vid=el.getAttribute&&el.getAttribute('data-ve-id');if(vid){var ed=S.elements.find(function(e){return e.id===vid;});return ed?'[+] '+ed.type:'[+] #'+vid;}var t=el.tagName.toLowerCase(),c=el.className&&typeof el.className==='string'?el.className.split(/\s+/).filter(function(x){return x&&x.indexOf('ve')!==0;})[0]:'',i=el.id&&el.id.indexOf('ve')!==0?'#'+el.id:'',tx=(el.textContent||'').trim().substring(0,18);return'<'+t+'>'+(i||(c?'.'+c:''))+(tx?' "'+tx+(el.textContent.trim().length>18?'\u2026':'')+'"':'');}

function injectOverlay(){var hl=mk('div');hl.id=HID;hl.style.cssText='position:fixed;pointer-events:none;z-index:99990;border:2px dashed rgba(216,181,91,0.7);background:rgba(216,181,91,0.08);transition:all 80ms;display:none;';document.body.appendChild(hl);var sl=mk('div');sl.id=SLID;sl.style.cssText='position:fixed;pointer-events:none;z-index:99989;border:2px solid #d8b55b;background:rgba(216,181,91,0.05);display:none;';document.body.appendChild(sl);var tip=mk('div');tip.id='veTip';tip.style.cssText='position:fixed;pointer-events:none;z-index:99995;background:rgba(14,10,22,0.95);border:1px solid rgba(216,181,91,0.35);border-radius:8px;padding:8px 12px;color:#ddd0ee;font:11px/1.5 -apple-system,sans-serif;max-width:360px;display:none;backdrop-filter:blur(12px);box-shadow:0 4px 20px rgba(0,0,0,0.4);';document.body.appendChild(tip);var _tipEl=null,_tipTimer=null,_longPress=null,_longEl=null,_longX=0,_longY=0;document.addEventListener('mouseover',function(e){if(isVE(e.target)){hHL();tip.style.display='none';_tipEl=null;return;}if(S.on)sHL(e.target);_tipEl=e.target;clearTimeout(_tipTimer);_tipTimer=setTimeout(function(){if(_tipEl===e.target&&!document.getElementById('veInline'))showTip(e.target,e.clientX,e.clientY);},180);},true);document.addEventListener('mousemove',function(e){if(isVE(e.target))return;if(tip.style.display==='block'){var tx=e.clientX+14,ty=e.clientY+14;if(tx+360>window.innerWidth)tx=e.clientX-370;if(ty+tip.offsetHeight>window.innerHeight)ty=e.clientY-tip.offsetHeight-10;tip.style.left=tx+'px';tip.style.top=ty+'px';}});document.addEventListener('mouseout',function(e){clearTimeout(_tipTimer);_tipEl=null;tip.style.display='none';hHL();},true);document.addEventListener('mousedown',function(e){if(isVE(e.target)||e.button!==0||!S.on)return;if(S._nearEdge||e.altKey)return;_longEl=e.target;_longX=e.clientX;_longY=e.clientY;clearTimeout(_longPress);_longPress=setTimeout(function(){if(_longEl&&!S.editingText){tip.style.display='none';pick(_longEl);showInlineEditor(_longEl,_longX,_longY);_longEl=null;}},400);},true);document.addEventListener('mouseup',function(e){if(e.button!==0)return;clearTimeout(_longPress);if(_longEl&&!document.getElementById('veInline')&&S.on){if(!isVE(_longEl)){var multi=e.ctrlKey||e.metaKey;pick(_longEl,multi);tip.style.display='none';}_longEl=null;}},true);window.addEventListener('scroll',function(){if(S.sel)sSL(S.sel);if(S.multiSel.length)highlightMulti();tip.style.display='none';},true);window.addEventListener('resize',function(){if(S.sel)sSL(S.sel);if(S.multiSel.length)highlightMulti();});}
function isVE(el){while(el){if(el.id===PID||el.id===HID||el.id===SLID||el.id==='veCtx'||el.id==='veInline'||el.id==='veCpk'||el.id==='veFontScope'||el.id==='veTip')return true;if(el.className&&typeof el.className==='string'&&(el.className.indexOf('ve-multi-hl')!==-1||el.className.indexOf('ve-nav-hl')!==-1||el.className.indexOf('ve-spacing')!==-1))return true;el=el.parentElement;}return false;}
function sHL(el){var r=el.getBoundingClientRect(),h=$(HID);h.style.display='block';h.style.top=r.top+'px';h.style.left=r.left+'px';h.style.width=r.width+'px';h.style.height=r.height+'px';}
function hHL(){var h=$(HID);if(h)h.style.display='none';}
function sSL(el){var r=el.getBoundingClientRect(),s=$(SLID);s.style.display='block';s.style.top=r.top+'px';s.style.left=r.left+'px';s.style.width=r.width+'px';s.style.height=r.height+'px';}
function cSL(){var s=$(SLID);if(s)s.style.display='none';S.sel=null;S.selCSS=null;}
function pick(el,addToMulti){if(addToMulti){var sel=gSel(el);var idx=S.multiSelCSS.indexOf(sel);if(idx!==-1){S.multiSel.splice(idx,1);S.multiSelCSS.splice(idx,1);}else{S.multiSel.push(el);S.multiSelCSS.push(sel);}S.sel=el;S.selCSS=sel;S.picking=false;hHL();document.body.style.cursor='';highlightMulti();refresh();return;}clearMulti();S.sel=el;S.selCSS=gSel(el);S.picking=false;hHL();sSL(el);document.body.style.cursor='';refresh();}
function addEl(type,position){var def=ELTYPES.find(function(t){return t.type===type;});if(!def)return;pu();_elC++;var id='ve-el-'+_elC;var refSel=null;if(S.sel&&position!=='start')refSel=gSel(S.sel);var parentSel=null;if(S.sel&&position==='inside')parentSel=gSel(S.sel);else if(S.sel)parentSel=S.sel.parentElement?gSel(S.sel.parentElement):null;if(!parentSel)parentSel='main,.card,body';S.elements.push({id:id,type:type,parentSel:parentSel,refSel:refSel,position:position||'after',content:def.def||'',href:'',src:'',items:['Item 1','Item 2','Item 3'],level:2,navLinks:[{label:'Home',href:'/'},{label:'FAQ',href:'/faq/'},{label:'Registry',href:'/registry/'}],slideshowUrls:[],slideshowInterval:4,shapeType:'wave',shapeColor:'#f5f2ed',shapeHeight:60,shapeFlip:false});sv();rebuildEls();applyCSS();setTimeout(function(){var ne=$('[data-ve-id="'+id+'"]');if(ne)pick(ne);S._tab='add';refresh();},50);}
function rmEl(id){pu();S.elements=S.elements.filter(function(e){return e.id!==id;});var sel='[data-ve-id="'+id+'"]';delete S.ov[sel];delete S.text[sel];delete S.anims[sel];delete S.responsive[sel];delete S.attrs[sel];sv();cSL();rebuildEls();applyCSS();refresh();toast('Element deleted');}
function mvEl(id,dir){pu();var i=S.elements.findIndex(function(e){return e.id===id;});if(i===-1)return;var ni=dir==='up'?i-1:i+1;if(ni<0||ni>=S.elements.length)return;var t=S.elements[i];S.elements[i]=S.elements[ni];S.elements[ni]=t;sv();rebuildEls();applyCSS();refresh();}
function updEl(id,key,val){pu();var el=S.elements.find(function(e){return e.id===id;});if(el)el[key]=val;sv();rebuildEls();applyCSS();}

function rebuildEls(){document.querySelectorAll('[data-ve-added]').forEach(function(el){el.remove();});S.elements.forEach(function(def){var el=buildDOM(def);if(!el)return;el.setAttribute('data-ve-id',def.id);el.setAttribute('data-ve-added','1');insertAtPosition(el,def);});}
function insertAtPosition(el,def){var parent=null;try{parent=document.querySelector(def.parentSel);}catch(e){}if(!parent)parent=document.querySelector('main')||document.querySelector('.card')||document.body;var ref=null;if(def.refSel){try{ref=document.querySelector(def.refSel);}catch(e){}}switch(def.position){case 'before':if(ref)ref.parentElement.insertBefore(el,ref);else parent.insertBefore(el,parent.firstChild);break;case 'inside':parent.appendChild(el);break;case 'start':parent.insertBefore(el,parent.firstChild);break;default:if(ref&&ref.nextSibling)ref.parentElement.insertBefore(el,ref.nextSibling);else parent.appendChild(el);}}
var SHAPES={wave:'M0,40 C150,80 350,0 500,40 L500,0 L0,0 Z',curve:'M0,0 L0,40 Q250,80 500,40 L500,0 Z',triangle:'M0,0 L250,60 L500,0 Z',zigzag:'M0,40 L50,0 L100,40 L150,0 L200,40 L250,0 L300,40 L350,0 L400,40 L450,0 L500,40 L500,0 L0,0 Z',tilt:'M0,0 L500,40 L500,0 Z'};
function buildDOM(d){var el;switch(d.type){case 'nav':el=mk('nav');el.style.cssText='display:flex;align-items:center;justify-content:center;gap:1rem;padding:0.75rem 0;font-size:0.85rem;letter-spacing:0.08em;font-weight:500;';(d.navLinks||[]).forEach(function(l){var a=mk('a');a.href=l.href||'#';a.textContent=l.label||'Link';a.style.cssText='color:inherit;text-decoration:none;';el.appendChild(a);});break;case 'heading':el=document.createElement('h'+(d.level||2));el.textContent=d.content||'Heading';break;case 'text':el=mk('p');el.textContent=d.content||'Text';break;case 'image':el=mk('img');el.src=d.src||'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect fill="%23ddd" width="300" height="200"/><text fill="%23999" font-family="sans-serif" font-size="16" x="50%" y="50%" text-anchor="middle" dy=".3em">Image</text></svg>';el.alt=d.content||'';el.style.cssText='max-width:100%;height:auto;border-radius:8px;';break;case 'button':el=mk('a');el.href=d.href||'#';el.textContent=d.content||'Button';el.style.cssText='display:inline-flex;padding:0.7rem 2rem;font-family:inherit;font-size:0.9rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;color:#fdfbf7;background:#3d3a36;border-radius:4px;cursor:pointer;';break;case 'divider':el=mk('hr');el.style.cssText='width:60%;border:none;border-top:1px solid rgba(61,58,54,0.2);margin:1rem auto;';break;case 'spacer':el=mk('div');el.style.cssText='height:'+(d.content||'40')+'px;';el.setAttribute('aria-hidden','true');break;case 'section':el=mk('section');el.style.cssText='width:100%;padding:1.5rem;';el.innerHTML='<p style="color:#999;text-align:center;font-size:0.85rem;">Section container</p>';break;case 'list':el=mk('ul');el.style.cssText='text-align:left;padding-left:1.5rem;';(d.items||[]).forEach(function(i){var li=mk('li');li.textContent=i;el.appendChild(li);});break;case 'html':el=mk('div');el.innerHTML=d.content||'<p>Custom HTML</p>';break;case 'slideshow':el=mk('div');el.style.cssText='width:100%;height:200px;position:relative;overflow:hidden;border-radius:8px;';var urls=d.slideshowUrls||[];if(urls.length){urls.forEach(function(u,i){var img=mk('img');img.src=u;img.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:'+(i===0?1:0)+';transition:opacity 1s;';el.appendChild(img);});var cur={v:0};setInterval(function(){var imgs=el.querySelectorAll('img');if(!imgs.length)return;imgs[cur.v].style.opacity='0';cur.v=(cur.v+1)%imgs.length;imgs[cur.v].style.opacity='1';},(parseInt(d.slideshowInterval)||4)*1000);}else{el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px;">Add image URLs in properties</div>';}break;case 'shapedivider':el=mk('div');el.style.cssText='width:100%;overflow:hidden;line-height:0;';var h=d.shapeHeight||60,col=d.shapeColor||'#f5f2ed',shape=d.shapeType||'wave',flip=d.shapeFlip;var path=SHAPES[shape]||SHAPES.wave;el.innerHTML='<svg viewBox="0 0 500 '+h+'" preserveAspectRatio="none" style="width:100%;height:'+h+'px;display:block;'+(flip?'transform:rotate(180deg);':'')+'"><path d="'+path+'" fill="'+esc(col)+'"/></svg>';break;default:el=mk('div');el.textContent=d.content||'';}return el;}

function setProp(p,v){if(!S.selCSS)return;pu();if(!S.ov[S.selCSS])S.ov[S.selCSS]={};var k=S.hover?'hover:'+p:p;if(v===''||v==null){delete S.ov[S.selCSS][k];if(!Object.keys(S.ov[S.selCSS]).length)delete S.ov[S.selCSS];}else S.ov[S.selCSS][k]=v;sv();applyCSS();}
function getProp(p){if(!S.selCSS||!S.ov[S.selCSS])return'';return S.ov[S.selCSS][(S.hover?'hover:':'')+p]||'';}
function getComp(p){return S.sel?getComputedStyle(S.sel)[p]||'':'';}
function applyCSS(){var el=$(SID);if(!el){el=mk('style');el.id=SID;document.head.appendChild(el);}var css='';var rv=[];var gc=S.globals.colors;if(gc){for(var n in gc)if(gc[n])rv.push('--color-'+n+':'+gc[n]);}if(S.globals.fonts.body)rv.push('--font-body:'+S.globals.fonts.body);if(S.globals.fonts.display)rv.push('--font-display:'+S.globals.fonts.display);if(rv.length)css+=':root{'+rv.join(';')+'}\n';if(gc.primary)css+='body,.month,.day-num,.datetime,.venue,.name,.save-the-date,.faq-title,.faq-subtitle{color:'+gc.primary+' !important}\n';if(gc.secondary)css+='.day-name,.invited-line,.address,.reception,.ampersand,.secondary-link,.faq-kicker{color:'+gc.secondary+' !important}\n';if(gc.accent)css+='.rsvp-btn{background:'+gc.accent+' !important}.day-num.circled::before{border-color:'+gc.accent+' !important}:root{--gold:'+gc.accent+';--chip-active-bg:'+gc.accent+';--focus:'+gc.accent+'}\n';if(gc.bg)css+='body{background-color:'+gc.bg+' !important}\n';if(gc.card)css+='.card,.faq-card{background:'+gc.card+' !important}\n';if(gc.btn)css+='.rsvp-btn{background:'+gc.btn+' !important}\n';if(S.globals.fonts.body)css+='body{font-family:var(--font-body) !important}\n';if(S.globals.fonts.display)css+='.save-the-date,.faq-title{font-family:var(--font-display) !important}\n';for(var sel in S.ov){var ps=S.ov[sel];if(!ps)continue;var norm=[],hov=[];for(var p in ps){if(p.indexOf('hover:')===0)hov.push(p.slice(6)+':'+ps[p]+' !important;');else norm.push(p+':'+ps[p]+' !important;');}if(norm.length)css+=sel+'{'+norm.join('')+'}\n';if(hov.length)css+=sel+':hover{'+hov.join('')+'}\n';}var hd=[],ht=[],hm=[];for(var rs in S.responsive){var r=S.responsive[rs];if(r.hideDesktop)hd.push(rs+'{display:none !important}');if(r.hideTablet)ht.push(rs+'{display:none !important}');if(r.hideMobile)hm.push(rs+'{display:none !important}');}if(hd.length)css+='@media(min-width:769px){'+hd.join('')+'}\n';if(ht.length)css+='@media(min-width:481px) and (max-width:768px){'+ht.join('')+'}\n';if(hm.length)css+='@media(max-width:480px){'+hm.join('')+'}\n';for(var as in S.anims){var a=S.anims[as];if(!a||!a.type||a.type==='none')continue;css+=as+'{animation:ve-'+a.type+' '+(a.duration||'0.6')+'s '+(a.delay||'0')+'s both}\n';}css+='@keyframes ve-fadeIn{from{opacity:0}to{opacity:1}}@keyframes ve-slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}@keyframes ve-slideDown{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:translateY(0)}}@keyframes ve-slideLeft{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}@keyframes ve-slideRight{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}@keyframes ve-zoomIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}@keyframes ve-bounce{0%{opacity:0;transform:translateY(30px)}60%{transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}\n';el.textContent=css;for(var ts in S.text){try{var te=document.querySelector(ts);if(te&&!te.isContentEditable&&!te.getAttribute('data-ve-id'))te.textContent=S.text[ts];}catch(e){}}for(var xa in S.attrs){try{var ae=document.querySelector(xa);if(ae){for(var ak in S.attrs[xa])ae.setAttribute(ak,S.attrs[xa][ak]);}}catch(e){}}setupScrollAnims();}
var _sObs=null;function setupScrollAnims(){if(_sObs)_sObs.disconnect();_sObs=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.style.animationPlayState='running';_sObs.unobserve(e.target);}});},{threshold:0.15});for(var as in S.anims){var a=S.anims[as];if(!a||a.trigger!=='scroll')continue;try{document.querySelectorAll(as).forEach(function(el){el.style.animationPlayState='paused';_sObs.observe(el);});}catch(e){}}}
function startTextEdit(el){if(!el||S.editingText)return;S.editingText=true;el.contentEditable='true';el.classList.add('ve-editing');el.focus();var r=document.createRange();r.selectNodeContents(el);var s=window.getSelection();s.removeAllRanges();s.addRange(r);el.addEventListener('blur',function(){el.contentEditable='false';el.classList.remove('ve-editing');S.editingText=false;var cs=gSel(el);pu();var vid=el.getAttribute('data-ve-id');if(vid){var ed=S.elements.find(function(e){return e.id===vid;});if(ed)ed.content=el.textContent;}else S.text[cs]=el.textContent;sv();},{once:true});el.addEventListener('keydown',function(e){if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();el.blur();}});}

function injectCtx(){
  /* Capture-phase: when panel is ON, we own the contextmenu fully —
     suppress task-card inline oncontextmenu="" handlers and any other
     in-app contextmenu wiring, and directly fire the panel's menu.
     This stops the dual-menu bug where both #ctxMenu and #veCtx open. */
  document.addEventListener('contextmenu',function(e){
    if(!S.on)return;
    if(isVE(e.target))return;
    if(e.altKey)return; /* Alt+right-click handled by separate listener */
    if(e.shiftKey)return; /* Shift+right-click → native menu */
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    pick(e.target);
    showCtxMenu(e.clientX,e.clientY,e.target);
  },true);
  document.addEventListener('click',function(e){
    var ctx=$('veCtx');if(ctx&&ctx.style.display==='block'&&!ctx.contains(e.target))hideCtxMenu();
  });
}
function saveToServer(){var css=$(SID);var token=sessionStorage.getItem(TK);fetch(SAVE_EP,{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify({css:css?css.textContent:'',elements:S.elements,settings:{ov:S.ov,globals:S.globals,text:S.text,anims:S.anims,responsive:S.responsive,attrs:S.attrs,elements:S.elements}})}).then(function(r){return r.json();}).then(function(d){if(d.ok)toast('Saved to live site \u2713');else toast('Save failed: '+(d.error||''));}).catch(function(e){toast('Save error: '+e.message);});}
function pullFromServer(){var token=sessionStorage.getItem(TK);fetch(SAVE_EP,{method:'PATCH',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify({action:'list'})}).then(function(r){return r.json();}).then(function(revs){if(!revs||!revs.length){toast('No server data to pull');return;}restoreRev(revs[revs.length-1].key);}).catch(function(){toast('Pull failed');});}
function loadServerCSS(){var l=document.querySelector('link[href*="ve-save"]');if(!l){l=mk('link');l.rel='stylesheet';l.href=SAVE_EP+'?t='+Date.now();document.head.appendChild(l);}}
function loadRevs(cb){var t=sessionStorage.getItem(TK);fetch(SAVE_EP,{method:'PATCH',headers:{'Content-Type':'application/json','x-admin-token':t},body:JSON.stringify({action:'list'})}).then(function(r){return r.json();}).then(cb).catch(function(){cb([]);});}
function restoreRev(key){var t=sessionStorage.getItem(TK);fetch(SAVE_EP,{method:'PATCH',headers:{'Content-Type':'application/json','x-admin-token':t},body:JSON.stringify({action:'restore',key:key})}).then(function(r){return r.json();}).then(function(d){if(d.ok&&d.settings){pu();var s=d.settings;S.ov=s.ov||{};S.globals=s.globals||{colors:{},fonts:{body:'',display:''}};S.text=s.text||{};S.anims=s.anims||{};S.responsive=s.responsive||{};S.attrs=s.attrs||{};S.elements=s.elements||[];recalcC();sv();rebuildEls();applyCSS();refresh();toast('Revision restored');}}).catch(function(){toast('Restore failed');});}
function $(s){if(s.charAt(0)==='[')return document.querySelector(s);return document.getElementById(s);}
function mk(t){return document.createElement(t);}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cam(s){return s.replace(/-([a-z])/g,function(_,l){return l.toUpperCase();});}
function toHex(c){if(!c)return'#000000';if(c.indexOf('#')===0&&c.length>=7)return c.substring(0,7);var d=mk('div');d.style.color=c;document.body.appendChild(d);var m=getComputedStyle(d).color.match(/(\d+)/g);document.body.removeChild(d);if(m&&m.length>=3)return'#'+((1<<24)+(+m[0]<<16)+(+m[1]<<8)+(+m[2])).toString(16).slice(1);return'#000000';}
function shortV(v){return(v||'').length>32?v.substring(0,29)+'...':v||'';}
function toast(m){var t=document.getElementById('veToast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2200);}
function q(s,r){return(r||document).querySelector(s);}
function dl(n,c,t){var b=new Blob([c],{type:t}),a=mk('a');a.href=URL.createObjectURL(b);a.download=n;a.click();URL.revokeObjectURL(a.href);}

function buildNav(){var h='<div class="veNav">';function walk(el,d){if(!el||!el.tagName||isVE(el))return;var tag=el.tagName.toLowerCase();var cls=el.className&&typeof el.className==='string'?el.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0;})[0]:'';var vid=el.getAttribute&&el.getAttribute('data-ve-id');var label=vid?'\u2605 '+tag:tag+(cls?'.'+cls:'');var isSel=el===S.sel;h+='<div class="veNavItem'+(isSel?' active':'')+(vid?' added':'')+'" style="padding-left:'+(d*14+8)+'px">';h+='<span class="veNavLabel" data-nav-sel="'+esc(gSel(el))+'">'+esc(label)+'</span>';if(vid)h+='<button class="veNavDel" data-del-id="'+vid+'">&times;</button>';h+='</div>';Array.from(el.children).filter(function(c){return c.tagName&&!isVE(c);}).forEach(function(c){walk(c,d+1);});}walk(document.querySelector('main')||document.querySelector('.card')||document.body.children[0],0);h+='</div>';return h;}
function injectPanel(){var r=mk('div');r.id=PID;r.innerHTML=buildHTML();document.body.appendChild(r);wire(r);}
function refresh(){var r=document.getElementById(PID);if(!r)return;var st=r.scrollTop;r.innerHTML=buildHTML();wire(r);r.scrollTop=st;}
function buildHTML(){var h='',at=S._tab||'style';h+='<div class="veBar"><div class="veBarL"><span class="veLogo" id="veDragHandle" title="'+(S.panelMode==='floating'?'Drag to reposition':'Click \u2699 Panel tab to float')+'">'+(S.panelMode==='floating'?'\u2630 ':'')+'VE</span><button class="veBtn veBtn--sm'+(S.picking?' active':'')+'" id="vePickBtn" title="Pick element — click anything on the page">\uD83C\uDFAF</button><button class="veBtn veBtn--sm" id="veUndo" title="Undo (Ctrl+Z)">\u21A9</button><button class="veBtn veBtn--sm" id="veRedo" title="Redo (Ctrl+Y)">\u21AA</button></div><div class="veBarR"><button class="veBtn veBtn--sm'+(S.vp==='desktop'?' active':'')+'" data-vp="desktop" title="Desktop view">\uD83D\uDDA5</button><button class="veBtn veBtn--sm'+(S.vp==='tablet'?' active':'')+'" data-vp="tablet" title="Tablet view (768px)">\uD83D\uDCF1</button><button class="veBtn veBtn--sm'+(S.vp==='mobile'?' active':'')+'" data-vp="mobile" title="Mobile view (390px)">\uD83D\uDCF2</button><button class="veBtn veBtn--sm" id="veGear" title="Panel settings">⚙</button><button class="veBtn veBtn--sm" id="veMini" title="Minimize">▬</button><button class="veBtn veBtn--sm" id="veClose" title="Hide panel (Ctrl+Shift+P)">&times;</button></div></div>';h+='<div class="veTabs">';[['style','Style'],['add','+ Add'],['global','Global'],['anim','Motion'],['nav','Nav'],['history','History'],['panel','⚙ Panel']].forEach(function(t){h+='<button class="veTab'+(at===t[0]?' active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>';});h+='</div>';if(at==='add')h+=buildAddTab();else if(at==='global')h+=buildGlobalTab();else if(at==='anim')h+=buildAnimTab();else if(at==='nav')h+=buildNavTab();else if(at==='history')h+=buildHistoryTab();else if(at==='panel')h+=buildPanelTab();else h+=buildStyleTab();h+='<div class="veActions"><button class="veBtn veBtn--save" id="veSave" title="Save all overrides + elements to live site">\uD83D\uDCBE Save Live</button><button class="veBtn" id="vePull" title="Pull latest saved state from server">\u2B07 Pull</button><button class="veBtn" id="veExpCSS" title="Export overrides as .css file">CSS</button><button class="veBtn" id="veExpJSON" title="Export all settings as .json">JSON</button><button class="veBtn" id="veImp" title="Import settings from .json file">Import</button><button class="veBtn veBtn--danger" id="veResetAll" title="Delete ALL overrides and added elements">Reset All</button></div><div class="veToast" id="veToast"></div>';return h;}
function buildAddTab(){var pos=S._addPosition||'after',h='<div class="veTabContent"><div class="veSecOpen"><span class="veSecTitle">Insert Position</span><div class="veAddPos">';['before','after','inside','start'].forEach(function(p){h+='<button class="veBtn veBtn--sm'+(pos===p?' active':'')+'" data-pos="'+p+'">'+(p==='start'?'Start of page':p.charAt(0).toUpperCase()+p.slice(1)+' selected')+'</button>';});h+='</div>';if(!S.sel)h+='<div class="veHint">Pick an element first, or use "Start of page"</div>';h+='</div>';h+='<div class="veSecOpen"><span class="veSecTitle">Element Palette</span><div class="vePalette">';ELTYPES.forEach(function(t){h+='<button class="vePaletteItem" data-add-type="'+t.type+'"><span class="vePaletteIcon">'+t.icon+'</span><span class="vePaletteLabel">'+t.label+'</span></button>';});h+='</div></div>';if(S.elements.length){h+='<div class="veSecOpen"><span class="veSecTitle">Added ('+S.elements.length+')</span>';S.elements.forEach(function(el){var d=ELTYPES.find(function(t){return t.type===el.type;});h+='<div class="veAddedItem"><span class="veAddedIcon">'+(d?d.icon:'')+'</span><span class="veAddedLabel">'+esc(el.type)+'</span><button class="veBtn veBtn--sm" data-move-up="'+el.id+'">\u25B2</button><button class="veBtn veBtn--sm" data-move-down="'+el.id+'">\u25BC</button><button class="veBtn veBtn--sm" data-select-el="'+el.id+'">\uD83C\uDFAF</button><button class="veBtn veBtn--sm veBtn--danger" data-remove-el="'+el.id+'">&times;</button></div>';});h+='</div>';}if(S.sel&&S.sel.getAttribute('data-ve-id')){var vid=S.sel.getAttribute('data-ve-id'),ed=S.elements.find(function(e){return e.id===vid;});if(ed){h+='<div class="veSecOpen"><span class="veSecTitle">Properties: '+ed.type+'</span>';if(ed.type==='heading'){h+='<div class="veRow"><label>Level</label><select data-ep="level" data-eid="'+vid+'" class="veSelect">';[1,2,3,4,5,6].forEach(function(l){h+='<option value="'+l+'"'+(ed.level==l?' selected':'')+'>H'+l+'</option>';});h+='</select></div>';h+=epText(vid,ed);}if(ed.type==='text'||ed.type==='button')h+=epText(vid,ed);if(ed.type==='button')h+=epField(vid,'href','Link URL',ed.href);if(ed.type==='image')h+=epField(vid,'src','Image URL',ed.src);if(ed.type==='spacer')h+=epField(vid,'content','Height (px)',ed.content||'40');if(ed.type==='nav')h+='<div class="veRow"><label>Nav Links (JSON)</label><textarea class="veTextarea" data-ep="navLinks" data-eid="'+vid+'">'+esc(JSON.stringify(ed.navLinks||[],null,1))+'</textarea></div>';if(ed.type==='list')h+='<div class="veRow"><label>Items (one per line)</label><textarea class="veTextarea" data-ep="items" data-eid="'+vid+'">'+(ed.items||[]).join('\n')+'</textarea></div>';if(ed.type==='html')h+='<div class="veRow"><label>HTML</label><textarea class="veTextarea" data-ep="content" data-eid="'+vid+'">'+esc(ed.content||'')+'</textarea></div>';if(ed.type==='slideshow'){h+='<div class="veRow"><label>Image URLs (one per line)</label><textarea class="veTextarea" data-ep="slideshowUrls" data-eid="'+vid+'">'+(ed.slideshowUrls||[]).join('\n')+'</textarea></div>';h+=epField(vid,'slideshowInterval','Interval (sec)',ed.slideshowInterval||'4');}if(ed.type==='shapedivider'){h+='<div class="veRow"><label>Shape</label><select data-ep="shapeType" data-eid="'+vid+'" class="veSelect">';['wave','curve','triangle','zigzag','tilt'].forEach(function(s){h+='<option value="'+s+'"'+(ed.shapeType===s?' selected':'')+'>'+s+'</option>';});h+='</select></div>';h+='<div class="veRow"><label>Color</label><div class="veColorWrap"><input type="color" data-ep="shapeColor" data-eid="'+vid+'" value="'+toHex(ed.shapeColor||'#f5f2ed')+'" class="veColor"></div></div>';h+=epField(vid,'shapeHeight','Height (px)',ed.shapeHeight||'60');h+='<label class="veToggle"><input type="checkbox" data-ep="shapeFlip" data-eid="'+vid+'"'+(ed.shapeFlip?' checked':'')+'>  Flip vertically</label>';}h+='</div>';}}h+='</div>';return h;}
function epText(vid,ed){return'<div class="veRow"><label>Text</label><input type="text" data-ep="content" data-eid="'+vid+'" value="'+esc(ed.content)+'" class="veInput"></div>';}
function epField(vid,key,label,val){return'<div class="veRow"><label>'+label+'</label><input type="text" data-ep="'+key+'" data-eid="'+vid+'" value="'+esc(val||'')+'" class="veInput"></div>';}

function buildStyleTab(){if(!S.sel)return'<div class="veEmpty"><div class="veEmptyIcon">\uD83C\uDFAF</div><div class="veEmptyText">Pick an element to edit.<br><small>Double-click = edit text | Right-click = menu</small></div></div>';var h='';h+='<div class="veBread">';var chain=[];var el=S.sel;while(el&&el!==document.documentElement){chain.unshift(el);el=el.parentElement;}S._bc=chain;chain.forEach(function(n,i){var tag=n.tagName.toLowerCase();var cls=n.className&&typeof n.className==='string'?n.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0;})[0]:'';h+='<span class="veBreadItem'+(n===S.sel?' active':'')+'" data-bci="'+i+'">'+esc(tag+(cls?'.'+cls:''))+'</span>';if(i<chain.length-1)h+='<span class="veBreadSep">&rsaquo;</span>';});h+='</div>';h+='<div class="veInfo"><div class="veInfoName">'+esc(fName(S.sel))+'</div><div class="veInfoSel">'+esc(S.selCSS)+'</div>';h+='<label class="veToggle"><input type="checkbox" id="veHover"'+(S.hover?' checked':'')+' title="Edit hover state styles">  :hover</label>';var rv=S.responsive[S.selCSS]||{};h+='<div class="veResponsive">';['hideDesktop','hideTablet','hideMobile'].forEach(function(k){h+='<label class="veChip'+(rv[k]?' on':'')+'"><input type="checkbox" data-resp="'+k+'"'+(rv[k]?' checked':'')+'>'+k.replace('hide','')+'</label>';});h+='</div></div>';h+=buildBoxModel();h+=sec('Spacing',[uR('margin-top','M-Top'),uR('margin-right','M-Right'),uR('margin-bottom','M-Bot'),uR('margin-left','M-Left'),uR('padding-top','P-Top'),uR('padding-right','P-Right'),uR('padding-bottom','P-Bot'),uR('padding-left','P-Left')]);h+=sec('Typography',[sR('font-family','Font',[['','(inherited)'],["'Cormorant Garamond',Georgia,serif",'Cormorant'],["'Allura',cursive",'Allura'],["'Playfair Display',Georgia,serif",'Playfair'],["'Lora',Georgia,serif",'Lora'],["Georgia,serif",'Georgia'],["-apple-system,sans-serif",'System']]),uR('font-size','Size'),sR('font-weight','Weight',[['','(inherited)'],['300','Light'],['400','Normal'],['500','Medium'],['600','SemiBold'],['700','Bold']]),uR('line-height','Line Ht'),uR('letter-spacing','Letter Sp'),sR('text-transform','Transform',[['','(inherited)'],['none','None'],['uppercase','UPPER'],['lowercase','lower']]),sR('text-align','Align',[['','(inherited)'],['left','Left'],['center','Center'],['right','Right']]),cR('color','Color'),tR('text-shadow','Text Shadow')]);h+=sec('Background',[cR('background-color','BG Color'),tR('background','BG Full'),'<div class="veRow"><label>GRADIENT BUILDER</label>'+buildGradUI()+'</div>',uR('opacity','Opacity'),tR('backdrop-filter','Backdrop Filter')]);h+=sec('Border',[tR('border','Border'),cR('border-color','Color'),uR('border-width','Width'),sR('border-style','Style',[['','(inherited)'],['none','None'],['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']]),uR('border-radius','Radius')]);h+=sec('Shadow',['<div class="veRow"><label>BOX SHADOW BUILDER</label>'+buildShadUI()+'</div>',tR('filter','CSS Filter'),tR('transform','Transform'),tR('transition','Transition')]);h+=sec('Dimensions',[uR('width','Width'),uR('height','Height'),uR('max-width','Max W'),uR('min-height','Min H'),sR('overflow','Overflow',[['','(inherited)'],['visible','Visible'],['hidden','Hidden'],['auto','Auto']])]);h+=sec('Layout',[sR('display','Display',[['','(inherited)'],['block','Block'],['inline-block','I-Block'],['flex','Flex'],['grid','Grid'],['none','None']]),sR('flex-direction','Flex Dir',[['','(inherited)'],['row','Row'],['column','Col']]),sR('justify-content','Justify',[['','(inherited)'],['flex-start','Start'],['center','Center'],['flex-end','End'],['space-between','Between']]),sR('align-items','Align',[['','(inherited)'],['flex-start','Start'],['center','Center'],['flex-end','End'],['stretch','Stretch']]),uR('gap','Gap'),sR('position','Position',[['','(inherited)'],['static','Static'],['relative','Relative'],['absolute','Absolute'],['fixed','Fixed'],['sticky','Sticky']]),uR('top','Top'),uR('right','Right'),uR('bottom','Bottom'),uR('left','Left'),uR('z-index','Z-Index')]);h+=sec('Attributes',[buildAttrsUI()]);return h;}
function buildGradUI(){var bg=getProp('background')||getComp('background')||'';var angM=bg.match(/(\d+)deg/),c1M=bg.match(/#[0-9a-f]{6}/gi);var ang=angM?angM[1]:'135',c1=c1M&&c1M[0]?c1M[0]:'#5a5450',c2=c1M&&c1M[1]?c1M[1]:'#3d3a36';return'<div class="veGrad"><div class="veGradRow"><label>Type</label><select data-grad="type"><option value="linear"'+(bg.indexOf('radial')===-1?' selected':'')+'>Linear</option><option value="radial"'+(bg.indexOf('radial')!==-1?' selected':'')+'>Radial</option></select></div><div class="veGradRow"><label>Angle</label><input type="range" data-grad="angle" min="0" max="360" value="'+ang+'" class="veRange"><span class="veRV">'+ang+'\u00B0</span></div><div class="veGradRow"><label>Color 1</label><input type="color" data-grad="c1" value="'+c1+'" class="veColor"></div><div class="veGradRow"><label>Color 2</label><input type="color" data-grad="c2" value="'+c2+'" class="veColor"></div><button class="veBtn veBtn--sm" id="veApplyGrad">Apply</button></div>';}
function buildShadUI(){var sh=getProp('box-shadow')||getComp('boxShadow')||'';var parts=sh.match(/([-\d]+)px\s+([-\d]+)px\s+([-\d]+)px\s*([-\d]*)px?\s*rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)?/);var x=parts?parts[1]:'0',y=parts?parts[2]:'4',bl=parts?parts[3]:'16',sp=parts&&parts[4]?parts[4]:'0';var cr=parts?parseInt(parts[5]):0,cg=parts?parseInt(parts[6]):0,cb=parts?parseInt(parts[7]):0;var op=parts&&parts[8]?Math.round(parseFloat(parts[8])*100):'30';var hex='#'+((1<<24)+(cr<<16)+(cg<<8)+cb).toString(16).slice(1);var ins=sh.indexOf('inset')!==-1;return'<div class="veShadow"><div class="veGradRow"><label>X</label><input type="range" data-sh="x" min="-30" max="30" value="'+x+'" class="veRange"><span class="veRV">'+x+'px</span></div><div class="veGradRow"><label>Y</label><input type="range" data-sh="y" min="-30" max="30" value="'+y+'" class="veRange"><span class="veRV">'+y+'px</span></div><div class="veGradRow"><label>Blur</label><input type="range" data-sh="blur" min="0" max="60" value="'+bl+'" class="veRange"><span class="veRV">'+bl+'px</span></div><div class="veGradRow"><label>Spread</label><input type="range" data-sh="spread" min="-20" max="20" value="'+sp+'" class="veRange"><span class="veRV">'+sp+'px</span></div><div class="veGradRow"><label>Color</label><input type="color" data-sh="color" value="'+hex+'" class="veColor"></div><div class="veGradRow"><label>Opacity</label><input type="range" data-sh="opacity" min="0" max="100" value="'+op+'" class="veRange"><span class="veRV">'+op+'%</span></div><label class="veToggle"><input type="checkbox" data-sh="inset"'+(ins?' checked':'')+'>  Inset</label><button class="veBtn veBtn--sm" id="veApplyShadow">Apply</button></div>';}
function buildAttrsUI(){var a=S.attrs[S.selCSS]||{};var h='<div class="veAttrs">';for(var k in a)h+='<div class="veAttrRow"><input type="text" value="'+esc(k)+'" class="veInput veAttrK" readonly><input type="text" value="'+esc(a[k])+'" class="veInput" data-attr-key="'+esc(k)+'"><button class="veReset" data-rm-attr="'+esc(k)+'">\u00D7</button></div>';h+='<div class="veAttrRow"><input type="text" placeholder="attr" class="veInput" id="veNewAttrK"><input type="text" placeholder="val" class="veInput" id="veNewAttrV"><button class="veBtn veBtn--sm" id="veAddAttr">+</button></div></div>';return h;}
function buildGlobalTab(){var h='<div class="veTabContent"><div class="veSecOpen"><span class="veSecTitle">Global Colors</span><div class="veGlobals">';var gc=S.globals.colors||{};[['primary','Primary Text','#3d3a36'],['secondary','Secondary Text','#4a4640'],['accent','Accent / Gold','#d8b55b'],['bg','Page Background','#f5f2ed'],['card','Card Background','rgba(250,247,242,0.38)'],['btn','Button Color','#3d3a36']].forEach(function(p){var v=gc[p[0]]||p[2];h+='<div class="veRow"><label>'+p[1]+'</label><div class="veColorWrap"><input type="color" data-gc="'+p[0]+'" value="'+toHex(v)+'" class="veColor"><input type="text" data-gc-text="'+p[0]+'" value="'+esc(gc[p[0]]||'')+'" placeholder="'+p[2]+'" class="veInput veColorText"></div></div>';});h+='</div></div><div class="veSecOpen"><span class="veSecTitle">Global Fonts</span>';h+=gfR('body','Body Font',[['','(default)'],["'Cormorant Garamond',Georgia,serif",'Cormorant Garamond'],["'Playfair Display',Georgia,serif",'Playfair Display'],["'Lora',Georgia,serif",'Lora'],["Georgia,serif",'Georgia']],S.globals.fonts.body);h+=gfR('display','Display Font',[['','(default)'],["'Allura',cursive",'Allura'],["'Great Vibes',cursive",'Great Vibes'],["'Dancing Script',cursive",'Dancing Script']],S.globals.fonts.display);h+='</div></div>';return h;}
function gfR(k,l,o,v){return'<div class="veRow"><label>'+l+'</label><select data-gf="'+k+'" class="veSelect">'+o.map(function(x){return'<option value="'+x[0]+'"'+(x[0]===v?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>';}
function buildAnimTab(){if(!S.sel)return'<div class="veTabContent"><div class="veEmpty"><div class="veEmptyText">Pick an element first</div></div></div>';var a=S.anims[S.selCSS]||{};return'<div class="veTabContent"><div class="veInfo"><div class="veInfoName">'+esc(fName(S.sel))+'</div></div><div class="veSecOpen"><span class="veSecTitle">Entrance Animation</span>'+aR('type','Animation',[['none','None'],['fadeIn','Fade In'],['slideUp','Slide Up'],['slideDown','Slide Down'],['slideLeft','Slide Left'],['slideRight','Slide Right'],['zoomIn','Zoom In'],['bounce','Bounce']],a.type||'none')+aR('trigger','Trigger',[['load','Page Load'],['scroll','Scroll Into View']],a.trigger||'load')+'<div class="veRow"><label>Duration (s)</label><input type="text" data-anim="duration" value="'+(a.duration||'0.6')+'" class="veInput"></div><div class="veRow"><label>Delay (s)</label><input type="text" data-anim="delay" value="'+(a.delay||'0')+'" class="veInput"></div><button class="veBtn" id="vePreviewAnim">Preview</button></div></div>';}
function aR(k,l,o,v){return'<div class="veRow"><label>'+l+'</label><select data-anim="'+k+'" class="veSelect">'+o.map(function(x){return'<option value="'+x[0]+'"'+(x[0]===v?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>';}
function buildNavTab(){return'<div class="veTabContent">'+buildNav()+'</div>';}
function buildHistoryTab(){return'<div class="veTabContent"><div class="veSecOpen"><span class="veSecTitle">Revision History</span><div id="veRevisions"><div class="veEmptyText">Click Load to fetch</div></div><button class="veBtn" id="veLoadRevs">Load Revisions</button></div></div>';}


function buildPanelTab(){var h='<div class="veTabContent">';
h+='<div class="veSecOpen"><span class="veSecTitle">Panel Position</span>';
h+='<div class="veAddPos"><button class="veBtn veBtn--sm'+(S.panelMode==='docked'?' active':'')+'" data-pmode="docked" title="Dock to right edge">Docked</button><button class="veBtn veBtn--sm'+(S.panelMode==='floating'?' active':'')+'" data-pmode="floating" title="Free-floating, draggable">Floating</button></div>';
if(S.panelMode==='floating')h+='<div class="veHint">Drag the \u2630 handle in the top bar to reposition</div>';
h+='</div>';
h+='<div class="veSecOpen"><span class="veSecTitle">Panel Size</span>';
h+='<div class="veRow"><label>Width (px)</label><div class="veGradRow"><input type="range" id="vePanelW" min="260" max="520" value="'+S.panelW+'" class="veRange"><span class="veRV">'+S.panelW+'px</span></div></div>';
h+='</div>';
h+='<div class="veSecOpen"><span class="veSecTitle">Panel Typography</span>';
h+='<div class="veRow"><label>Font Size (px)</label><div class="veGradRow"><input type="range" id="vePanelFS" min="9" max="18" value="'+S.panelFontSize+'" class="veRange"><span class="veRV">'+S.panelFontSize+'px</span></div></div>';
h+='</div>';
h+='<div class="veSecOpen"><span class="veSecTitle">Panel Appearance</span>';
h+='<div class="veRow"><label>Opacity</label><div class="veGradRow"><input type="range" id="vePanelOp" min="50" max="100" value="'+Math.round(S.panelOpacity*100)+'" class="veRange"><span class="veRV">'+Math.round(S.panelOpacity*100)+'%</span></div></div>';
h+='<div class="veRow"><label>Accent Color</label><div class="veColorWrap"><input type="color" id="vePanelAc" value="'+S.panelAccent+'" class="veColor"><input type="text" id="vePanelAcT" value="'+esc(S.panelAccent)+'" class="veInput veColorText"></div></div>';
h+='<button class="veBtn" id="vePanelReset" title="Reset panel to defaults">Reset Panel Defaults</button>';
h+='</div>';
h+='</div>';return h;}
function buildBoxModel(){if(!S.sel)return'';var cs=getComputedStyle(S.sel);var v=function(p){return parseInt(getProp(p)||cs[cam(p)])||0;};var w=Math.round(S.sel.getBoundingClientRect().width),hi=Math.round(S.sel.getBoundingClientRect().height);function bI(p,val){var pos={'margin-top':'veBoxT','margin-right':'veBoxR','margin-bottom':'veBoxB','margin-left':'veBoxL','padding-top':'veBoxT','padding-right':'veBoxR','padding-bottom':'veBoxB','padding-left':'veBoxL'};return'<input class="veBoxInput '+pos[p]+'" data-box="'+p+'" value="'+val+'">';}return'<div class="veBoxModel"><div class="veBoxLabel">margin</div><div class="veBoxMargin">'+bI('margin-top',v('margin-top'))+bI('margin-right',v('margin-right'))+bI('margin-bottom',v('margin-bottom'))+bI('margin-left',v('margin-left'))+'<div class="veBoxLabel2">padding</div><div class="veBoxPadding">'+bI('padding-top',v('padding-top'))+bI('padding-right',v('padding-right'))+bI('padding-bottom',v('padding-bottom'))+bI('padding-left',v('padding-left'))+'<div class="veBoxContent">'+w+' &times; '+hi+'</div></div></div></div>';}
function cR(p,l){var v=getProp(p),cv=getComp(cam(p)),hex=toHex(v||cv);return'<div class="veRow"><label>'+l+'</label><div class="veColorWrap"><input type="color" data-prop="'+p+'" value="'+hex+'" class="veColor"><input type="text" data-prop="'+p+'" value="'+esc(v)+'" placeholder="'+esc(cv)+'" class="veInput veColorText">'+(v?'<button class="veReset" data-prop="'+p+'">\u00D7</button>':'')+'</div></div>';}
function uR(p,l){var v=getProp(p),cv=getComp(cam(p));return'<div class="veRow"><label>'+l+'</label><div class="veUnitWrap"><input type="text" data-prop="'+p+'" value="'+esc(v)+'" placeholder="'+esc(cv)+'" class="veInput">'+(v?'<button class="veReset" data-prop="'+p+'">\u00D7</button>':'')+'</div></div>';}
function tR(p,l){var v=getProp(p),cv=shortV(getComp(cam(p)));return'<div class="veRow"><label>'+l+'</label><div class="veUnitWrap"><input type="text" data-prop="'+p+'" value="'+esc(v)+'" placeholder="'+esc(cv)+'" class="veInput">'+(v?'<button class="veReset" data-prop="'+p+'">\u00D7</button>':'')+'</div></div>';}
function sR(p,l,opts){var v=getProp(p);return'<div class="veRow"><label>'+l+'</label><div class="veUnitWrap"><select data-prop="'+p+'" class="veSelect">'+opts.map(function(x){return'<option value="'+x[0]+'"'+(x[0]===v?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select>'+(v?'<button class="veReset" data-prop="'+p+'">\u00D7</button>':'')+'</div></div>';}
function sec(t,rows){return'<div class="veSec"><div class="veSecH"><span>'+t+'</span><span class="veChev">\u25B6</span></div><div class="veSecBody">'+rows.join('')+'</div></div>';}

function wire(root){
  q('#veClose',root).onclick=tog;
  var miniBtn=q('#veMini',root);if(miniBtn)miniBtn.onclick=function(){toggleMini(true);};
  q('#veGear',root).onclick=function(){S._tab='panel';refresh();};
  q('#vePickBtn',root).onclick=function(){S.picking=!S.picking;document.body.style.cursor=S.picking?'crosshair':'';refresh();};
  var ub=q('#veUndo',root);if(ub)ub.onclick=undo;
  var rb=q('#veRedo',root);if(rb)rb.onclick=redo;
  root.querySelectorAll('[data-vp]').forEach(function(b){b.onclick=function(){S.vp=b.getAttribute('data-vp');var w={desktop:'',tablet:'768px',mobile:'390px'};document.body.style.maxWidth=w[S.vp];document.body.style.margin=S.vp!=='desktop'?'0 auto':'';refresh();};});
  root.querySelectorAll('[data-tab]').forEach(function(b){b.onclick=function(){S._tab=b.getAttribute('data-tab');refresh();};});
  var hc=q('#veHover',root);if(hc)hc.onchange=function(){S.hover=hc.checked;refresh();};
  root.querySelectorAll('[data-resp]').forEach(function(cb){cb.onchange=function(){if(!S.selCSS)return;pu();if(!S.responsive[S.selCSS])S.responsive[S.selCSS]={};S.responsive[S.selCSS][cb.getAttribute('data-resp')]=cb.checked;sv();applyCSS();refresh();};});
  root.querySelectorAll('[data-bci]').forEach(function(s){s.onclick=function(){var i=parseInt(s.getAttribute('data-bci'));if(S._bc&&S._bc[i])pick(S._bc[i]);};});
  root.querySelectorAll('.veSecH').forEach(function(h){h.onclick=function(){h.classList.toggle('open');h.nextElementSibling.classList.toggle('open');};});
  root.querySelectorAll('[data-box]').forEach(function(inp){inp.onchange=function(){var p=inp.getAttribute('data-box'),v=inp.value;setProp(p,v?v+(String(v).match(/[a-z%]/)?'':'px'):'');if(S.sel)sSL(S.sel);};});
  root.querySelectorAll('[data-prop]').forEach(function(inp){var p=inp.getAttribute('data-prop');var ev=inp.tagName==='SELECT'?'change':inp.type==='color'?'input':'change';inp.addEventListener(ev,function(){if(inp.type==='color'){setProp(p,inp.value);var t=root.querySelector('input[type="text"][data-prop="'+p+'"]');if(t)t.value=inp.value;}else{setProp(p,inp.value);if(inp.classList.contains('veColorText')){var c=root.querySelector('input[type="color"][data-prop="'+p+'"]');if(c)c.value=toHex(inp.value);}}if(S.sel)sSL(S.sel);});});
  root.querySelectorAll('.veReset[data-prop]').forEach(function(b){b.onclick=function(){setProp(b.getAttribute('data-prop'),'');refresh();};});
  var agb=q('#veApplyGrad',root);if(agb)agb.onclick=function(){var t=root.querySelector('[data-grad="type"]').value,an=root.querySelector('[data-grad="angle"]').value,c1=root.querySelector('[data-grad="c1"]').value,c2=root.querySelector('[data-grad="c2"]').value;setProp('background',t==='linear'?'linear-gradient('+an+'deg,'+c1+','+c2+')':'radial-gradient(circle,'+c1+','+c2+')');refresh();};
  root.querySelectorAll('[data-grad="angle"]').forEach(function(r){r.oninput=function(){var rv=r.parentElement.querySelector('.veRV');if(rv)rv.textContent=r.value+'\u00B0';};});
  var asb=q('#veApplyShadow',root);if(asb)asb.onclick=function(){var x=root.querySelector('[data-sh="x"]').value,y=root.querySelector('[data-sh="y"]').value,bl=root.querySelector('[data-sh="blur"]').value,sp=root.querySelector('[data-sh="spread"]').value,co=root.querySelector('[data-sh="color"]').value,op=root.querySelector('[data-sh="opacity"]').value,ins=root.querySelector('[data-sh="inset"]').checked;var r=parseInt(co.slice(1,3),16),g=parseInt(co.slice(3,5),16),b=parseInt(co.slice(5,7),16);setProp('box-shadow',(ins?'inset ':'')+x+'px '+y+'px '+bl+'px '+sp+'px rgba('+r+','+g+','+b+','+(op/100)+')');refresh();};
  root.querySelectorAll('[data-sh]').forEach(function(r){if(r.type==='range')r.oninput=function(){var rv=r.parentElement.querySelector('.veRV');if(rv)rv.textContent=r.value+(r.getAttribute('data-sh')==='opacity'?'%':'px');};});
  root.querySelectorAll('[data-gc]').forEach(function(inp){inp.oninput=function(){var k=inp.getAttribute('data-gc');pu();S.globals.colors[k]=inp.value;sv();applyCSS();var t=root.querySelector('[data-gc-text="'+k+'"]');if(t)t.value=inp.value;};});
  root.querySelectorAll('[data-gc-text]').forEach(function(inp){inp.onchange=function(){var k=inp.getAttribute('data-gc-text');pu();S.globals.colors[k]=inp.value;sv();applyCSS();var c=root.querySelector('[data-gc="'+k+'"]');if(c)c.value=toHex(inp.value);};});
  root.querySelectorAll('[data-gf]').forEach(function(sel){sel.onchange=function(){pu();S.globals.fonts[sel.getAttribute('data-gf')]=sel.value;sv();applyCSS();};});
  root.querySelectorAll('[data-anim]').forEach(function(inp){inp.addEventListener(inp.tagName==='SELECT'?'change':'change',function(){if(!S.selCSS)return;pu();if(!S.anims[S.selCSS])S.anims[S.selCSS]={};S.anims[S.selCSS][inp.getAttribute('data-anim')]=inp.value;sv();applyCSS();});});
  var prev=q('#vePreviewAnim',root);if(prev)prev.onclick=function(){if(!S.sel)return;S.sel.style.animation='none';S.sel.offsetHeight;S.sel.style.animation='';};
  root.querySelectorAll('[data-nav-sel]').forEach(function(s){s.onclick=function(){try{var el=document.querySelector(s.getAttribute('data-nav-sel'));if(el)pick(el);}catch(e){}};});
  root.querySelectorAll('[data-del-id]').forEach(function(b){b.onclick=function(e){e.stopPropagation();rmEl(b.getAttribute('data-del-id'));};});
  var addA=q('#veAddAttr',root);if(addA)addA.onclick=function(){var k=q('#veNewAttrK',root).value.trim(),v=q('#veNewAttrV',root).value.trim();if(!k||!S.selCSS)return;pu();if(!S.attrs[S.selCSS])S.attrs[S.selCSS]={};S.attrs[S.selCSS][k]=v;sv();applyCSS();refresh();};
  root.querySelectorAll('[data-rm-attr]').forEach(function(b){b.onclick=function(){if(!S.selCSS)return;pu();if(S.attrs[S.selCSS])delete S.attrs[S.selCSS][b.getAttribute('data-rm-attr')];sv();applyCSS();refresh();};});
  root.querySelectorAll('[data-attr-key]').forEach(function(inp){inp.onchange=function(){if(!S.selCSS)return;pu();S.attrs[S.selCSS][inp.getAttribute('data-attr-key')]=inp.value;sv();applyCSS();};});
  root.querySelectorAll('[data-pos]').forEach(function(b){b.onclick=function(){S._addPosition=b.getAttribute('data-pos');refresh();};});
  root.querySelectorAll('[data-add-type]').forEach(function(b){b.onclick=function(){addEl(b.getAttribute('data-add-type'),S._addPosition||'after');};});
  root.querySelectorAll('[data-move-up]').forEach(function(b){b.onclick=function(){mvEl(b.getAttribute('data-move-up'),'up');};});
  root.querySelectorAll('[data-move-down]').forEach(function(b){b.onclick=function(){mvEl(b.getAttribute('data-move-down'),'down');};});
  root.querySelectorAll('[data-remove-el]').forEach(function(b){b.onclick=function(){rmEl(b.getAttribute('data-remove-el'));};});
  root.querySelectorAll('[data-select-el]').forEach(function(b){b.onclick=function(){var el=document.querySelector('[data-ve-id="'+b.getAttribute('data-select-el')+'"]');if(el)pick(el);};});
  root.querySelectorAll('[data-ep]').forEach(function(inp){inp.addEventListener('change',function(){var id=inp.getAttribute('data-eid'),key=inp.getAttribute('data-ep'),val=inp.value;if(key==='navLinks'){try{val=JSON.parse(val);}catch(e){toast('Invalid JSON');return;}}if(key==='items'||key==='slideshowUrls'){val=val.split('\n').filter(function(x){return x.trim();});}if(key==='level'||key==='shapeHeight'||key==='slideshowInterval')val=parseInt(val)||0;if(key==='shapeFlip')val=inp.checked;updEl(id,key,val);refresh();});});
  q('#veSave',root).onclick=saveToServer;
  q('#vePull',root).onclick=pullFromServer;
  q('#veExpCSS',root).onclick=function(){var s=document.getElementById(SID);dl('hanstan-overrides.css',s?s.textContent:'','text/css');toast('CSS exported');};
  q('#veExpJSON',root).onclick=function(){dl('hanstan-ve.json',JSON.stringify({ov:S.ov,globals:S.globals,text:S.text,anims:S.anims,responsive:S.responsive,attrs:S.attrs,elements:S.elements},null,2),'application/json');toast('JSON exported');};
  q('#veImp',root).onclick=function(){var inp=mk('input');inp.type='file';inp.accept='.json';inp.onchange=function(){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{pu();var d=JSON.parse(r.result);S.ov=d.ov||{};S.globals=d.globals||S.globals;S.text=d.text||{};S.anims=d.anims||{};S.responsive=d.responsive||{};S.attrs=d.attrs||{};S.elements=d.elements||[];recalcC();sv();rebuildEls();applyCSS();refresh();toast('Imported');}catch(e){toast('Invalid file');}};r.readAsText(f);};inp.click();};
  q('#veResetAll',root).onclick=function(){if(!confirm('Delete ALL overrides and added elements?'))return;pu();S.ov={};S.text={};S.anims={};S.responsive={};S.attrs={};S.elements=[];sv();rebuildEls();applyCSS();cSL();refresh();toast('All cleared');};
  var lr=q('#veLoadRevs',root);if(lr)lr.onclick=function(){loadRevs(function(revs){var c=document.getElementById('veRevisions');if(!c)return;if(!revs.length){c.innerHTML='<div class="veEmptyText">No saved revisions</div>';return;}c.innerHTML=revs.reverse().map(function(r){var d=new Date(r.timestamp);return'<div class="veRevItem"><span>'+d.toLocaleDateString()+' '+d.toLocaleTimeString()+'</span><button class="veBtn veBtn--sm" data-rev="'+esc(r.key)+'">Restore</button></div>';}).join('');c.querySelectorAll('[data-rev]').forEach(function(b){b.onclick=function(){restoreRev(b.getAttribute('data-rev'));};});});};

  // Panel settings
  root.querySelectorAll('[data-pmode]').forEach(function(b){b.onclick=function(){S.panelMode=b.getAttribute('data-pmode');if(S.panelMode==='docked'){S.panelX=null;S.panelY=null;}sv();applyPanelStyle();refresh();};});
  var pw=q('#vePanelW',root);if(pw){pw.oninput=function(){S.panelW=parseInt(pw.value);pw.parentElement.querySelector('.veRV').textContent=pw.value+'px';applyPanelStyle();};pw.onchange=function(){sv();};}
  var pfs=q('#vePanelFS',root);if(pfs){pfs.oninput=function(){S.panelFontSize=parseInt(pfs.value);pfs.parentElement.querySelector('.veRV').textContent=pfs.value+'px';applyPanelStyle();};pfs.onchange=function(){sv();};}
  var pop=q('#vePanelOp',root);if(pop){pop.oninput=function(){S.panelOpacity=parseInt(pop.value)/100;pop.parentElement.querySelector('.veRV').textContent=pop.value+'%';applyPanelStyle();};pop.onchange=function(){sv();};}
  var pac=q('#vePanelAc',root);if(pac)pac.oninput=function(){S.panelAccent=pac.value;var t=q('#vePanelAcT',root);if(t)t.value=pac.value;sv();applyPanelStyle();};
  var pact=q('#vePanelAcT',root);if(pact)pact.onchange=function(){S.panelAccent=pact.value;var c=q('#vePanelAc',root);if(c)c.value=toHex(pact.value);sv();applyPanelStyle();};
  var prst=q('#vePanelReset',root);if(prst)prst.onclick=function(){S.panelMode='docked';S.panelW=340;S.panelFontSize=12;S.panelOpacity=0.97;S.panelAccent='#d8b55b';S.panelX=null;S.panelY=null;sv();applyPanelStyle();refresh();toast('Panel reset');};
  // Drag handling for floating mode
  var dh=q('#veDragHandle',root);if(dh){dh.onmousedown=function(e){if(S.panelMode!=='floating')return;e.preventDefault();S._dragging=true;var r=document.getElementById(PID).getBoundingClientRect();S._dragOff={x:e.clientX-r.left,y:e.clientY-r.top};};}
  document.addEventListener('dblclick',function(e){if(!S.on||isVE(e.target))return;var el=e.target;if(el.children.length===0||(el.children.length===1&&el.children[0].tagName==='BR')){pick(el);startTextEdit(el);}});
}


function applyPanelStyle(){
  var p=document.getElementById(PID);if(!p)return;
  // Width: cap to viewport width so panel always fits visibly even on narrow windows.
  var vw = window.innerWidth || document.documentElement.clientWidth || 800;
  var effectiveW = Math.min(S.panelW || 340, Math.max(260, vw - 16));
  p.style.width = effectiveW + 'px';
  p.style.fontSize = S.panelFontSize + 'px';
  p.style.opacity = S.panelOpacity;
  if(S.panelMode==='floating'){
    // Clamp saved X/Y to viewport so a panel saved when the window was wide
    // doesn't disappear off-screen when the window is narrow.
    var vh = window.innerHeight || document.documentElement.clientHeight || 600;
    var x = (S.panelX==null) ? 100 : S.panelX;
    var y = (S.panelY==null) ? 50  : S.panelY;
    if(x + effectiveW > vw - 8) x = Math.max(8, vw - effectiveW - 8);
    if(x < 8) x = 8;
    if(y < 8) y = 8;
    if(y > vh - 80) y = Math.max(8, vh - 80);
    p.style.position='fixed';p.style.right='auto';
    p.style.top = y+'px'; p.style.left = x+'px';
    p.style.borderRadius='12px';p.style.border='1px solid rgba(216,181,91,0.3)';
    p.style.maxHeight='85vh';p.style.boxShadow='-6px 0 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(216,181,91,0.1)';
  } else {
    p.style.position='fixed';p.style.right='0';p.style.top='0';p.style.left='auto';
    p.style.borderRadius='';p.style.border='';
    p.style.borderLeft='1px solid rgba(216,181,91,0.2)';
    p.style.maxHeight='100vh';p.style.boxShadow='-6px 0 40px rgba(0,0,0,0.6)';
  }
  p.style.setProperty('--ve-accent',S.panelAccent);
  var btns=p.querySelectorAll('.veLogo,.veTab.active,.veSecTitle,.veChip.on,.veBoxInput,.veRV');
  btns.forEach(function(b){b.style.color=S.panelAccent;});
}
// Re-apply on viewport resize so the panel stays visible when window resizes.
window.addEventListener('resize', function(){ if(S.on) applyPanelStyle(); });
document.addEventListener('mousemove',function(e){if(!S._dragging)return;var p=document.getElementById(PID);if(!p)return;S.panelX=e.clientX-S._dragOff.x;S.panelY=e.clientY-S._dragOff.y;p.style.left=S.panelX+'px';p.style.top=S.panelY+'px';});
document.addEventListener('mouseup',function(){if(S._dragging){S._dragging=false;sv();}});
function injectCSS(){var s=mk('style');s.textContent='#'+PID+'{position:fixed;top:0;right:0;z-index:99998;width:340px;max-height:100vh;overflow-y:auto;overflow-x:hidden;background:rgba(14,10,22,0.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-left:1px solid rgba(216,181,91,0.2);color:#ddd0ee;font:12px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:-6px 0 40px rgba(0,0,0,0.6);scrollbar-width:thin;scrollbar-color:rgba(216,181,91,0.25) transparent}#'+PID+'::-webkit-scrollbar{width:5px}#'+PID+'::-webkit-scrollbar-thumb{background:rgba(216,181,91,0.25);border-radius:3px}#'+PID+' *{box-sizing:border-box}.veBar{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(216,181,91,0.2);position:sticky;top:0;background:rgba(14,10,22,0.98);z-index:2}.veBarL,.veBarR{display:flex;align-items:center;gap:4px}.veLogo{color:#d8b55b;cursor:grab;font-weight:800;font-size:14px;letter-spacing:.05em;margin-right:6px}.veBtn{padding:4px 10px;border:1px solid rgba(216,181,91,.25);border-radius:5px;background:rgba(216,181,91,.08);color:#d8b55b;cursor:pointer;font-size:11px;font-weight:500;transition:all .12s;white-space:nowrap}.veBtn:hover{background:rgba(216,181,91,.18)}.veBtn.active{background:rgba(216,181,91,.25);border-color:#d8b55b}.veBtn--sm{padding:4px 7px;font-size:12px}.veBtn--danger{border-color:rgba(255,90,122,.3);background:rgba(255,90,122,.08);color:#ff5a7a}.veBtn--danger:hover{background:rgba(255,90,122,.18)}.veBtn--save{border-color:rgba(80,200,120,.4);background:rgba(80,200,120,.12);color:#50c878;font-weight:600}.veBtn--save:hover{background:rgba(80,200,120,.22)}.veTabs{display:flex;border-bottom:1px solid rgba(216,181,91,.15);position:sticky;top:40px;background:rgba(14,10,22,.98);z-index:1}.veTab{flex:1;padding:8px 2px;background:none;border:none;border-bottom:2px solid transparent;color:#8878a0;font-size:10px;font-weight:600;cursor:pointer;text-transform:uppercase;letter-spacing:.02em}.veTab:hover{color:#b8a8d0}.veTab.active{color:#d8b55b;border-bottom-color:#d8b55b}.veBread{display:flex;align-items:center;flex-wrap:wrap;gap:2px;padding:6px 10px;border-bottom:1px solid rgba(216,181,91,.08);background:rgba(30,20,48,.3);font-size:10px}.veBreadItem{color:#8878a0;cursor:pointer;padding:1px 4px;border-radius:3px}.veBreadItem:hover{background:rgba(216,181,91,.1);color:#d8b55b}.veBreadItem.active{color:#d8b55b;font-weight:600;background:rgba(216,181,91,.12)}.veBreadSep{color:#504068}.veInfo{padding:8px 12px;border-bottom:1px solid rgba(216,181,91,.12);background:rgba(216,181,91,.04)}.veInfoName{font-size:12px;font-weight:600;color:#e8ddf5;margin-bottom:2px}.veInfoSel{font-size:10px;color:#9080a8;font-family:monospace;word-break:break-all;margin-bottom:6px}.veToggle{font-size:11px;color:#b8a8d0;cursor:pointer;display:flex;align-items:center;gap:5px;margin-bottom:4px}.veToggle input{accent-color:#d8b55b}.veResponsive{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.veChip{font-size:10px;padding:3px 8px;border-radius:10px;border:1px solid rgba(216,181,91,.2);cursor:pointer;color:#8878a0;display:flex;align-items:center;gap:3px}.veChip input{accent-color:#d8b55b;width:12px;height:12px}.veChip.on{background:rgba(216,181,91,.12);border-color:#d8b55b;color:#d8b55b}.veBoxModel{padding:12px;border-bottom:1px solid rgba(216,181,91,.12)}.veBoxMargin{position:relative;border:1px dashed rgba(216,181,91,.3);background:rgba(216,181,91,.04);padding:24px 28px;border-radius:4px}.veBoxPadding{position:relative;border:1px dashed rgba(160,128,200,.4);background:rgba(160,128,200,.06);padding:20px 24px;border-radius:3px}.veBoxContent{text-align:center;color:#9080a8;font-size:11px;padding:8px 0;background:rgba(30,20,48,.4);border-radius:3px}.veBoxLabel,.veBoxLabel2{font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}.veBoxLabel{color:rgba(216,181,91,.6)}.veBoxLabel2{color:rgba(160,128,200,.6);position:absolute;top:4px;left:8px}.veBoxInput{position:absolute;background:none;border:none;color:#d8b55b;font-size:11px;width:36px;text-align:center;font-family:monospace}.veBoxInput:focus{outline:1px solid #d8b55b;border-radius:2px}.veBoxT{top:3px;left:50%;transform:translateX(-50%)}.veBoxR{right:3px;top:50%;transform:translateY(-50%)}.veBoxB{bottom:3px;left:50%;transform:translateX(-50%)}.veBoxL{left:3px;top:50%;transform:translateY(-50%)}.veSec{border-bottom:1px solid rgba(216,181,91,.08)}.veSecH{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;cursor:pointer;user-select:none}.veSecH:hover{background:rgba(216,181,91,.04)}.veSecH span:first-child{font-size:11px;font-weight:600;color:#b8a8d0;letter-spacing:.04em;text-transform:uppercase}.veChev{color:#7060a0;font-size:9px;transition:transform .15s}.veSecH.open .veChev{transform:rotate(90deg)}.veSecBody{display:none;padding:4px 12px 10px}.veSecBody.open{display:block}.veSecOpen{padding:8px 12px;border-bottom:1px solid rgba(216,181,91,.08)}.veSecTitle{font-size:11px;font-weight:700;color:#d8b55b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:8px}.veRow{margin-bottom:7px}.veRow label{display:block;font-size:10px;color:#8878a0;margin-bottom:3px;letter-spacing:.03em;text-transform:uppercase}.veColorWrap,.veUnitWrap{display:flex;align-items:center;gap:4px}.veInput,.veSelect{flex:1;padding:5px 7px;background:rgba(30,20,48,.5);border:1px solid rgba(216,181,91,.15);border-radius:5px;color:#e8ddf5;font-size:11px}.veInput:focus,.veSelect:focus{outline:none;border-color:rgba(216,181,91,.5)}.veInput::placeholder{color:#605078;font-size:10px}.veColor{width:30px;height:28px;border:1px solid rgba(216,181,91,.2);border-radius:5px;background:rgba(30,20,48,.5);cursor:pointer;padding:1px;flex-shrink:0}.veColorText{width:80px;flex:1}.veSelect{cursor:pointer}.veReset{background:none;border:none;color:#ff5a7a;cursor:pointer;font-size:14px;padding:0 4px;line-height:1;opacity:.7}.veReset:hover{opacity:1}.veRange{flex:1;accent-color:#d8b55b}.veRV{min-width:38px;text-align:right;color:#d8b55b;font-size:11px;font-variant-numeric:tabular-nums}.veGrad,.veShadow{padding:4px 0}.veGradRow{display:flex;align-items:center;gap:6px;margin-bottom:5px}.veGradRow label{flex-shrink:0;width:55px;font-size:10px;color:#8878a0;text-transform:uppercase}.veGradRow select{flex:1;padding:4px;background:rgba(30,20,48,.5);border:1px solid rgba(216,181,91,.15);border-radius:4px;color:#e8ddf5;font-size:11px}.veTextarea{width:100%;min-height:60px;padding:6px 8px;background:rgba(30,20,48,.5);border:1px solid rgba(216,181,91,.15);border-radius:5px;color:#e8ddf5;font:11px/1.4 monospace;resize:vertical}.veAttrs{padding:4px 0}.veAttrRow{display:flex;gap:4px;margin-bottom:4px;align-items:center}.veAttrK{width:80px;flex:none}.vePalette{display:grid;grid-template-columns:1fr 1fr;gap:6px}.vePaletteItem{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:1px solid rgba(216,181,91,.15);border-radius:8px;background:rgba(30,20,48,.3);cursor:pointer;transition:all .15s}.vePaletteItem:hover{background:rgba(216,181,91,.1);border-color:rgba(216,181,91,.4);transform:translateY(-1px)}.vePaletteIcon{font-size:22px}.vePaletteLabel{font-size:10px;color:#b8a8d0;text-align:center;line-height:1.2}.veAddPos{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}.veHint{font-size:11px;color:#7060a0;font-style:italic;margin-top:4px}.veAddedItem{display:flex;align-items:center;gap:4px;padding:6px 0;border-bottom:1px solid rgba(216,181,91,.06)}.veAddedIcon{font-size:16px;flex-shrink:0}.veAddedLabel{flex:1;font-size:11px;color:#b8a8d0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.veNav{max-height:400px;overflow-y:auto}.veNavItem{padding:4px 8px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;border-left:2px solid transparent}.veNavItem:hover{background:rgba(216,181,91,.06)}.veNavItem.active{border-left-color:#d8b55b;background:rgba(216,181,91,.1)}.veNavItem.added{background:rgba(80,200,120,.06)}.veNavLabel{color:#b8a8d0;font-family:monospace;font-size:10px;flex:1;cursor:pointer}.veNavItem.active .veNavLabel{color:#d8b55b}.veNavDel{background:none;border:none;color:#ff5a7a;cursor:pointer;font-size:14px;opacity:.5;padding:0 4px}.veNavDel:hover{opacity:1}.veRevItem{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(216,181,91,.08);font-size:11px;color:#b8a8d0}.veEmpty{padding:40px 20px;text-align:center}.veEmptyIcon{font-size:48px;margin-bottom:12px}.veEmptyText{color:#b8a8d0;font-size:13px;line-height:1.5}.veActions{padding:8px 10px;display:flex;flex-wrap:wrap;gap:5px;border-top:1px solid rgba(216,181,91,.15);position:sticky;bottom:0;background:rgba(14,10,22,.98);z-index:2}.veToast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(216,181,91,.95);color:#120c1c;padding:7px 18px;border-radius:7px;font-size:12px;font-weight:600;z-index:999999;opacity:0;transition:opacity .3s;pointer-events:none}.veToast.show{opacity:1}.ve-editing{outline:2px solid #d8b55b !important;outline-offset:2px;min-width:20px}[data-ve-added]{position:relative}[data-ve-added]:hover{outline:1px dashed rgba(80,200,120,.4);outline-offset:2px}@media(max-width:480px){#'+PID+'{width:100%;border-left:none;border-top:1px solid rgba(216,181,91,.25);max-height:60vh;bottom:0;top:auto;border-radius:14px 14px 0 0}}@media print{#'+PID+',#'+HID+',#'+SLID+',#veCtx{display:none!important}}';document.head.appendChild(s);}

/* ═══ OmniCSS INTERACTION LAYER — COMPLETE ═══ */
var _preChange=null;
function beginChange(){if(!_preChange)_preChange=snap();}
function endChange(){if(_preChange){S.undos.push(_preChange);S.redos=[];if(S.undos.length>60)S.undos.shift();_preChange=null;}}
/* setProp without undo push — for use during continuous drag */
function setPropLive(p,v){
  if(!S.selCSS)return;
  var targets=S.multiSelCSS.length?S.multiSelCSS:[S.selCSS];
  var k=S.hover?'hover:'+p:p;
  targets.forEach(function(sel){
    if(!S.ov[sel])S.ov[sel]={};
    if(v===''||v==null){delete S.ov[sel][k];if(!Object.keys(S.ov[sel]).length)delete S.ov[sel];}
    else S.ov[sel][k]=v;
  });
  sv();applyCSS();
}
function clearMulti(){S.multiSel=[];S.multiSelCSS=[];document.querySelectorAll('.ve-multi-hl').forEach(function(h){h.remove();});}
function highlightMulti(){
  document.querySelectorAll('.ve-multi-hl').forEach(function(h){h.remove();});
  S.multiSel.forEach(function(el){
    var r=el.getBoundingClientRect();
    var h=mk('div');h.className='ve-multi-hl';
    h.style.cssText='position:fixed;pointer-events:none;z-index:99988;border:2px solid #50c878;background:rgba(80,200,120,0.08);top:'+r.top+'px;left:'+r.left+'px;width:'+r.width+'px;height:'+r.height+'px;';
    document.body.appendChild(h);
  });
  if(S.sel)sSL(S.sel);
}
function copyStyles(){
  if(!S.selCSS)return;
  S.clipboard=S.ov[S.selCSS]?JSON.parse(JSON.stringify(S.ov[S.selCSS])):null;
  toast(S.clipboard?'Styles copied':'No overrides to copy');
}
function pasteStyles(){
  if(!S.clipboard||!S.selCSS)return;
  pu();S.ov[S.selCSS]=JSON.parse(JSON.stringify(S.clipboard));
  sv();applyCSS();refresh();toast('Styles pasted');
}
function selectAllByClass(cls){
  clearMulti();
  var els=document.querySelectorAll('.'+CSS.escape(cls));
  els.forEach(function(el){
    if(isVE(el))return;
    S.multiSel.push(el);
    S.multiSelCSS.push(gSel(el));
  });
  if(S.multiSel.length){S.sel=S.multiSel[0];S.selCSS=S.multiSelCSS[0];}
  highlightMulti();refresh();
  toast('Selected '+S.multiSel.length+' .'+cls+' elements');
}

function showInlineEditor(el,mx,my){
  dismissInlineEditor();
  var cs=getComputedStyle(el);
  var sel=gSel(el);
  var tag=el.tagName.toLowerCase();
  var id=el.id&&el.id.indexOf('ve')!==0?'#'+el.id:'';
  var clsList=el.className&&typeof el.className==='string'?el.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0;}):[];
  var cls=clsList.map(function(c){return'.'+c;}).join('');
  var ie=mk('div');ie.id='veInline';
  ie.style.cssText='position:fixed;z-index:99996;background:rgba(14,10,22,0.97);border:1px solid rgba(216,181,91,0.4);border-radius:10px;min-width:320px;max-width:400px;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#ddd0ee;box-shadow:0 8px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(216,181,91,0.1);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);overflow:hidden;';
  /* shared inline styles */
  var sLbl='font-size:10px;color:#7060a0;text-transform:uppercase;letter-spacing:.03em;margin-bottom:2px;';
  var sInp='padding:4px 6px;background:rgba(30,20,48,0.5);border:1px solid rgba(216,181,91,0.15);border-radius:4px;color:#e8ddf5;font-size:11px;font-family:inherit;';
  var sRow='margin-bottom:6px;';
  var sSlider='flex:1;accent-color:#d8b55b;height:16px;cursor:pointer;';
  var sBtn='background:rgba(216,181,91,0.12);border:1px solid rgba(216,181,91,0.25);color:#d8b55b;border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  var sVal='min-width:42px;text-align:center;color:#d8b55b;font-size:11px;font-variant-numeric:tabular-nums;';
  var sToggle='padding:3px 8px;border:1px solid rgba(216,181,91,0.2);border-radius:4px;background:rgba(30,20,48,0.5);color:#b8a8d0;font-size:10px;cursor:pointer;text-transform:uppercase;letter-spacing:.03em;';
  var sToggleOn='padding:3px 8px;border:1px solid rgba(216,181,91,0.5);border-radius:4px;background:rgba(216,181,91,0.15);color:#d8b55b;font-size:10px;cursor:pointer;text-transform:uppercase;letter-spacing:.03em;font-weight:600;';

  function getOv(prop){return S.ov[sel]&&S.ov[sel][prop]?S.ov[sel][prop]:'';}
  function getCs(prop){return cs[cam(prop)]||'';}
  function curVal(prop){return getOv(prop)||getCs(prop);}
  function numVal(prop){return parseFloat(curVal(prop))||0;}

  var h='<div style="padding:8px 12px;border-bottom:1px solid rgba(216,181,91,0.2);background:rgba(216,181,91,0.06);display:flex;justify-content:space-between;align-items:center;">';
  h+='<span style="color:#d8b55b;font-weight:700;font-family:monospace;font-size:12px;">'+esc(tag+id+cls)+'</span>';
  h+='<div style="display:flex;gap:4px;"><button id="veInlineSample" style="'+sBtn+'" title="Sample color from another element">💧</button><button id="veInlineClose" style="background:none;border:none;color:#7060a0;font-size:16px;cursor:pointer;padding:0 4px;">✕</button></div>';
  h+='</div><div style="padding:10px 12px;" id="veInlineBody">';

  /* ── Color rows — swatch opens custom gradient picker ── */
  function colorRow(prop,label){
    var hex=toHex(curVal(prop));
    return '<div style="'+sRow+'"><label style="'+sLbl+'">'+label+'</label><div style="display:flex;gap:4px;align-items:center;"><div data-ie-swatch="'+prop+'" style="width:28px;height:26px;border:1px solid rgba(216,181,91,0.3);border-radius:4px;background:'+hex+';cursor:pointer;flex-shrink:0;" title="Click to pick color"></div><input type="text" data-ie="'+prop+'" data-ie-type="colortext" value="'+esc(getOv(prop))+'" placeholder="'+esc(hex)+'" style="flex:1;'+sInp+'"></div></div>';
  }
  /* ── Slider rows ── */
  function sliderRow(prop,label,min,max,step,unit){
    var v=numVal(prop);
    return '<div style="'+sRow+'"><label style="'+sLbl+'">'+label+'</label><div style="display:flex;gap:4px;align-items:center;" data-ie-slider="'+prop+'" data-min="'+min+'" data-max="'+max+'" data-step="'+step+'" data-unit="'+(unit||'')+'"><button data-ie-minus="'+prop+'" style="'+sBtn+'">−</button><input type="range" data-ie="'+prop+'" data-ie-type="slider" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'" style="'+sSlider+'"><button data-ie-plus="'+prop+'" style="'+sBtn+'">+</button><span data-ie-val="'+prop+'" style="'+sVal+'">'+v+(unit||'')+'</span></div></div>';
  }
  /* ── Toggle rows ── */
  function toggleRow(prop,label,options){
    var cur=curVal(prop).trim().toLowerCase();
    var h2='<div style="'+sRow+'"><label style="'+sLbl+'">'+label+'</label><div style="display:flex;gap:3px;flex-wrap:wrap;">';
    options.forEach(function(opt){
      var active=cur===opt[0]||(opt[0]===''&&!getOv(prop));
      h2+='<button data-ie-toggle="'+prop+'" data-ie-togval="'+esc(opt[0])+'" style="'+(active?sToggleOn:sToggle)+'">'+opt[1]+'</button>';
    });
    h2+='</div></div>';return h2;
  }
  /* ── Text rows ── */
  function textRow(prop,label){
    return '<div style="'+sRow+'"><label style="'+sLbl+'">'+label+'</label><input type="text" data-ie="'+prop+'" data-ie-type="text" value="'+esc(getOv(prop))+'" placeholder="'+esc(getCs(prop).substring(0,40))+'" style="width:100%;'+sInp+'"></div>';
  }

  h+=colorRow('color','Color');
  h+=colorRow('background-color','Background');
  h+=sliderRow('font-size','Font Size',8,72,1,'px');
  h+=sliderRow('font-weight','Font Weight',100,900,100,'');
  h+=sliderRow('opacity','Opacity',0,1,0.05,'');
  h+=sliderRow('border-radius','Border Radius',0,50,1,'px');
  h+=sliderRow('letter-spacing','Letter Spacing',-2,8,0.5,'px');
  h+=textRow('padding','Padding');
  h+=textRow('margin','Margin');
  h+=textRow('box-shadow','Box Shadow');
  h+=textRow('text-shadow','Text Shadow');
  h+=textRow('border','Border');
  h+=toggleRow('font-style','Font Style',[['normal','Normal'],['italic','Italic']]);
  h+=toggleRow('text-decoration','Text Decoration',[['none','None'],['line-through','Strike'],['underline','Underline']]);
  h+=toggleRow('text-transform','Text Transform',[['none','None'],['uppercase','UPPER'],['lowercase','lower'],['capitalize','Title']]);

  h+='</div>';
  /* ── Action buttons ── */
  h+='<div style="padding:8px 12px;border-top:1px solid rgba(216,181,91,0.15);display:flex;flex-wrap:wrap;gap:4px;">';
  h+='<button class="veBtn veBtn--save" data-ie-act="apply" style="font-size:11px;">✓ Apply</button>';
  h+='<button class="veBtn" data-ie-act="discard" style="font-size:11px;">✕ Discard</button>';
  clsList.forEach(function(c){
    var count=0;try{count=document.querySelectorAll('.'+CSS.escape(c)).length;}catch(ex){}
    if(count>1)h+='<button class="veBtn" data-ie-act="class:'+esc(c)+'" style="font-size:10px;">⊕ .'+esc(c)+' ('+count+')</button>';
  });
  if(S.multiSel.length>0) h+='<button class="veBtn" data-ie-act="multi" style="font-size:10px;">⊕ All selected ('+S.multiSel.length+')</button>';
  h+='</div>';
  ie.innerHTML=h;
  document.body.appendChild(ie);
  /* Position: try to show full editor near cursor. If taller than viewport, pin to top and scroll. */
  var vh=window.innerHeight,ieh=ie.offsetHeight;
  var tx=mx+8,ty=my+8;
  if(tx+400>window.innerWidth)tx=mx-410;
  if(tx<4)tx=4;
  if(ieh>vh-16){ty=8;ie.style.maxHeight=(vh-16)+'px';ie.style.overflowY='auto';}
  else if(ty+ieh>vh)ty=vh-ieh-8;
  if(ty<8)ty=8;
  ie.style.left=tx+'px';ie.style.top=ty+'px';
  beginChange();
  var _preOv=S.ov[sel]?JSON.parse(JSON.stringify(S.ov[sel])):{};

  /* ── Live update helper ── */
  function liveSet(prop,val){
    if(!S.ov[sel])S.ov[sel]={};
    if(val!==''&&val!=null)S.ov[sel][prop]=val;else delete S.ov[sel][prop];
    sv();applyCSS();
  }
  /* ── Wire color swatches — click opens custom gradient picker ── */
  ie.querySelectorAll('[data-ie-swatch]').forEach(function(sw){
    var prop=sw.getAttribute('data-ie-swatch');
    sw.onclick=function(e){
      var currentColor=curVal(prop);
      var rect=sw.getBoundingClientRect();
      showColorPicker(rect.right+8,rect.top,prop,sel,currentColor,function(confirmed){
        /* Update swatch and text after confirm */
        sw.style.background=confirmed||'';
        var txt=ie.querySelector('[data-ie-type="colortext"][data-ie="'+prop+'"]');
        if(txt)txt.value=confirmed||'';
      });
    };
  });
  ie.querySelectorAll('[data-ie-type="colortext"]').forEach(function(inp){
    var prop=inp.getAttribute('data-ie');
    inp.addEventListener('change',function(){
      liveSet(prop,inp.value);
      var sw=ie.querySelector('[data-ie-swatch="'+prop+'"]');if(sw&&inp.value)sw.style.background=inp.value;
    });
  });
  /* ── Wire sliders with +/- and scroll wheel ── */
  ie.querySelectorAll('[data-ie-type="slider"]').forEach(function(inp){
    var prop=inp.getAttribute('data-ie');
    var wrap=inp.closest('[data-ie-slider]');
    var unit=wrap?wrap.getAttribute('data-unit'):'';
    var step=parseFloat(wrap?wrap.getAttribute('data-step'):1);
    var min=parseFloat(wrap?wrap.getAttribute('data-min'):0);
    var max=parseFloat(wrap?wrap.getAttribute('data-max'):100);
    var valSpan=ie.querySelector('[data-ie-val="'+prop+'"]');
    function update(v){
      v=Math.max(min,Math.min(max,Math.round(v/step)*step));
      if(step<1)v=parseFloat(v.toFixed(2));
      inp.value=v;if(valSpan)valSpan.textContent=v+unit;
      liveSet(prop,v+unit);
    }
    inp.addEventListener('input',function(){update(parseFloat(inp.value));});
    /* Scroll wheel on the entire slider row */
    if(wrap)wrap.addEventListener('wheel',function(e){e.preventDefault();update(parseFloat(inp.value)+(e.deltaY<0?step:-step));},{passive:false});
    /* +/- buttons */
    var minus=ie.querySelector('[data-ie-minus="'+prop+'"]');
    var plus=ie.querySelector('[data-ie-plus="'+prop+'"]');
    if(minus)minus.onclick=function(){update(parseFloat(inp.value)-step);};
    if(plus)plus.onclick=function(){update(parseFloat(inp.value)+step);};
  });
  /* ── Wire toggles ── */
  ie.querySelectorAll('[data-ie-toggle]').forEach(function(btn){
    btn.onclick=function(){
      var prop=btn.getAttribute('data-ie-toggle'),val=btn.getAttribute('data-ie-togval');
      liveSet(prop,val||'');
      /* Update toggle button styles */
      ie.querySelectorAll('[data-ie-toggle="'+prop+'"]').forEach(function(b){
        b.style.cssText=(b.getAttribute('data-ie-togval')===val?sToggleOn:sToggle);
      });
    };
  });
  /* ── Wire text inputs ── */
  ie.querySelectorAll('[data-ie-type="text"]').forEach(function(inp){
    var prop=inp.getAttribute('data-ie');
    inp.addEventListener('change',function(){liveSet(prop,inp.value);});
  });
  /* ── Scroll wheel on text inputs: nudge numeric values ── */
  ie.querySelectorAll('[data-ie-type="text"]').forEach(function(inp){
    inp.addEventListener('wheel',function(e){
      e.preventDefault();
      var v=inp.value||inp.placeholder;
      var m=v.match(/([-\d.]+)(px|em|rem|%|s)?/);
      if(m){var n=parseFloat(m[1])+(e.deltaY<0?1:-1);inp.value=n+(m[2]||'');inp.dispatchEvent(new Event('change'));}
    },{passive:false});
  });

  /* ── Color sampling (eyedropper) ── */
  var sampleBtn=ie.querySelector('#veInlineSample');
  if(sampleBtn)sampleBtn.onclick=function(){
    toast('Click any element to sample its color');
    S._sampling=true;S._sampleSel=sel;
    dismissInlineEditor();
    document.addEventListener('click',function sampler(e){
      if(isVE(e.target)){S._sampling=false;document.removeEventListener('click',sampler,true);return;}
      e.preventDefault();e.stopPropagation();
      var scs=getComputedStyle(e.target);
      var sampled=scs.color;
      if(!S.ov[S._sampleSel])S.ov[S._sampleSel]={};
      S.ov[S._sampleSel]['color']=sampled;
      sv();applyCSS();
      S._sampling=false;
      document.removeEventListener('click',sampler,true);
      toast('Sampled '+sampled);
    },true);
  };

  /* ── Close / apply / discard ── */
  ie.querySelector('#veInlineClose').onclick=function(){
    if(Object.keys(_preOv).length)S.ov[sel]=_preOv;else delete S.ov[sel];
    _preChange=null;sv();applyCSS();dismissInlineEditor();
  };
  ie.querySelectorAll('[data-ie-act]').forEach(function(b){
    b.onclick=function(){
      var act=b.getAttribute('data-ie-act');
      if(act==='apply'){endChange();dismissInlineEditor();refresh();toast('Applied');}
      else if(act==='discard'){
        if(Object.keys(_preOv).length)S.ov[sel]=_preOv;else delete S.ov[sel];
        _preChange=null;sv();applyCSS();dismissInlineEditor();refresh();toast('Discarded');
      } else if(act.indexOf('class:')===0){
        var c=act.slice(6),current=S.ov[sel]?JSON.parse(JSON.stringify(S.ov[sel])):{};
        try{document.querySelectorAll('.'+CSS.escape(c)).forEach(function(el2){if(!isVE(el2))S.ov[gSel(el2)]=JSON.parse(JSON.stringify(current));});}catch(ex){}
        endChange();sv();applyCSS();dismissInlineEditor();refresh();toast('Applied to all .'+c);
      } else if(act==='multi'){
        var current2=S.ov[sel]?JSON.parse(JSON.stringify(S.ov[sel])):{};
        S.multiSelCSS.forEach(function(s2){S.ov[s2]=JSON.parse(JSON.stringify(current2));});
        endChange();sv();applyCSS();dismissInlineEditor();refresh();toast('Applied to '+S.multiSel.length+' selected');
      }
    };
  });
  /* Click outside to discard */
  setTimeout(function(){
    document.addEventListener('mousedown',function handler(e){
      if($('veInline')&&!$('veInline').contains(e.target)&&!isVE(e.target)){
        if(Object.keys(_preOv).length)S.ov[sel]=_preOv;else delete S.ov[sel];
        _preChange=null;sv();applyCSS();dismissInlineEditor();
        document.removeEventListener('mousedown',handler,true);
      }
    },true);
  },100);
}
function dismissInlineEditor(){var ie=$('veInline');if(ie)ie.remove();}

/* ══════════════════════════════════════════
   DRAG-TO-RESIZE — hover element edges to resize
   Like resizing a window or spreadsheet column.
   Edges adjust padding. Corners resize both axes.
   ══════════════════════════════════════════ */
var _resize={active:false,edge:null,startX:0,startY:0,startVals:{},el:null,sel:null};
var EDGE_ZONE=8;

function detectEdge(el,mx,my){
  if(!el)return null;
  var r=el.getBoundingClientRect();
  var nearT=Math.abs(my-r.top)<EDGE_ZONE;
  var nearB=Math.abs(my-r.bottom)<EDGE_ZONE;
  var nearL=Math.abs(mx-r.left)<EDGE_ZONE;
  var nearR=Math.abs(mx-r.right)<EDGE_ZONE;
  var inX=mx>=r.left-EDGE_ZONE&&mx<=r.right+EDGE_ZONE;
  var inY=my>=r.top-EDGE_ZONE&&my<=r.bottom+EDGE_ZONE;
  if(nearT&&nearL&&inX&&inY)return'nw';
  if(nearT&&nearR&&inX&&inY)return'ne';
  if(nearB&&nearL&&inX&&inY)return'sw';
  if(nearB&&nearR&&inX&&inY)return'se';
  if(nearT&&inX)return'n';
  if(nearB&&inX)return's';
  if(nearL&&inY)return'w';
  if(nearR&&inY)return'e';
  return null;
}
var EDGE_CURSORS={n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize',nw:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',se:'nwse-resize'};

/* Show resize cursor when hovering near selected element edges */
document.addEventListener('mousemove',function(e){
  if(_resize.active||!S.sel||S.on===false||$('veInline')||$('veCtx'))return;
  if(isVE(e.target))return;
  var edge=detectEdge(S.sel,e.clientX,e.clientY);
  if(edge){
    document.body.style.cursor=EDGE_CURSORS[edge];
    S._nearEdge=edge;
  } else if(S._nearEdge){
    document.body.style.cursor='';
    S._nearEdge=null;
  }
},true);

/* Start resize on mousedown near edge. Plain=padding, Shift=margin. Alt=alt+scroll takes priority. */
document.addEventListener('mousedown',function(e){
  if(!S._nearEdge||!S.sel||e.button!==0||e.altKey)return;
  e.preventDefault();e.stopPropagation();
  var cs=getComputedStyle(S.sel);
  var useMargin=e.shiftKey;
  var edge=S._nearEdge;
  _resize.active=true;
  _resize.edge=edge;
  _resize.startX=e.clientX;
  _resize.startY=e.clientY;
  _resize.el=S.sel;
  _resize.sel=gSel(S.sel);
  _resize.useMargin=useMargin;
  /* Build prop list based on modifier */
  var prefix=useMargin?'margin':'padding';
  var MAP={n:prefix+'-top',s:prefix+'-bottom',w:prefix+'-left',e:prefix+'-right'};
  var props;
  if(edge.length===2){props=[MAP[edge[0]],MAP[edge[1]]];}
  else{props=[MAP[edge]];}
  _resize.props=props;
  _resize.startVals={};
  props.forEach(function(p){_resize.startVals[p]=parseInt(cs[cam(p)])||0;});
  beginChange();
  toast((useMargin?'Margin':'Padding')+' drag');
},true);

/* Resize during drag */
document.addEventListener('mousemove',function(e){
  if(!_resize.active)return;
  e.preventDefault();
  var dx=e.clientX-_resize.startX;
  var dy=e.clientY-_resize.startY;
  var sel=_resize.sel;
  if(!S.ov[sel])S.ov[sel]={};
  _resize.props.forEach(function(p){
    var delta=0;
    if(p.indexOf('top')!==-1)delta=-dy;
    else if(p.indexOf('bottom')!==-1)delta=dy;
    else if(p.indexOf('left')!==-1)delta=-dx;
    else if(p.indexOf('right')!==-1)delta=dx;
    var nv=Math.max(0,_resize.startVals[p]+delta);
    S.ov[sel][p]=nv+'px';
  });
  sv();applyCSS();
  if(S.sel)sSL(S.sel);
  showSpacing(S.sel);
});

/* End resize */
document.addEventListener('mouseup',function(e){
  if(!_resize.active)return;
  _resize.active=false;
  document.body.style.cursor='';
  S._nearEdge=null;
  endChange();
  refresh();
  toast('Resized');
});

/* ══════════════════════════════════════════
   ALT+SCROLL — universal numeric property adjuster
   Alt+click any element → smart-detects the most relevant property.
   Scroll adjusts it live. Shift+scroll cycles to next candidate.
   Release Alt → scope chooser (apply / parent / class).
   ══════════════════════════════════════════ */
var _altScroll={active:false,el:null,sel:null,candidates:[],idx:0,startVals:{},classes:[],parentSel:null};

/* Property definitions: [cssProperty, label, min, max, step, unit, detectFn] */
var ALT_PROPS=[
  ['font-size','Font Size',6,120,1,'px',function(cs){return true;}],
  ['border-radius','Radius',0,100,1,'px',function(cs){return parseFloat(cs.borderRadius)>0;}],
  ['opacity','Opacity',0,1,0.05,'',function(cs){return parseFloat(cs.opacity)<1;}],
  ['padding','Padding',0,80,1,'px',function(cs){return parseFloat(cs.paddingTop)>0||parseFloat(cs.paddingLeft)>0;}],
  ['margin','Margin',-40,80,1,'px',function(cs){return parseFloat(cs.marginTop)>0||parseFloat(cs.marginLeft)>0;}],
  ['letter-spacing','Spacing',-2,12,0.5,'px',function(cs){return parseFloat(cs.letterSpacing)!==0&&cs.letterSpacing!=='normal';}],
  ['line-height','Line Height',0.8,3,0.05,'',function(cs){return true;}],
  ['border-width','Border',0,20,1,'px',function(cs){return parseFloat(cs.borderWidth)>0;}],
  ['gap','Gap',0,60,1,'px',function(cs){return cs.display==='flex'||cs.display==='grid';}],
  ['font-weight','Weight',100,900,100,'',function(cs){return true;}],
];

function buildCandidates(el){
  var cs=getComputedStyle(el);
  var detected=[],fallback=[];
  ALT_PROPS.forEach(function(p){
    var obj={prop:p[0],label:p[1],min:p[2],max:p[3],step:p[4],unit:p[5],val:parseFloat(cs[cam(p[0])])||0};
    if(p[6](cs))detected.push(obj);else fallback.push(obj);
  });
  /* Smart ordering: put the most relevant property first */
  var tag=el.tagName.toLowerCase();
  var isText=el.childNodes.length>0&&el.childNodes[0].nodeType===3;
  var isPill=parseFloat(cs.borderRadius)>20;
  var isFlex=cs.display==='flex'||cs.display==='grid';
  /* Reorder detected: text → font-size first, pill → border-radius first, flex → gap first */
  if(isPill)detected.sort(function(a,b){return a.prop==='border-radius'?-1:b.prop==='border-radius'?1:0;});
  else if(isFlex)detected.sort(function(a,b){return a.prop==='gap'?-1:b.prop==='gap'?1:0;});
  else if(isText||tag==='span'||tag==='p'||tag==='h1'||tag==='h2'||tag==='h3'||tag==='h4'||tag==='em'||tag==='strong'||tag==='a'||tag==='button'||tag==='label')
    detected.sort(function(a,b){return a.prop==='font-size'?-1:b.prop==='font-size'?1:0;});
  return detected.concat(fallback);
}

document.addEventListener('mousedown',function(e){
  if(!e.altKey||e.button!==0||!S.on)return;
  if(isVE(e.target))return;
  if($('veInline')||$('veCpk')||$('veFontScope'))return; /* don't start over open UI */
  e.preventDefault();e.stopPropagation();
  var el=e.target;
  var cs=getComputedStyle(el);
  _altScroll.el=el;
  _altScroll.sel=gSel(el);
  _altScroll.candidates=buildCandidates(el);
  _altScroll.idx=0;
  _altScroll.startVals={};
  _altScroll.candidates.forEach(function(c){c.startVal=c.val;_altScroll.startVals[c.prop]=c.val;});
  _altScroll.classes=el.className&&typeof el.className==='string'?el.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0;}):[];
  _altScroll.parentSel=el.parentElement?gSel(el.parentElement):null;
  _altScroll.active=true;
  pick(el);beginChange();
  el.style.outline='2px solid #d8b55b';el.style.outlineOffset='2px';
  var cur=_altScroll.candidates[0];
  toast(cur.label+': '+cur.val+(cur.unit||'')+' · Shift+scroll=cycle property');
},true);

document.addEventListener('wheel',function(e){
  if(!_altScroll.active||!e.altKey)return;
  e.preventDefault();
  if(e.shiftKey){
    /* Shift+scroll = cycle candidate property */
    _altScroll.idx=(_altScroll.idx+(e.deltaY<0?-1:1)+_altScroll.candidates.length)%_altScroll.candidates.length;
    var cur=_altScroll.candidates[_altScroll.idx];
    toast('→ '+cur.label+': '+cur.val+(cur.unit||''));
    return;
  }
  var cur=_altScroll.candidates[_altScroll.idx];
  var delta=e.deltaY<0?cur.step:-cur.step;
  cur.val=Math.max(cur.min,Math.min(cur.max,cur.val+delta));
  if(cur.step<1)cur.val=parseFloat(cur.val.toFixed(2));
  else cur.val=Math.round(cur.val);
  if(!S.ov[_altScroll.sel])S.ov[_altScroll.sel]={};
  S.ov[_altScroll.sel][cur.prop]=cur.val+(cur.unit||'');
  sv();applyCSS();
  toast(cur.label+': '+cur.val+(cur.unit||''));
},{passive:false,capture:true});

document.addEventListener('keyup',function(e){
  if(e.key!=='Alt'||!_altScroll.active)return;
  _altScroll.active=false;
  if(_altScroll.el){_altScroll.el.style.outline='';_altScroll.el.style.outlineOffset='';}
  /* Check if anything actually changed */
  var changed=[];
  _altScroll.candidates.forEach(function(c){
    if(Math.abs(c.val-c.startVal)>0.01)changed.push(c);
  });
  if(!changed.length){_preChange=null;/* Restore any set overrides */
    changed=_altScroll.candidates;changed.forEach(function(c){
      if(S.ov[_altScroll.sel])delete S.ov[_altScroll.sel][c.prop];
    });sv();applyCSS();return;
  }
  showScopeBar(_altScroll.el,_altScroll.sel,changed,_altScroll.classes,_altScroll.parentSel);
});

/* ── Generalized scope chooser bar ── */
function showScopeBar(el,sel,changedProps,classes,parentSel){
  dismissFontScope();
  var r=el.getBoundingClientRect();
  var bar=mk('div');bar.id='veFontScope';
  bar.style.cssText='position:fixed;z-index:99997;background:rgba(14,10,22,0.97);border:1px solid rgba(216,181,91,0.4);border-radius:8px;padding:8px 12px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#ddd0ee;box-shadow:0 6px 30px rgba(0,0,0,0.5);backdrop-filter:blur(16px);';
  var summary=changedProps.map(function(c){return c.label+': '+c.val+(c.unit||'');}).join(', ');
  var h='<span style="color:#d8b55b;font-weight:700;font-size:11px;margin-right:8px;">'+esc(summary)+'</span>';
  h+='<button class="veBtn veBtn--save" data-fs-act="apply" style="font-size:11px;">✓ Apply</button>';
  if(parentSel){
    var tag=el.tagName.toLowerCase();
    var sibCount=0;try{sibCount=document.querySelectorAll(parentSel+' > '+tag).length;}catch(ex){}
    if(sibCount>1)h+='<button class="veBtn" data-fs-act="parent" style="font-size:10px;">↳ In parent ('+sibCount+')</button>';
  }
  classes.forEach(function(c){
    var count=0;try{count=document.querySelectorAll('.'+CSS.escape(c)).length;}catch(ex){}
    if(count>1)h+='<button class="veBtn" data-fs-act="class:'+esc(c)+'" style="font-size:10px;">⊕ .'+esc(c)+' ('+count+')</button>';
  });
  h+='<button class="veBtn veBtn--danger" data-fs-act="discard" style="font-size:11px;">✕</button>';
  bar.innerHTML=h;
  document.body.appendChild(bar);
  var bx=r.left,by=r.bottom+6;
  if(by+bar.offsetHeight>window.innerHeight)by=r.top-bar.offsetHeight-6;
  if(bx+bar.offsetWidth>window.innerWidth)bx=window.innerWidth-bar.offsetWidth-8;
  if(bx<4)bx=4;
  bar.style.left=bx+'px';bar.style.top=by+'px';

  bar.querySelectorAll('[data-fs-act]').forEach(function(btn){
    btn.onclick=function(){
      var act=btn.getAttribute('data-fs-act');
      if(act==='apply'){
        endChange();dismissFontScope();refresh();toast('Applied');
      } else if(act==='discard'){
        changedProps.forEach(function(c){if(S.ov[sel])delete S.ov[sel][c.prop];});
        if(S.ov[sel]&&!Object.keys(S.ov[sel]).length)delete S.ov[sel];
        _preChange=null;sv();applyCSS();dismissFontScope();refresh();toast('Discarded');
      } else if(act==='parent'){
        var tag2=el.tagName.toLowerCase();
        var vals={};changedProps.forEach(function(c){vals[c.prop]=c.val+(c.unit||'');});
        try{document.querySelectorAll(parentSel+' > '+tag2).forEach(function(sib){
          if(isVE(sib))return;var ss=gSel(sib);if(!S.ov[ss])S.ov[ss]={};
          for(var p in vals)S.ov[ss][p]=vals[p];
        });}catch(ex){}
        endChange();sv();applyCSS();dismissFontScope();refresh();toast('Applied to siblings');
      } else if(act.indexOf('class:')===0){
        var c2=act.slice(6);
        var vals2={};changedProps.forEach(function(c){vals2[c.prop]=c.val+(c.unit||'');});
        try{document.querySelectorAll('.'+CSS.escape(c2)).forEach(function(el2){
          if(isVE(el2))return;var ss=gSel(el2);if(!S.ov[ss])S.ov[ss]={};
          for(var p in vals2)S.ov[ss][p]=vals2[p];
        });}catch(ex){}
        endChange();sv();applyCSS();dismissFontScope();refresh();toast('Applied to all .'+c2);
      }
    };
  });
  setTimeout(function(){
    document.addEventListener('mousedown',function handler(e2){
      if($('veFontScope')&&!$('veFontScope').contains(e2.target)){
        changedProps.forEach(function(c){if(S.ov[sel])delete S.ov[sel][c.prop];});
        if(S.ov[sel]&&!Object.keys(S.ov[sel]).length)delete S.ov[sel];
        _preChange=null;sv();applyCSS();dismissFontScope();
        document.removeEventListener('mousedown',handler,true);
      }
    },true);
  },100);
}
function dismissFontScope(){var b=$('veFontScope');if(b)b.remove();}

/* ══════════════════════════════════════════
   CUSTOM COLOR PICKER — gradient square at cursor
   Long-click color swatch → gradient appears.
   Hover inside = live preview. Click = confirm.
   Scroll = hue. Alt+scroll = alpha.
   ══════════════════════════════════════════ */
var _cpk={active:false,hue:0,alpha:1,prop:'',sel:'',preVal:'',canvas:null,container:null,onConfirm:null};
var CPK_SIZE=180;

function hsvToRgb(h,s,v){
  var i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);
  var r,g,b;
  switch(i%6){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;case 5:r=v;g=p;b=q;break;}
  return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
}
function rgbToHsv(r,g,b){
  r/=255;g/=255;b/=255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  var h=0,s=mx===0?0:d/mx,v=mx;
  if(d!==0){switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
  return [h,s,v];
}
function parseColor(c){
  var d=document.createElement('div');d.style.color=c;document.body.appendChild(d);
  var cs=getComputedStyle(d).color;document.body.removeChild(d);
  var m=cs.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(m)return [parseInt(m[1]),parseInt(m[2]),parseInt(m[3])];
  return [0,0,0];
}

function drawGradient(canvas,hue){
  var ctx=canvas.getContext('2d');
  var w=canvas.width,h=canvas.height;
  var imgData=ctx.createImageData(w,h);
  for(var y=0;y<h;y++){
    for(var x=0;x<w;x++){
      var s=x/w,v=1-y/h;
      var rgb=hsvToRgb(hue,s,v);
      var i=(y*w+x)*4;
      imgData.data[i]=rgb[0];imgData.data[i+1]=rgb[1];imgData.data[i+2]=rgb[2];imgData.data[i+3]=255;
    }
  }
  ctx.putImageData(imgData,0,0);
}

function showColorPicker(mx,my,prop,sel,currentColor,onConfirm){
  dismissColorPicker();
  var rgb=parseColor(currentColor);
  var hsv=rgbToHsv(rgb[0],rgb[1],rgb[2]);
  _cpk.hue=hsv[0];_cpk.alpha=1;_cpk.prop=prop;_cpk.sel=sel;
  _cpk.preVal=S.ov[sel]&&S.ov[sel][prop]?S.ov[sel][prop]:'';
  _cpk.onConfirm=onConfirm;_cpk.active=true;

  var c=mk('div');c.id='veCpk';_cpk.container=c;
  c.style.cssText='position:fixed;z-index:99998;border-radius:10px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(216,181,91,0.3);';

  var cvs=document.createElement('canvas');
  cvs.width=CPK_SIZE;cvs.height=CPK_SIZE;
  cvs.style.cssText='display:block;cursor:crosshair;border-radius:10px;';
  _cpk.canvas=cvs;
  drawGradient(cvs,_cpk.hue);
  c.appendChild(cvs);

  /* Hue indicator bar at bottom */
  var hueBar=mk('div');hueBar.id='veCpkHue';
  hueBar.style.cssText='height:12px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);position:relative;';
  var hueMarker=mk('div');hueMarker.style.cssText='position:absolute;top:0;bottom:0;width:3px;background:#fff;border-radius:1px;box-shadow:0 0 3px rgba(0,0,0,0.5);pointer-events:none;left:'+(_cpk.hue*100)+'%;';
  hueBar.appendChild(hueMarker);
  c.appendChild(hueBar);

  /* Alpha indicator */
  var alphaLbl=mk('div');alphaLbl.id='veCpkAlpha';
  alphaLbl.style.cssText='text-align:center;font:10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#d8b55b;padding:3px 0;background:rgba(14,10,22,0.95);';
  alphaLbl.textContent='α 100%  ·  scroll=hue  ·  alt+scroll=alpha';
  c.appendChild(alphaLbl);

  document.body.appendChild(c);
  /* Position near cursor but not obscuring the target element */
  var tx=mx+12,ty=my+12;
  if(tx+CPK_SIZE+4>window.innerWidth)tx=mx-CPK_SIZE-12;
  if(ty+CPK_SIZE+28>window.innerHeight)ty=my-CPK_SIZE-28;
  if(tx<4)tx=4;if(ty<4)ty=4;
  c.style.left=tx+'px';c.style.top=ty+'px';

  beginChange();

  /* Mousemove inside canvas = live preview */
  cvs.addEventListener('mousemove',function(e2){
    var rect=cvs.getBoundingClientRect();
    var sx=(e2.clientX-rect.left)/rect.width;
    var sy=(e2.clientY-rect.top)/rect.height;
    sx=Math.max(0,Math.min(1,sx));sy=Math.max(0,Math.min(1,sy));
    var rgb2=hsvToRgb(_cpk.hue,sx,1-sy);
    var colorStr=_cpk.alpha<1?'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+','+_cpk.alpha.toFixed(2)+')':'rgb('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+')';
    if(!S.ov[_cpk.sel])S.ov[_cpk.sel]={};
    S.ov[_cpk.sel][_cpk.prop]=colorStr;
    sv();applyCSS();
  });

  /* Click inside canvas = confirm */
  cvs.addEventListener('click',function(e2){
    e2.stopPropagation();
    endChange();
    _cpk.active=false;
    dismissColorPicker();
    if(_cpk.onConfirm)_cpk.onConfirm(S.ov[_cpk.sel]?S.ov[_cpk.sel][_cpk.prop]:'');
    toast('Color confirmed');
  });

  /* Scroll = hue, Alt+scroll = alpha */
  cvs.addEventListener('wheel',function(e2){
    e2.preventDefault();
    if(e2.altKey){
      _cpk.alpha=Math.max(0,Math.min(1,_cpk.alpha+(e2.deltaY<0?0.05:-0.05)));
      _cpk.alpha=Math.round(_cpk.alpha*100)/100;
      var al=$('veCpkAlpha');if(al)al.textContent='α '+Math.round(_cpk.alpha*100)+'%';
    } else {
      _cpk.hue=(_cpk.hue+(e2.deltaY<0?0.02:-0.02)+1)%1;
      drawGradient(cvs,_cpk.hue);
      /* Update hue marker */
      var marker=c.querySelector('#veCpkHue > div');
      if(marker)marker.style.left=(_cpk.hue*100)+'%';
    }
  },{passive:false});

  /* Click outside or Escape = cancel */
  setTimeout(function(){
    document.addEventListener('mousedown',function handler(e2){
      if(!$('veCpk'))return document.removeEventListener('mousedown',handler,true);
      if(!$('veCpk').contains(e2.target)){
        /* Restore original */
        if(_cpk.preVal){if(!S.ov[_cpk.sel])S.ov[_cpk.sel]={};S.ov[_cpk.sel][_cpk.prop]=_cpk.preVal;}
        else{if(S.ov[_cpk.sel])delete S.ov[_cpk.sel][_cpk.prop];}
        _preChange=null;sv();applyCSS();
        _cpk.active=false;dismissColorPicker();
        document.removeEventListener('mousedown',handler,true);
      }
    },true);
  },100);
  document.addEventListener('keydown',function escH(e2){
    if(e2.key==='Escape'&&_cpk.active){
      if(_cpk.preVal){if(!S.ov[_cpk.sel])S.ov[_cpk.sel]={};S.ov[_cpk.sel][_cpk.prop]=_cpk.preVal;}
      else{if(S.ov[_cpk.sel])delete S.ov[_cpk.sel][_cpk.prop];}
      _preChange=null;sv();applyCSS();
      _cpk.active=false;dismissColorPicker();
      document.removeEventListener('keydown',escH);
    }
  });
}
function dismissColorPicker(){var c=$('veCpk');if(c)c.remove();_cpk.canvas=null;_cpk.container=null;}

/* Panel minimize/expand */
function toggleMini(mini){
  var root=$(PID);if(!root)return;
  if(mini){
    /* Hide all panel content, show mini tab */
    Array.from(root.children).forEach(function(c){c.style.display='none';});
    var tab=root.querySelector('.veMiniTab');
    if(!tab){tab=mk('div');tab.className='veMiniTab';tab.textContent='✦ VE';tab.style.cssText='display:flex;width:36px;height:100%;align-items:center;justify-content:center;cursor:pointer;color:#d8b55b;font-size:14px;font-weight:800;writing-mode:vertical-rl;letter-spacing:0.1em;';tab.onclick=function(){toggleMini(false);};root.appendChild(tab);}
    tab.style.display='flex';
    root.style.width='36px';root.style.minWidth='36px';root.style.overflow='hidden';
  } else {
    Array.from(root.children).forEach(function(c){c.style.display='';});
    var tab2=root.querySelector('.veMiniTab');if(tab2)tab2.style.display='none';
    root.style.width=S.panelW+'px';root.style.minWidth='';root.style.overflow='';
    applyPanelStyle();
  }
}

/* ══════════════════════════════════════════
   CHECKPOINTS — named snapshots with rapid switching
   ══════════════════════════════════════════ */
function initCheckpoints(){_checkpoints[0].state=JSON.stringify({ov:{},globals:{colors:{},fonts:{body:'',display:''}},tokens:{},text:{},anims:{},responsive:{},attrs:{},elements:[]});}
function previewCheckpoint(idx){
  if(!_checkpoints[idx])return;
  var d=JSON.parse(_checkpoints[idx].state);
  var el=$(SID);if(!el)return;
  var css='';var tv=[];for(var tk in d.tokens)if(d.tokens[tk])tv.push(tk+':'+d.tokens[tk]);
  if(tv.length)css+=':root{'+tv.join(';')+'}\n';
  for(var s in d.ov){var ps=d.ov[s];if(!ps)continue;var norm=[];for(var p in ps){if(p.indexOf('hover:')!==0)norm.push(p+':'+ps[p]+' !important;');}if(norm.length)css+=s+'{'+norm.join('')+'}\n';}
  el.textContent=css;
}
function endPreview(){applyCSS();}

/* ══════════════════════════════════════════
   HOLD-TO-COMPARE — spacebar shows original
   ══════════════════════════════════════════ */
var _comparing=false;
document.addEventListener('keydown',function(e){
  if(e.code==='Space'&&!e.target.matches('input,textarea,select,[contenteditable]')&&S.on){
    e.preventDefault();
    if(!_comparing){_comparing=true;previewCheckpoint(0);toast('Showing original');}
  }
});
document.addEventListener('keyup',function(e){
  if(e.code==='Space'&&_comparing){_comparing=false;endPreview();toast('Back to current');}
});

/* ══════════════════════════════════════════
   SPACING VISUALIZATION — margin/padding overlays
   ══════════════════════════════════════════ */
function showSpacing(el){
  clearSpacing();
  if(!el)return;
  var cs=getComputedStyle(el);
  var r=el.getBoundingClientRect();
  var mt=parseInt(cs.marginTop)||0,mr=parseInt(cs.marginRight)||0,mb=parseInt(cs.marginBottom)||0,ml=parseInt(cs.marginLeft)||0;
  var pt=parseInt(cs.paddingTop)||0,pr=parseInt(cs.paddingRight)||0,pb=parseInt(cs.paddingBottom)||0,pl=parseInt(cs.paddingLeft)||0;
  /* Margin overlays (orange) */
  function mBox(x,y,w,h2){var d=mk('div');d.className='ve-spacing';d.style.cssText='position:fixed;pointer-events:none;z-index:99986;background:rgba(255,165,80,0.15);border:1px dashed rgba(255,165,80,0.4);top:'+y+'px;left:'+x+'px;width:'+w+'px;height:'+h2+'px;';document.body.appendChild(d);}
  if(mt>0)mBox(r.left-ml,r.top-mt,r.width+ml+mr,mt);
  if(mb>0)mBox(r.left-ml,r.bottom,r.width+ml+mr,mb);
  if(ml>0)mBox(r.left-ml,r.top,ml,r.height);
  if(mr>0)mBox(r.right,r.top,mr,r.height);
  /* Padding overlays (green) */
  function pBox(x,y,w,h2){var d=mk('div');d.className='ve-spacing';d.style.cssText='position:fixed;pointer-events:none;z-index:99986;background:rgba(80,200,120,0.12);border:1px dashed rgba(80,200,120,0.35);top:'+y+'px;left:'+x+'px;width:'+w+'px;height:'+h2+'px;';document.body.appendChild(d);}
  if(pt>0)pBox(r.left,r.top,r.width,pt);
  if(pb>0)pBox(r.left,r.bottom-pb,r.width,pb);
  if(pl>0)pBox(r.left,r.top+pt,pl,r.height-pt-pb);
  if(pr>0)pBox(r.right-pr,r.top+pt,pr,r.height-pt-pb);
}
function clearSpacing(){document.querySelectorAll('.ve-spacing').forEach(function(d){d.remove();});}
/* Show spacing when element is selected */
var _origPick=pick;
pick=function(el,multi){_origPick(el,multi);showSpacing(el);};

/* ══════════════════════════════════════════
   RIGHT-CLICK CONTEXT MENU
   Layout:
     [quick-action toolbar — icon-only, OneNote-style]
     ─────
     Header (multi-select count if applicable)
     ─────
     Inline-cell rows: Add | Sample | Hide on | Reset
     ─────
     Vertical list: Copy selector / Copy styles / Paste styles / Edit text /
                    Delete element / Select-all-by-class items
     ─────
     [Task-card section, conditional on right-click target being a card]
   Tooltips on hover deliver labels; rows are icon-only where possible. */

/* Helpers for the quick-action toolbar — operate on S.selCSS (multi-target
   if S.multiSelCSS is populated). All write through pu()→S.ov→sv()→applyCSS. */
function _ctxTargets(){return S.multiSelCSS.length?S.multiSelCSS:(S.selCSS?[S.selCSS]:[]);}
function _ctxSetProp(prop,val){
  var targets=_ctxTargets();if(!targets.length)return;
  pu();
  targets.forEach(function(sel){
    if(!S.ov[sel])S.ov[sel]={};
    if(val===''||val==null)delete S.ov[sel][prop];
    else S.ov[sel][prop]=val;
  });
  sv();applyCSS();
}
function _ctxBumpFontSize(deltaPx){
  var targets=_ctxTargets();if(!targets.length)return;
  pu();
  targets.forEach(function(sel){
    var el=document.querySelector(sel);if(!el)return;
    var cur=parseFloat(getComputedStyle(el).fontSize)||16;
    var next=Math.max(6,Math.round(cur+deltaPx));
    if(!S.ov[sel])S.ov[sel]={};
    S.ov[sel]['font-size']=next+'px';
  });
  sv();applyCSS();
}
function _ctxBumpSpacing(deltaPx){
  /* Tighten or loosen padding on all four sides simultaneously. */
  var targets=_ctxTargets();if(!targets.length)return;
  pu();
  targets.forEach(function(sel){
    var el=document.querySelector(sel);if(!el)return;
    var cs=getComputedStyle(el);
    ['padding-top','padding-right','padding-bottom','padding-left'].forEach(function(p){
      var cur=parseFloat(cs[cam(p)])||0;
      var next=Math.max(0,Math.round(cur+deltaPx));
      if(!S.ov[sel])S.ov[sel]={};
      S.ov[sel][p]=next+'px';
    });
  });
  sv();applyCSS();
}
function _ctxSwatch(prop){
  if(!S.sel)return 'transparent';
  return getComputedStyle(S.sel)[cam(prop)] || 'transparent';
}

function showCtxMenu(x,y,el){
  var _tip=document.getElementById('veTip');if(_tip)_tip.style.display='none';
  var ctx=$('veCtx');
  if(!ctx){
    ctx=mk('div');ctx.id='veCtx';
    ctx.style.cssText='position:fixed;z-index:999999;background:rgba(14,10,22,0.97);border:1px solid rgba(216,181,91,0.3);border-radius:6px;padding:0;min-width:260px;max-width:340px;display:none;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#ddd0ee;box-shadow:0 8px 30px rgba(0,0,0,0.5);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);overflow:hidden;';
    document.body.appendChild(ctx);
  }
  var SEP='<div style="height:1px;background:rgba(216,181,91,0.15);margin:2px 0"></div>';
  var classes=el.className&&typeof el.className==='string'?el.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0;}):[];
  var classItems='';
  classes.forEach(function(cls){
    var count=0;try{count=document.querySelectorAll('.'+CSS.escape(cls)).length;}catch(ex){}
    if(count>1)classItems+=ctxItem('selclass:'+cls,'\u2295','Select all .'+cls+' ('+count+')');
  });
  var vid=el.getAttribute&&el.getAttribute('data-ve-id');
  var rv=S.responsive[S.selCSS]||{};

  /* Quick-action toolbar */
  var bodyFont=S.globals.fonts.body||'';
  var fontVal=(S.ov[S.selCSS]&&S.ov[S.selCSS]['font-family'])||bodyFont||'';
  var toolbar='<div class="veCtxToolbar" style="display:flex;align-items:center;gap:2px;padding:6px 8px;background:rgba(216,181,91,0.05);border-bottom:1px solid rgba(216,181,91,0.18);flex-wrap:wrap;">';
  var fonts=[['','Default'],["\u0027Cormorant Garamond\u0027,Georgia,serif",'Cormorant'],["\u0027Cinzel\u0027,serif",'Cinzel'],["\u0027DM Sans\u0027,sans-serif",'DM Sans'],["\u0027Allura\u0027,cursive",'Allura'],["\u0027Playfair Display\u0027,serif",'Playfair'],["\u0027Lora\u0027,serif",'Lora'],["Georgia,serif",'Georgia']];
  toolbar+='<select data-tb="font-family" title="Font family" style="background:rgba(30,20,48,0.7);border:1px solid rgba(216,181,91,0.2);border-radius:4px;color:#e8ddf5;padding:3px 4px;font-size:11px;max-width:100px;">';
  fonts.forEach(function(f){toolbar+='<option value="'+esc(f[0])+'"'+(f[0]===fontVal?' selected':'')+'>'+f[1]+'</option>';});
  toolbar+='</select>';
  toolbar+=ctxTbBtn('size-down','A\u2212','Decrease font size');
  toolbar+=ctxTbBtn('size-up','A+','Increase font size');
  toolbar+=ctxTbDiv();
  var colorVal=toHex(_ctxSwatch('color'));
  toolbar+='<input type="color" data-tb="color" value="'+colorVal+'" title="Text color" style="width:24px;height:24px;border:1px solid rgba(216,181,91,0.25);border-radius:4px;background:rgba(30,20,48,0.5);cursor:pointer;padding:1px;">';
  var bgVal=toHex(_ctxSwatch('background-color'));
  toolbar+='<input type="color" data-tb="background-color" value="'+bgVal+'" title="Background color" style="width:24px;height:24px;border:1px solid rgba(216,181,91,0.25);border-radius:4px;background:rgba(30,20,48,0.5);cursor:pointer;padding:1px;">';
  toolbar+=ctxTbDiv();
  toolbar+=ctxTbBtn('align-left','\u2B05','Align left');
  toolbar+=ctxTbBtn('align-center','\u2B0D','Align center');
  toolbar+=ctxTbBtn('align-right','\u27A1','Align right');
  toolbar+=ctxTbDiv();
  toolbar+=ctxTbBtn('spacing-down','\u2194\u2212','Decrease padding');
  toolbar+='</div>';

  /* Header */
  var hdrId=(el.id?'#'+el.id:el.tagName.toLowerCase());
  var hdrCls=(el.className&&typeof el.className==='string')?el.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0;}).slice(0,2).map(function(c){return'.'+c;}).join(''):'';
  var multiNote=S.multiSelCSS.length>1?' \u00B7 <span style="color:#50c878;">('+S.multiSelCSS.length+' selected)</span>':'';
  var header='<div style="padding:5px 12px;border-bottom:1px solid rgba(216,181,91,0.10);background:rgba(216,181,91,0.04);font-size:10px;color:#b8a8d0;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(hdrId+hdrCls)+multiNote+'</div>';

  /* Inline-cell rows */
  var inlineRows='';
  inlineRows+=ctxRowGroup('Add', [
    ['addB','\u2191',null,'Add before'],
    ['addA','\u2193',null,'Add after'],
    ['addI','\u21B3',null,'Add inside']
  ]);
  var swText=toHex(_ctxSwatch('color'));
  var swBg=toHex(_ctxSwatch('background-color'));
  var swBd=toHex(_ctxSwatch('border-color'));
  inlineRows+=ctxRowGroupSwatch('Sample', [
    ['sample-color','Aa', swText, 'Sample text color from\u2026'],
    ['sample-bg','\u25A0', swBg, 'Sample background from\u2026'],
    ['sample-border','\u25A2', swBd, 'Sample border color from\u2026']
  ]);
  inlineRows+=ctxRowGroup('Hide on', [
    ['hd','\uD83D\uDDA5', rv.hideDesktop, (rv.hideDesktop?'Show':'Hide')+' on desktop'],
    ['ht','\uD83D\uDCF1', rv.hideTablet, (rv.hideTablet?'Show':'Hide')+' on tablet'],
    ['hm','\uD83D\uDCF2', rv.hideMobile, (rv.hideMobile?'Show':'Hide')+' on mobile']
  ]);
  inlineRows+=ctxRowGroup('Reset', [
    ['reset-this','\u21A9',null,'Reset this element'],
    ['delete','\uD83E\uDDF9',null,'Clear overrides'+(S.multiSelCSS.length?' ('+S.multiSelCSS.length+' selected)':'')],
    ['reset','\u26A0',null,'Reset ALL to original']
  ]);

  /* Vertical list */
  var listItems='';
  listItems+=ctxItem('copy-selector','\uD83C\uDFAF','Copy CSS selector');
  listItems+=ctxItem('copy','\uD83D\uDCCB','Copy styles');
  listItems+=ctxItem('paste','\uD83D\uDCCB','Paste styles');
  listItems+=ctxItem('edit','\u270F\uFE0F','Edit text');
  if(vid)listItems+=ctxItem('del','\uD83D\uDDD1','Delete element');
  if(classItems)listItems+=SEP+classItems;

  /* Task-card section, conditional */
  var taskCard=el.closest&&el.closest('.task-card');
  var taskSection='';
  if(taskCard){
    var tid=taskCard.getAttribute('data-id');
    taskSection=SEP+
      '<div style="padding:4px 12px 2px;font-size:9px;color:#8878a0;text-transform:uppercase;letter-spacing:.08em;">Task card</div>'+
      ctxItem('task-edit','\u270F\uFE0F','Edit task',tid)+
      ctxItem('task-duplicate','\u2398','Duplicate task',tid)+
      ctxItem('task-delete','\uD83D\uDDD1','Delete task',tid);
  }

  ctx.innerHTML=toolbar+header+inlineRows+SEP+listItems+taskSection;

  /* Wire toolbar */
  var fontSel=ctx.querySelector('[data-tb="font-family"]');
  if(fontSel)fontSel.onchange=function(){_ctxSetProp('font-family',fontSel.value);hideCtxMenu();};
  ctx.querySelectorAll('[data-tb-btn]').forEach(function(b){
    b.onclick=function(ev){
      ev.stopPropagation();
      var act=b.getAttribute('data-tb-btn');
      if(act==='size-up')_ctxBumpFontSize(1);
      else if(act==='size-down')_ctxBumpFontSize(-1);
      else if(act==='align-left')_ctxSetProp('text-align','left');
      else if(act==='align-center')_ctxSetProp('text-align','center');
      else if(act==='align-right')_ctxSetProp('text-align','right');
      else if(act==='spacing-down')_ctxBumpSpacing(-2);
      hideCtxMenu();
    };
  });
  var colorIn=ctx.querySelector('[data-tb="color"]');
  if(colorIn)colorIn.oninput=function(){_ctxSetProp('color',colorIn.value);};
  var bgIn=ctx.querySelector('[data-tb="background-color"]');
  if(bgIn)bgIn.oninput=function(){_ctxSetProp('background-color',bgIn.value);};

  /* Wire main item dispatch */
  ctx.querySelectorAll('[data-ctx]').forEach(function(b){
    b.onclick=function(ev){
      ev.stopPropagation();
      var act=b.getAttribute('data-ctx');
      var taskIdAttr=b.getAttribute('data-ctx-tid');
      if(act==='copy-selector'){
        var selToCopy=S.selCSS||'';
        if(!selToCopy){toast('No element picked');hideCtxMenu();return;}
        if(navigator.clipboard&&navigator.clipboard.writeText){
          navigator.clipboard.writeText(selToCopy).then(function(){toast('Copied: '+selToCopy);},function(){
            try{var ta=mk('textarea');ta.value=selToCopy;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('Copied: '+selToCopy);}catch(_){toast('Copy failed');}
          });
        } else {
          try{var ta=mk('textarea');ta.value=selToCopy;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('Copied: '+selToCopy);}catch(_){toast('Copy failed');}
        }
      }
      else if(act==='copy')copyStyles();
      else if(act==='paste')pasteStyles();
      else if(act==='edit'){if(S.sel)startTextEdit(S.sel);}
      else if(act==='del'){if(!S.sel)return;var v=S.sel.getAttribute('data-ve-id');if(v)rmEl(v);else toast('Can only delete added elements');}
      else if(act==='addA'||act==='addB'||act==='addI'){S._addPosition={addA:'after',addB:'before',addI:'inside'}[act];S._tab='add';refresh();}
      else if(act==='hd'||act==='ht'||act==='hm'){
        if(!S.selCSS)return;
        var k={hd:'hideDesktop',ht:'hideTablet',hm:'hideMobile'}[act];
        pu();if(!S.responsive[S.selCSS])S.responsive[S.selCSS]={};
        S.responsive[S.selCSS][k]=!S.responsive[S.selCSS][k];
        sv();applyCSS();refresh();
      }
      else if(act==='reset-this'){
        if(!S.selCSS)return;
        pu();delete S.ov[S.selCSS];delete S.text[S.selCSS];delete S.anims[S.selCSS];delete S.responsive[S.selCSS];delete S.attrs[S.selCSS];
        sv();applyCSS();refresh();toast('Element reset');
      }
      else if(act==='delete'){
        var targets=S.multiSelCSS.length?S.multiSelCSS:(S.selCSS?[S.selCSS]:[]);
        if(targets.length){pu();targets.forEach(function(s){delete S.ov[s];});sv();applyCSS();refresh();toast('Cleared overrides');}
      }
      else if(act==='reset'){
        if(!confirm('Reset ALL overrides, added elements, text edits, and animations? This cannot be undone.'))return;
        pu();S.ov={};S.text={};S.anims={};S.responsive={};S.attrs={};S.elements=[];S.tokens={};
        sv();rebuildEls();applyCSS();cSL();refresh();toast('All reset');
      }
      else if(act.indexOf('selclass:')===0){selectAllByClass(act.slice(9));}
      else if(act.indexOf('sample-')===0){
        var propMap={'sample-color':'color','sample-bg':'background-color','sample-border':'border-color'};
        var targetProp=propMap[act];
        var targetSel=S.selCSS;
        toast('Click any element to sample its '+targetProp);
        document.addEventListener('click',function sampler(e2){
          if(isVE(e2.target)){document.removeEventListener('click',sampler,true);return;}
          e2.preventDefault();e2.stopPropagation();
          var scs=getComputedStyle(e2.target);
          var sampled=scs[cam(targetProp)];
          pu();
          if(!S.ov[targetSel])S.ov[targetSel]={};
          S.ov[targetSel][targetProp]=sampled;
          sv();applyCSS();refresh();
          document.removeEventListener('click',sampler,true);
          toast('Sampled '+targetProp+': '+sampled);
        },true);
      }
      else if(act==='task-edit'&&taskIdAttr){
        if(typeof window.openTaskEditor==='function')window.openTaskEditor(taskIdAttr);
        else toast('Task editor not available');
      }
      else if(act==='task-duplicate'&&taskIdAttr){
        window.ctxTaskId=taskIdAttr;
        if(typeof window.ctxAction==='function')window.ctxAction('duplicate');
      }
      else if(act==='task-delete'&&taskIdAttr){
        window.ctxTaskId=taskIdAttr;
        if(typeof window.ctxAction==='function')window.ctxAction('delete');
      }
      hideCtxMenu();
    };
  });
  ctx.style.display='block';
  /* Position the menu so it never overlaps the panel.
     If the panel is docked on the right, clamp menu's right edge to
     the panel's left edge minus a gap. If the menu would still extend
     into the panel, anchor it to the panel-left edge minus its width. */
  var panelEl=document.getElementById(PID);
  var menuW=ctx.offsetWidth||280;
  var menuH=ctx.offsetHeight||300;
  var rightLimit=window.innerWidth-8;
  if(panelEl && S.on){
    var pr=panelEl.getBoundingClientRect();
    /* Only treat the panel as a no-go zone if it's actually visible
       (it could be partially off-screen if user dragged it). */
    if(pr.left < window.innerWidth && pr.right > 0){
      rightLimit=Math.min(rightLimit, pr.left - 8);
    }
  }
  var leftPos=x;
  if(leftPos + menuW > rightLimit){
    leftPos = rightLimit - menuW;
    /* If clamping pushed it offscreen left, fall back to anchoring at 8 */
    if(leftPos < 8) leftPos = 8;
  }
  ctx.style.left=leftPos+'px';
  ctx.style.top=Math.min(y,window.innerHeight-menuH-10)+'px';
}

/* Vertical list item: icon + label, native title tooltip on hover. */
function ctxItem(act,icon,tooltip,extraTaskId){
  var attr=extraTaskId?(' data-ctx-tid="'+esc(extraTaskId)+'"'):'';
  return '<div data-ctx="'+act+'"'+attr+' title="'+esc(tooltip||'')+'" style="display:flex;align-items:center;gap:8px;padding:4px 12px;cursor:pointer;transition:background .1s;font-size:12px;line-height:1.4;" onmouseover="this.style.background=\'rgba(216,181,91,0.1)\'" onmouseout="this.style.background=\'none\'"><span style="width:16px;text-align:center;color:#d8b55b;">'+icon+'</span><span>'+esc(tooltip||'')+'</span></div>';
}

/* Inline-cell row: label on left, icon-only cells on right. */
function ctxRowGroup(label, cells){
  var h='<div class="veCtxRowGroup" style="display:flex;align-items:center;padding:3px 8px 3px 12px;gap:6px;">';
  h+='<span style="font-size:10px;color:#8878a0;text-transform:uppercase;letter-spacing:.06em;flex:0 0 56px;">'+esc(label)+'</span>';
  h+='<div style="display:flex;flex:1;gap:1px;background:rgba(216,181,91,0.15);border-radius:4px;overflow:hidden;">';
  cells.forEach(function(c){
    var act=c[0],icon=c[1],active=c[2],tip=c[3];
    var bg=active?'rgba(216,181,91,0.25)':'rgba(30,20,48,0.5)';
    var col=active?'#ead89b':'#d8b55b';
    h+='<button data-ctx="'+act+'" title="'+esc(tip)+'" style="flex:1;border:none;background:'+bg+';color:'+col+';padding:4px 0;cursor:pointer;font-size:13px;line-height:1;transition:background .1s;" onmouseover="this.style.background=\'rgba(216,181,91,0.18)\'" onmouseout="this.style.background=\''+bg+'\'">'+icon+'</button>';
  });
  h+='</div></div>';
  return h;
}

/* Inline-cell row with color-swatch preview underneath each icon. */
function ctxRowGroupSwatch(label, cells){
  var h='<div class="veCtxRowGroup" style="display:flex;align-items:center;padding:3px 8px 3px 12px;gap:6px;">';
  h+='<span style="font-size:10px;color:#8878a0;text-transform:uppercase;letter-spacing:.06em;flex:0 0 56px;">'+esc(label)+'</span>';
  h+='<div style="display:flex;flex:1;gap:1px;background:rgba(216,181,91,0.15);border-radius:4px;overflow:hidden;">';
  cells.forEach(function(c){
    var act=c[0],icon=c[1],sw=c[2],tip=c[3];
    h+='<button data-ctx="'+act+'" title="'+esc(tip)+'" style="flex:1;border:none;background:rgba(30,20,48,0.5);color:#d8b55b;padding:4px 0;cursor:pointer;font-size:11px;line-height:1;display:flex;flex-direction:column;align-items:center;gap:2px;transition:background .1s;" onmouseover="this.style.background=\'rgba(216,181,91,0.18)\'" onmouseout="this.style.background=\'rgba(30,20,48,0.5)\'"><span>'+icon+'</span><span style="display:block;width:14px;height:4px;background:'+esc(sw)+';border:1px solid rgba(216,181,91,0.3);border-radius:1px;"></span></button>';
  });
  h+='</div></div>';
  return h;
}

/* Toolbar button — square icon, native title tooltip. */
function ctxTbBtn(act,icon,tooltip){
  return '<button data-tb-btn="'+act+'" title="'+esc(tooltip||'')+'" style="border:1px solid rgba(216,181,91,0.2);background:rgba(30,20,48,0.5);color:#d8b55b;border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:11px;line-height:1;display:inline-flex;align-items:center;justify-content:center;padding:0;font-family:inherit;">'+icon+'</button>';
}
function ctxTbDiv(){
  return '<div style="width:1px;height:18px;background:rgba(216,181,91,0.2);margin:0 4px;"></div>';
}
function hideCtxMenu(){var ctx=$('veCtx');if(ctx)ctx.style.display='none';}
function showTip(el,mx,my){
  var t=$('veTip');if(!t||!el||el===document.body||el===document.documentElement)return;
  // Suppress when ANY context menu is open — the tooltip would clash with menus.
  var veCtx=document.getElementById('veCtx');
  if(veCtx && veCtx.style.display==='block') return;
  var appCtx=document.getElementById('ctxMenu');
  if(appCtx && appCtx.classList.contains('open')) return;
  var cs=getComputedStyle(el);
  var tag=el.tagName.toLowerCase();
  var id=el.id&&el.id.indexOf('ve')!==0?'#'+el.id:'';
  var cls=el.className&&typeof el.className==='string'?el.className.split(/\s+/).filter(function(c){return c&&c.indexOf('ve')!==0;}).map(function(c){return'.'+c;}).join(''):'';
  var r=el.getBoundingClientRect();
  var w=Math.round(r.width),h=Math.round(r.height);
  // Build tooltip
  var html='<div style="color:#d8b55b;font-weight:700;font-size:12px;margin-bottom:4px;font-family:monospace;">'+esc(tag+id+cls)+'</div>';
  html+='<div style="color:#7060a0;font-size:10px;margin-bottom:6px;">'+w+' × '+h+'px</div>';
  // Key properties
  var props=[
    ['font',(cs.fontFamily||'sans-serif').split(',')[0].replace(/['"]/g,'')+ ' ' +cs.fontWeight+' '+cs.fontSize],
    ['color',cs.color],
    ['background',cs.backgroundColor!=='rgba(0, 0, 0, 0)'?cs.backgroundColor:'transparent'],
    ['padding',cs.padding!=='0px'?cs.padding:null],
    ['margin',cs.margin!=='0px'?cs.margin:null],
    ['border',cs.borderWidth!=='0px'?cs.borderWidth+' '+cs.borderStyle+' '+cs.borderColor:null],
    ['border-radius',cs.borderRadius!=='0px'?cs.borderRadius:null],
    ['box-shadow',cs.boxShadow!=='none'?cs.boxShadow:null],
    ['text-shadow',cs.textShadow!=='none'?cs.textShadow:null],
    ['opacity',cs.opacity!=='1'?cs.opacity:null],
    ['position',cs.position!=='static'?cs.position:null],
    ['display',cs.display],
    ['z-index',cs.zIndex!=='auto'?cs.zIndex:null],
    ['transition',cs.transition&&cs.transition!=='all 0s ease 0s'&&cs.transition!=='none'?cs.transition:null],
    ['animation',cs.animationName&&cs.animationName!=='none'?cs.animationName+' '+cs.animationDuration+' '+cs.animationTimingFunction+(cs.animationIterationCount==='infinite'?' ∞':' ×'+cs.animationIterationCount):null],
    ['filter',cs.filter&&cs.filter!=='none'?cs.filter:null],
    ['transform',cs.transform&&cs.transform!=='none'?cs.transform:null],
    ['isolation',cs.isolation&&cs.isolation!=='auto'?cs.isolation:null],
  ];
  // Check ::before and ::after pseudo-elements for animations
  var bef=getComputedStyle(el,'::before');
  var aft=getComputedStyle(el,'::after');
  if(bef&&bef.content&&bef.content!=='none'&&bef.content!=='""'&&bef.content!=="''"){
    var befAnim=bef.animationName&&bef.animationName!=='none'?bef.animationName+' '+bef.animationDuration:null;
    var befShadow=bef.boxShadow&&bef.boxShadow!=='none'?bef.boxShadow:null;
    if(befAnim)props.push(['::before anim',befAnim]);
    else if(befShadow)props.push(['::before shadow','(present)']);
    if(bef.background&&bef.background.indexOf('gradient')!==-1)props.push(['::before bg','gradient']);
  }
  if(aft&&aft.content&&aft.content!=='none'&&aft.content!=='""'&&aft.content!=="''"){
    var aftAnim=aft.animationName&&aft.animationName!=='none'?aft.animationName+' '+aft.animationDuration:null;
    var aftShadow=aft.boxShadow&&aft.boxShadow!=='none'?aft.boxShadow:null;
    if(aftAnim)props.push(['::after anim',aftAnim]);
    else if(aftShadow)props.push(['::after shadow','(present)']);
    if(aft.background&&aft.background.indexOf('gradient')!==-1)props.push(['::after bg','gradient']);
  }
  html+='<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;">';
  props.forEach(function(p){
    if(!p[1])return;
    var val=p[1];if(val.length>50)val=val.substring(0,47)+'…';
    var isColor=p[0]==='color'||p[0]==='background';
    var isMotion=p[0]==='animation'||p[0]==='transition'||p[0].indexOf('anim')!==-1;
    var swatch=isColor&&val!=='transparent'?'<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+esc(val)+';border:1px solid rgba(255,255,255,0.15);vertical-align:middle;margin-right:4px;"></span>':'';
    var labelColor=isMotion?'#d8b55b':'#7060a0';
    var valColor=isMotion?'#ead89b':'#b8a8d0';
    html+='<span style="color:'+labelColor+';font-size:10px;">'+p[0]+'</span><span style="color:'+valColor+';font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+swatch+esc(val)+'</span>';
  });
  html+='</div>';
  // Show any overrides
  var sel=gSel(el);
  if(S.ov[sel]){
    var ovKeys=Object.keys(S.ov[sel]);
    if(ovKeys.length){
      html+='<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(216,181,91,0.2);color:#d8b55b;font-size:10px;font-weight:600;">'+ovKeys.length+' override'+(ovKeys.length>1?'s':'')+'</div>';
    }
  }
  t.innerHTML=html;
  t.style.display='block';
  var tx=mx+14,ty=my+14;
  if(tx+360>window.innerWidth)tx=mx-370;
  if(ty+t.offsetHeight>window.innerHeight)ty=my-t.offsetHeight-10;
  t.style.left=tx+'px';t.style.top=ty+'px';
}

/* When the visual editor is ON, suppress in-app click handlers on task cards
   (and other interactive surfaces) so click is reserved for picking elements
   to edit. The editor's own UI (and the floating launcher) still works. */
document.addEventListener('click', function(e){
  if(!S.on) return;
  if(isVE(e.target)) return;
  // Whitelist: the floating CSS-tool launcher must keep working so the user
  // can toggle the panel back off.
  if(e.target.closest && e.target.closest('#fabCssTool')) return;
  // Suppress everything else — onCardTap, status pills, inline button handlers.
  // Capture phase + stopImmediatePropagation prevents inline onclick="" from firing.
  e.stopImmediatePropagation();
  e.stopPropagation();
  e.preventDefault();
}, true);

})();
