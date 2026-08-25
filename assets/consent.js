/* تفضيلات الخصوصية — لا تُحمّل أدوات القياس أو الإعلان قبل الاختيار */
(function(){
  'use strict';
  const KEY='nawah_consent_v1';
  const GA_ID='G-Q1W4YR0JKX';
  const ADS_CLIENT='ca-pub-9743937026294029';
  let loaded=false;

  function read(){
    try{return JSON.parse(localStorage.getItem(KEY));}catch(e){return null;}
  }
  function write(value){
    try{localStorage.setItem(KEY,JSON.stringify({analytics:value,ads:value,updatedAt:new Date().toISOString()}));}catch(e){}
  }
  function loadOptional(){
    if(loaded) return; loaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config',GA_ID,{anonymize_ip:true,allow_google_signals:false});
    const ga=document.createElement('script'); ga.async=true; ga.src=`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`; document.head.appendChild(ga);
    if(document.querySelector('.adsbygoogle')){
      const ads=document.createElement('script'); ads.async=true; ads.crossOrigin='anonymous'; ads.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`; document.head.appendChild(ads);
    }
  }
  function privacyHref(){
    return /\/(articles|products)\//.test(location.pathname)?'../privacy.html':'privacy.html';
  }
  function closeBanner(){ document.getElementById('consentBanner')?.remove(); }
  function choose(value){
    write(value); closeBanner(); if(value) loadOptional();
    const msg=value?'تم حفظ موافقتك على القياس والإعلانات.':'تم حفظ اختيارك. لن نحمّل القياس أو الإعلانات.';
    if(typeof window.showToast==='function') window.showToast(msg);
  }
  function openBanner(){
    closeBanner();
    const el=document.createElement('section'); el.id='consentBanner'; el.className='consent-banner'; el.setAttribute('role','dialog'); el.setAttribute('aria-labelledby','consentTitle');
    el.innerHTML=`<div><span>خصوصيتك أولاً</span><h2 id="consentTitle">اختر ما يناسبك</h2><p>نستخدم التخزين الضروري لحفظ الوضع والسلة. القياس والإعلانات اختيارية ولا نحمّلها قبل موافقتك. <a href="${privacyHref()}">اقرأ سياسة الخصوصية</a>.</p></div><div class="consent-actions"><button type="button" data-consent="no">الضروري فقط</button><button type="button" data-consent="yes">السماح والإنهاء</button></div>`;
    document.body.appendChild(el);
    el.querySelector('[data-consent="no"]').addEventListener('click',()=>choose(false));
    el.querySelector('[data-consent="yes"]').addEventListener('click',()=>choose(true));
    setTimeout(()=>el.querySelector('[data-consent="no"]')?.focus(),0);
  }
  function addPreferencesButton(){
    if(document.getElementById('privacyChoices')) return;
    const btn=document.createElement('button'); btn.type='button'; btn.id='privacyChoices'; btn.className='privacy-choices'; btn.textContent='خيارات الخصوصية'; btn.addEventListener('click',openBanner); document.body.appendChild(btn);
  }
  function init(){
    const choice=read(); if(choice?.analytics===true) loadOptional(); else if(!choice) openBanner(); addPreferencesButton();
  }
  window.nawahConsent={open:openBanner};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
