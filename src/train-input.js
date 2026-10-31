// WebKit callouts and Chromium's passive touch defaults need more than pointerdown.
// Cancel native gestures at touchstart, then deliver a tap once on touchend.
export function installTrainTouchGuard(root,{signal,now=()=>performance.now()}={}){
  const touches=new Map(),doc=root.ownerDocument,html=doc.documentElement;
  const hadLock=html.classList.contains('train-input-lock');
  html.classList.add('train-input-lock');
  const on=(type,fn)=>root.addEventListener(type,fn,{capture:true,passive:false,signal});
  const prevent=e=>{if(e.cancelable)e.preventDefault();};
  const element=node=>node?.nodeType===1?node:node?.parentElement;
  const editable=node=>element(node)?.closest('input:not([type="checkbox"]):not([readonly]),textarea,select,[contenteditable="true"]');
  let blockClicksUntil=-Infinity,lastPaperTap=-Infinity;
  for(const type of ['contextmenu','dragstart','dblclick','gesturestart','gesturechange','gestureend','touchforcechange'])on(type,prevent);
  on('selectstart',e=>{if(!editable(e.target))prevent(e);});
  on('wheel',e=>{if(e.ctrlKey||e.metaKey)prevent(e);});
  on('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['Equal','Minus','Digit0','NumpadAdd','NumpadSubtract','Numpad0'].includes(e.code))prevent(e);});
  on('click',e=>{
    // HTMLElement.click() and keyboard/assistive activation have detail 0.
    const ownedTouch=[...touches.values()].some(t=>t.owned);
    if((e.detail>0||e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)&&(ownedTouch||now()<blockClicksUntil)){prevent(e);e.stopImmediatePropagation();}
  });
  on('touchstart',e=>{
    let blocked=e.touches.length>1;
    for(const t of e.changedTouches){
      const target=element(t.target),native=Boolean(editable(target));
      const tap=target?.closest('button,input[type="checkbox"],output[tabindex]')||target?.closest('label')?.control;
      const paper=!tap&&!native?target?.closest('.train-dialog[open]'):null;
      const owned=!native&&!paper;
      touches.set(t.identifier,{tap,paper,native,owned,x:t.clientX,y:t.clientY,lastY:t.clientY,moved:false});
      blocked ||= owned;
    }
    if(blocked)prevent(e);
  });
  on('touchmove',e=>{
    let blocked=e.touches.length>1;
    for(const t of e.changedTouches){
      const s=touches.get(t.identifier);if(!s)continue;
      const dy=t.clientY-s.lastY;s.lastY=t.clientY;
      s.moved ||= Math.hypot(t.clientX-s.x,t.clientY-s.y)>12;
      if(s.owned)blocked=true;
      if(s.paper){
        const max=s.paper.scrollHeight-s.paper.clientHeight;
        if(max<=0||(dy>0&&s.paper.scrollTop<=0)||(dy<0&&s.paper.scrollTop>=max-1))blocked=true;
      }
    }
    if(blocked)prevent(e);
  });
  const end=(e,cancelled)=>{
    const activate=[];let blocked=false;
    for(const t of e.changedTouches){
      const s=touches.get(t.identifier);touches.delete(t.identifier);if(!s)continue;
      if(s.owned){
        blocked=true;
        const tap=s.tap;
        const moved=s.moved||Math.hypot(t.clientX-s.x,t.clientY-s.y)>12;
        if(!cancelled&&!moved&&tap?.isConnected&&!tap.disabled&&!tap.hasAttribute('data-game-hold')){
          const r=tap.getBoundingClientRect();
          if(t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom)activate.push(tap);
        }
      }else if(!cancelled&&s.paper&&!s.moved){
        if(now()-lastPaperTap<350)blocked=true;
        lastPaperTap=now();
      }
    }
    if(blocked){prevent(e);blockClicksUntil=now()+750;}
    for(const tap of activate){tap.focus({preventScroll:true});tap.click();}
  };
  on('touchend',e=>end(e,false));on('touchcancel',e=>end(e,true));
  signal?.addEventListener('abort',()=>{touches.clear();if(!hadLock)html.classList.remove('train-input-lock');},{once:true});
}

// Each finger owns its own hold; lifting/cancelling another finger cannot release it.
export function bindTrainHold(button,{signal,enabled=()=>true,onChange,onTap,onRelease,now=()=>performance.now()}){
  const pointers=new Map();let keyboard=false,active=false;
  button.setAttribute('data-game-hold','');
  const on=(type,fn)=>button.addEventListener(type,fn,{signal});
  const publish=cancelled=>{
    const next=keyboard||pointers.size>0;
    if(next!==active){active=next;onChange(next,{cancelled});}
  };
  const releaseCapture=id=>{if(button.hasPointerCapture(id))button.releasePointerCapture(id);};
  const end=(e,cancelled)=>{
    if(!pointers.has(e.pointerId))return;
    const duration=now()-pointers.get(e.pointerId);pointers.delete(e.pointerId);
    publish(cancelled);releaseCapture(e.pointerId);
    if(!cancelled){onTap?.(duration);onRelease?.();}
  };
  on('pointerdown',e=>{
    if(!enabled()||e.button!==0||pointers.has(e.pointerId))return;
    e.preventDefault();pointers.set(e.pointerId,now());button.setPointerCapture(e.pointerId);publish(false);
  });
  on('pointerup',e=>end(e,false));on('pointercancel',e=>end(e,true));on('lostpointercapture',e=>end(e,true));
  on('keydown',e=>{
    if(!['Space','Enter'].includes(e.code))return;
    e.preventDefault();e.stopPropagation();
    if(!e.repeat&&enabled()){keyboard=true;publish(false);}
  });
  on('keyup',e=>{
    if(!['Space','Enter'].includes(e.code))return;
    e.preventDefault();e.stopPropagation();keyboard=false;publish(false);onRelease?.();
  });
  const reset=()=>{const ids=[...pointers.keys()];pointers.clear();keyboard=false;publish(true);ids.forEach(releaseCapture);};
  signal?.addEventListener('abort',reset,{once:true});
  return reset;
}
