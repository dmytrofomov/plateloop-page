/* Export brand layouts and check the static landing in a real browser.
 * Requires playwright and sharp. Set CHROME_PATH if Chrome is elsewhere.
 * Run --export first, then package assets; run without --export for link checks.
 */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const sharp=require('sharp');
const root=path.resolve(__dirname,'../docs');
const prefix='/plateloop-page';
const out=path.resolve(__dirname,'../output');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.zip':'application/zip','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith(prefix+'/')){res.writeHead(404).end('Not found');return;}
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname.slice(prefix.length)));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const report=[];
const errors=[];
// Any page error, console error, failed request or HTTP error fails the run (aborted navigations excepted).
function watch(pg){
  pg.on('pageerror',e=>errors.push('pageerror: '+e.message));
  pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  pg.on('requestfailed',r=>{const why=r.failure()?.errorText||'';if(!/ERR_ABORTED/.test(why))errors.push('requestfailed: '+r.url()+' '+why);});
  pg.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
  return pg;
}
// Lines of the h1 that end with a one- or two-letter word (a dangling preposition or conjunction).
const h1DanglingWords=pg=>pg.locator('h1').evaluate(h=>{
  const words=[];const walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const node=walker.currentNode;for(const m of node.data.matchAll(/[\p{L}\p{N}]+/gu)){const r=document.createRange();r.setStart(node,m.index);r.setEnd(node,m.index+m[0].length);const rect=r.getClientRects()[0];if(rect)words.push({w:m[0],top:Math.round(rect.top)});}}
  const lines=[];for(const x of words){const line=lines.find(l=>Math.abs(l.top-x.top)<4);if(line)line.words.push(x.w);else lines.push({top:x.top,words:[x.w]});}
  return lines.slice(0,-1).map(l=>l.words.at(-1)).filter(w=>w.length<=2);
});
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
    watch(page);
    if(process.argv.includes('--export')){
      await page.goto(base+'/brand/campaign.html',{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.filter(x=>!x.complete||!x.naturalWidth).length),0,'Campaign image missing');
      for(const id of ['post-food','post-recipes','story-food','social-cover']){
        const target=page.locator('#'+id);
        const image=await target.screenshot();
        if(id==='social-cover')await sharp(image).jpeg({quality:91}).toFile(path.join(root,'brand',id+'.jpg'));
        else fs.writeFileSync(path.join(root,'brand',id+'.png'),image);
        report.push('Exported '+id+' '+JSON.stringify(await target.boundingBox()));
      }
    }
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:1000});
      await page.goto(base+'/',{waitUntil:'networkidle'});
      assert.match(await page.title(),/^PlateLoop/);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);
      // Section order: the video scenario leads, calories come after the example.
      assert.deepEqual(await page.locator('main > section').evaluateAll(xs=>xs.map(x=>x.id||x.className)),['top','how','example','calories','telegram','author','faq','cta-final'],'Section order changed');
      assert.equal((await page.locator('h1').innerText()).replace(/\s+/g,' '),'Рецепт із Reels чи TikTok — текстом і зі списком покупок.');
      assert.deepEqual(await h1DanglingWords(page),[],`h1 line ends with a short word at ${width}px`);
      assert.equal(await page.locator('.hero-photo').getAttribute('fetchpriority'),'high');
      assert.doesNotMatch(await page.locator('.hero-chat-card').innerText(),/ккал/,'Hero result must not show calories');
      await page.locator('#example').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.phone-tour').count(),1,'The example must use one phone');
      assert.deepEqual(await page.locator('#example .tab').allInnerTexts(),['Рецепт','Список покупок']);
      for(const name of ['recipe','shop']){
        await page.locator('#tab-'+name).click();
        assert.equal(await page.locator('#tab-'+name).getAttribute('aria-selected'),'true');
        assert.equal(await page.locator('#scene-'+name).isVisible(),true);
        assert.equal(await page.locator(`[data-flow=${name}]`).isVisible(),true);
      }
      await page.locator('#tab-shop').press('Home');
      assert.equal(await page.locator('#tab-recipe').getAttribute('aria-selected'),'true');
      assert.equal(await page.locator('[data-flow=shop]').isVisible(),false);
      await page.locator('#tab-recipe').press('ArrowLeft');
      assert.equal(await page.locator('#tab-shop').getAttribute('aria-selected'),'true');
      await page.locator('#tab-shop').press('ArrowRight');
      assert.equal(await page.locator('#scene-recipe').isVisible(),true);
      assert.equal(await page.locator('#scene-shop').isVisible(),false);
      // The phone grows with its content; nothing in the recipe card may be cut off.
      assert.equal(await page.locator('.phone-screen').evaluate(s=>[...s.querySelectorAll('.scene:not([hidden]) *')].every(e=>e.getBoundingClientRect().bottom<=s.getBoundingClientRect().bottom+0.5)),true,'Phone mock clips content');
      // The bot's real labels on the recipe card and the shopping list.
      const recipeText=await page.locator('#scene-recipe').innerText();
      for(const label of ['🍽 Записати','🛒 У покупки','☆ Улюблене','🗑 Видалити'])assert(recipeText.includes(label),'Missing recipe button '+label);
      assert.doesNotMatch(recipeText,/ккал/,'The recipe card must not show calories');
      assert.equal(await page.locator('#calories .diary-chat').isVisible(),true,'Calorie scene missing');
      assert.equal(await page.locator('#example .after-demo a[data-site="botUrl"]').count(),1,'Second CTA after the example is missing');
      const mainText=await page.locator('main').innerText();
      assert.doesNotMatch(mainText,/тестуванн|КБЖВ|перешли/i,'Forbidden wording on the page');
      assert.doesNotMatch(mainText,/(^|[^\p{L}])(ви|вас|вам|ваш\p{L}*|дочитали|вирішите|пишіть)(?![\p{L}])/iu,'Formal «ви» address remains');
      const neutralText=await page.locator('main').evaluate(m=>{const c=m.cloneNode(true);c.querySelectorAll('.author-quote').forEach(x=>x.remove());return c.textContent;});
      assert.doesNotMatch(neutralText,/(^|[^\p{L}])(з[’']їв|хотів|приготував|дочитав|сам)(?![\p{L}])/iu,'Masculine-only second-person form outside the author quote');
      assert.doesNotMatch(neutralText.replace(/нової апки/,''),/апк/i,'Use «застосунок» outside the hero note');
      assert.deepEqual(await page.locator('main a.btn').allInnerTexts().then(xs=>[...new Set(xs.map(x=>x.trim()))]),['Відкрити в Telegram'],'Only one primary action is allowed');
      await page.locator('#faq').scrollIntoViewIfNeeded();
      await page.locator('summary').nth(1).click();
      assert.equal(await page.locator('.faq details').nth(1).getAttribute('open'),'');
      const links=await page.locator('a[data-site="botUrl"]').evaluateAll(xs=>xs.map(x=>x.href));
      assert(links.length>=4&&links.every(x=>x==='https://t.me/plateloop_bot?start=web_plateloop'),'Bot links changed or missing');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://plateloop.app/');
      assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://plateloop.app/img/og-recipe.jpg');
      assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute('content'),'https://plateloop.app/img/og-recipe.jpg');
      const description=await page.locator('meta[name="description"]').getAttribute('content');
      assert.equal(description,'Надішли боту посилання на кулінарне відео — отримай рецепт текстом і список покупок. Без реєстрації й окремого застосунку.');
      for(const sel of ['meta[property="og:description"]','meta[name="twitter:description"]'])assert.equal(await page.locator(sel).getAttribute('content'),description,'Description differs: '+sel);
      const data=JSON.parse(await page.locator('#jsonld').textContent());
      assert(data['@graph'].some(x=>x.name==='PlateLoop у Telegram'));
      assert.equal(data['@graph'].find(x=>x['@type']==='WebSite').description,description);
      const app=data['@graph'].find(x=>x['@type']==='SoftwareApplication');
      assert.equal(app.image,'https://plateloop.app/img/og-recipe.jpg');
      assert.match(app.description,/відео/);assert.match(app.description,/оцінки поживності приблизні/);
      const faq=data['@graph'].find(x=>x['@type']==='FAQPage');
      const visibleFaq=await page.locator('.faq details').evaluateAll(xs=>xs.map(x=>({question:x.querySelector('summary').textContent.trim(),answer:x.querySelector('p').textContent.trim()})));
      assert.deepEqual(faq.mainEntity.map(x=>({question:x.name,answer:x.acceptedAnswer.text})),visibleFaq,'Structured FAQ differs from visible product information');
      assert.deepEqual(visibleFaq.map(x=>x.question),['Чи потрібен окремий застосунок?','З яких платформ можна надіслати відео?','Що робити, якщо в рецепті помилка або бракує кількостей?','Чи треба реєструватися і що бот про мене зберігає?','Скільки це коштує?','Як користуватися списком покупок?','Як подивитися записи й підсумок дня?','Наскільки точний підрахунок калорій?','Що означає бета і де залишити відгук?'],'FAQ list changed');
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'),await page.title(),'Social title differs from page title');
      assert.equal(await page.title(),'PlateLoop — рецепти з Reels і TikTok у Telegram: текстом і зі списком покупок');
      const missingAnchors=await page.locator('a[href^="#"]').evaluateAll(xs=>xs.filter(x=>!document.getElementById(x.getAttribute('href').slice(1))).map(x=>x.getAttribute('href')));
      assert.deepEqual(missingAnchors,[],'Navigation points to missing sections');
      await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0);});
      assert.equal(await page.locator('img').evaluateAll(xs=>xs.filter(x=>!x.complete||!x.naturalWidth).length),0,'Broken page image');
      const brokenHeading=await page.locator('h1,h2,h3').evaluateAll(xs=>xs.filter(h=>{const r=document.createRange();r.selectNodeContents(h);const lines=[...r.getClientRects()].filter(x=>x.width>0);const last=lines.at(-1);return lines.length>1&&last&&last.width<24;}).map(h=>h.textContent.trim()));
      assert.deepEqual(brokenHeading,[],`Orphaned heading line at ${width}px`);
      await page.screenshot({path:path.join(out,`landing-${width}.png`),fullPage:true});
      report.push(`PASS ${width}px: no overflow, section order, metadata, example tabs, keyboard, real bot labels, FAQ = JSON-LD, Telegram links, all images loaded`);
    }
    // Hero above the fold on a small phone, with the sticky header present.
    {
      const phone=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,reducedMotion:'reduce'});
      const p=watch(await phone.newPage());await p.goto(base+'/',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
      assert.equal(await p.evaluate(()=>scrollY),0);
      const boxes=await p.evaluate(()=>Object.fromEntries([['h1','.hero h1'],['lead','.hero .lead'],['button','#hero-cta'],['link','.hero-chat-card .preview-link'],['recipe','.hero-chat-card .preview-message'],['header','#header']].map(([k,s])=>{const r=document.querySelector(s).getBoundingClientRect();return [k,{top:r.top,bottom:r.bottom}];})));
      assert.equal(await p.locator('#header').evaluate(e=>getComputedStyle(e).position),'sticky','Header is not sticky');
      assert.deepEqual(await h1DanglingWords(p),[],'h1 line ends with a short word at 375px');
      assert.equal(await p.locator('#header .btn-sm').isVisible(),false,'Header CTA should wait until the page scrolls on a phone');
      for(const k of ['h1','lead','button','link','recipe'])assert(boxes[k].top>=boxes.header.bottom-0.5&&boxes[k].bottom<=812,`${k} not fully above the fold at 375x812: ${JSON.stringify(boxes[k])}`);
      await p.screenshot({path:path.join(out,'hero-375x812.png')});
      await p.evaluate(()=>window.scrollTo(0,600));await p.waitForFunction(()=>document.getElementById('header').classList.contains('is-scrolled'));
      assert.equal(await p.locator('#header .btn-sm').isVisible(),true,'Header CTA missing after scrolling');
      report.push(`PASS 375x812: h1, lead, hero button and example card above the fold (button bottom ${boxes.button.bottom.toFixed(1)}px, hero card recipe line bottom ${boxes.recipe.bottom.toFixed(1)}px of 812)`);
      // Source attribution: known utm_source maps to an allowlisted token; anything else stays on the default.
      for(const [query,token] of [['?utm_source=threads','threads_organic'],['?utm_source=Instagram','ig_organic'],['?utm_source=tt','tt_organic'],['?utm_source=TG','tg_channel'],['?utm_source=evil_source%26x','web_plateloop'],['?utm_source=','web_plateloop'],['','web_plateloop']]){
        await p.goto(base+'/'+query,{waitUntil:'networkidle'});
        const hrefs=await p.locator('a[data-site="botUrl"]').evaluateAll(xs=>xs.map(x=>x.href));
        assert(hrefs.length>=4&&hrefs.every(x=>x===`https://t.me/plateloop_bot?start=${token}`),`utm_source ${query||'(none)'} should give start=${token}: ${hrefs[0]}`);
        const ld=JSON.parse(await p.locator('#jsonld').textContent());
        assert.deepEqual(ld['@graph'].find(x=>x.sameAs).sameAs,['https://t.me/plateloop_bot?start=web_plateloop']);
      }
      await phone.close();
      report.push('PASS utm_source → start token (threads → threads_organic; unknown/absent → web_plateloop)');
    }
    // Once chosen, an example must not switch itself while a visitor is reading.
    const manual=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
    const demo=watch(await manual.newPage());await demo.clock.install();await demo.goto(base+'/',{waitUntil:'networkidle'});
    await demo.locator('#example').scrollIntoViewIfNeeded();await demo.locator('#tab-shop').click();await demo.clock.runFor(16000);
    assert.equal(await demo.locator('#tab-shop').getAttribute('aria-selected'),'true','The demo changes without user input');
    await manual.close();
    const og=await page.request.get(base+'/img/og-recipe.jpg');
    assert.equal(og.status(),200,'docs/img/og-recipe.jpg is missing');
    const ogMeta=await sharp(await og.body()).metadata();
    assert.deepEqual([ogMeta.format,ogMeta.width,ogMeta.height],['jpeg',1200,630],'og-recipe.jpg must be a 1200×630 JPEG');
    report.push('PASS manual demo behavior; og-recipe.jpg is a 1200×630 JPEG');
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+'/brand/',{waitUntil:'networkidle'});
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0);});
    await page.screenshot({path:path.join(out,'brand-kit.png'),fullPage:true});
    if(!process.argv.includes('--export')){
      const urls=await page.locator('a[href],img[src]').evaluateAll(xs=>xs.map(x=>x.href||x.src).filter(x=>x.startsWith(location.origin)));
      for(const url of new Set(urls)){const response=await page.request.get(url);assert.equal(response.status(),200,`Broken asset ${url}`);}
      assert.equal(await page.locator('.icon-grid .asset').count(),12);
      report.push('PASS brand kit: every local download, photo, logo, preview and archive returns HTTP 200; 12 icons');
    }
    await page.setViewportSize({width:390,height:844});await page.goto(base+'/brand/',{waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Brand kit mobile overflow');
    // The product must remain readable without JavaScript.
    const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const plain=watch(await noJs.newPage());await plain.goto(base+'/',{waitUntil:'load'});
    assert.equal(await plain.locator('#example-title').isVisible(),true);
    assert.equal(await plain.locator('#header .btn-sm').isVisible(),true,'Header CTA hidden without JavaScript');
    assert.equal(await plain.locator('h1').isVisible(),true);
    for(const id of ['scene-recipe','scene-shop'])assert.equal(await plain.locator('#'+id).isVisible(),true,'Demo content missing without JavaScript: '+id);
    for(const flow of ['recipe','shop'])assert.equal(await plain.locator(`[data-flow=${flow}]`).isVisible(),true,'Example copy missing without JavaScript: '+flow);
    assert.equal(await plain.locator('#calories .diary-chat').isVisible(),true,'Calorie scene missing without JavaScript');
    assert(await plain.locator('a[data-site="botUrl"]').evaluateAll(xs=>xs.every(x=>x.href==='https://t.me/plateloop_bot?start=web_plateloop')),'Static bot links must use web_plateloop');
    await noJs.close();
    assert.deepEqual(errors,[],'Browser errors, console errors or failed requests');
    report.push('PASS no JavaScript fallback and mobile brand kit; no page/console errors or failed requests');
    fs.writeFileSync(path.join(out,'verification.txt'),report.join('\n')+'\n');
    console.log(report.join('\n'));
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
