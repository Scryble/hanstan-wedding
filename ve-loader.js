/* ve-loader.js — Injects saved elements for ALL visitors.
   FIX #2: Uses stored refSel for proper positioning.
   Add to <head>: <script src="/ve-loader.js" defer></script> */
(function(){
  var EP='/.netlify/functions/ve-save';
  // Load elements
  fetch(EP+'?type=elements').then(function(r){return r.json();}).then(function(elements){
    if(!elements||!elements.length)return;
    elements.forEach(function(def){
      var el=build(def);if(!el)return;
      el.setAttribute('data-ve-id',def.id);el.setAttribute('data-ve-added','1');
      // FIX #2: Use stored refSel and position, not just appendChild
      var parent=null;
      try{parent=document.querySelector(def.parentSel);}catch(e){}
      if(!parent)parent=document.querySelector('main')||document.querySelector('.card')||document.body;
      var ref=null;
      if(def.refSel){try{ref=document.querySelector(def.refSel);}catch(e){}}
      switch(def.position){
        case 'before':if(ref)ref.parentElement.insertBefore(el,ref);else parent.insertBefore(el,parent.firstChild);break;
        case 'inside':parent.appendChild(el);break;
        case 'start':parent.insertBefore(el,parent.firstChild);break;
        default:if(ref&&ref.nextSibling)ref.parentElement.insertBefore(el,ref.nextSibling);else parent.appendChild(el);
      }
    });
  }).catch(function(){});

  var SHAPES={wave:'M0,40 C150,80 350,0 500,40 L500,0 L0,0 Z',curve:'M0,0 L0,40 Q250,80 500,40 L500,0 Z',triangle:'M0,0 L250,60 L500,0 Z',zigzag:'M0,40 L50,0 L100,40 L150,0 L200,40 L250,0 L300,40 L350,0 L400,40 L450,0 L500,40 L500,0 L0,0 Z',tilt:'M0,0 L500,40 L500,0 Z'};

  function build(d){
    var el;
    switch(d.type){
      case 'nav':el=document.createElement('nav');el.style.cssText='display:flex;align-items:center;justify-content:center;gap:1rem;padding:0.75rem 0;font-size:0.85rem;letter-spacing:0.08em;font-weight:500;';(d.navLinks||[]).forEach(function(l){var a=document.createElement('a');a.href=l.href||'#';a.textContent=l.label||'Link';a.style.cssText='color:inherit;text-decoration:none;';el.appendChild(a);});break;
      case 'heading':el=document.createElement('h'+(d.level||2));el.textContent=d.content||'Heading';break;
      case 'text':el=document.createElement('p');el.textContent=d.content||'Text';break;
      case 'image':el=document.createElement('img');el.src=d.src||'';el.alt=d.content||'';el.style.cssText='max-width:100%;height:auto;border-radius:8px;';break;
      case 'button':el=document.createElement('a');el.href=d.href||'#';el.textContent=d.content||'Button';el.style.cssText='display:inline-flex;padding:0.7rem 2rem;font-family:inherit;font-size:0.9rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;color:#fdfbf7;background:#3d3a36;border-radius:4px;';break;
      case 'divider':el=document.createElement('hr');el.style.cssText='width:60%;border:none;border-top:1px solid rgba(61,58,54,0.2);margin:1rem auto;';break;
      case 'spacer':el=document.createElement('div');el.style.cssText='height:'+(d.content||'40')+'px;';break;
      case 'section':el=document.createElement('section');el.style.cssText='width:100%;padding:1.5rem;';break;
      case 'list':el=document.createElement('ul');el.style.cssText='text-align:left;padding-left:1.5rem;';(d.items||[]).forEach(function(i){var li=document.createElement('li');li.textContent=i;el.appendChild(li);});break;
      case 'html':el=document.createElement('div');el.innerHTML=d.content||'';break;
      case 'slideshow':
        el=document.createElement('div');el.style.cssText='width:100%;height:200px;position:relative;overflow:hidden;border-radius:8px;';
        var urls=d.slideshowUrls||[];
        if(urls.length){urls.forEach(function(u,i){var img=document.createElement('img');img.src=u;img.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:'+(i===0?1:0)+';transition:opacity 1s;';el.appendChild(img);});var cur={v:0};setInterval(function(){var imgs=el.querySelectorAll('img');if(!imgs.length)return;imgs[cur.v].style.opacity='0';cur.v=(cur.v+1)%imgs.length;imgs[cur.v].style.opacity='1';},(parseInt(d.slideshowInterval)||4)*1000);}
        break;
      case 'shapedivider':
        el=document.createElement('div');el.style.cssText='width:100%;overflow:hidden;line-height:0;';
        var h=d.shapeHeight||60,col=d.shapeColor||'#f5f2ed',shape=d.shapeType||'wave',flip=d.shapeFlip;
        var path=SHAPES[shape]||SHAPES.wave;
        el.innerHTML='<svg viewBox="0 0 500 '+h+'" preserveAspectRatio="none" style="width:100%;height:'+h+'px;display:block;'+(flip?'transform:rotate(180deg);':'')+'"><path d="'+path+'" fill="'+col+'"/></svg>';
        break;
      default:return null;
    }
    return el;
  }
})();
