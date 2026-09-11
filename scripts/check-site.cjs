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
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
      await page.locator('#inside').scrollIntoViewIfNeeded();
      for(const name of ['log','day','plan','shop']){
        await page.locator('#tab-'+name).click();
        assert.equal(await page.locator('#tab-'+name).getAttribute('aria-selected'),'true');
        assert.equal(await page.locator('#scene-'+name).isVisible(),true);
      }
      await page.locator('#tab-shop').press('Home');
      assert.equal(await page.locator('#tab-log').getAttribute('aria-selected'),'true');
      await page.locator('#tab-log').press('ArrowRight');
      assert.equal(await page.locator('#tab-day').getAttribute('aria-selected'),'true');
      await page.locator('#faq').scrollIntoViewIfNeeded();
      await page.locator('summary').nth(1).click();
      assert.equal(await page.locator('.faq details').nth(1).getAttribute('open'),'');
      const links=await page.locator('a[data-site="botUrl"]').evaluateAll(xs=>xs.map(x=>x.href));
      assert(links.length>=3&&links.every(x=>x==='https://t.me/plateloop_bot?start=web_plateloop'),'Bot links changed or missing');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://plateloop.app/');
      assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://plateloop.app/brand/social-cover.jpg');
      const data=await page.locator('#jsonld').textContent();assert(JSON.parse(data)['@graph'].some(x=>x.name==='PlateLoop у Telegram'));
      const faq=JSON.parse(data)['@graph'].find(x=>x['@type']==='FAQPage');
      const visibleFaq=await page.locator('.faq details').evaluateAll(xs=>xs.map(x=>({question:x.querySelector('summary').textContent.trim(),answer:x.querySelector('p').textContent.trim()})));
      assert.deepEqual(faq.mainEntity.map(x=>({question:x.name,answer:x.acceptedAnswer.text})),visibleFaq,'Structured FAQ differs from visible payment or product information');
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'),await page.title(),'Social title differs from page title');
      const missingAnchors=await page.locator('a[href^="#"]').evaluateAll(xs=>xs.filter(x=>!document.getElementById(x.getAttribute('href').slice(1))).map(x=>x.getAttribute('href')));
      assert.deepEqual(missingAnchors,[],'Navigation points to missing sections');
      await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0);});
      assert.equal(await page.locator('img').evaluateAll(xs=>xs.filter(x=>!x.complete||!x.naturalWidth).length),0,'Broken page image');
      await page.screenshot({path:path.join(out,`landing-${width}.png`),fullPage:true});
      report.push(`PASS ${width}px: no overflow, PlateLoop metadata, 4 tabs, keyboard, FAQ, Telegram links, all images loaded`);
    }
    await page.goto(base+'/?scene=plan',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#scene-plan').isVisible(),true,'Deep link does not select the requested demo');
    await page.locator('#tab-plan').press('End');
    await page.locator('#tab-shop').press('ArrowRight');
    assert.equal(await page.locator('#tab-log').getAttribute('aria-selected'),'true','Keyboard navigation does not wrap');
    // Once chosen, an example must not switch itself while a visitor is reading.
    const manual=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
    const demo=await manual.newPage();await demo.clock.install();await demo.goto(base+'/?scene=plan',{waitUntil:'networkidle'});
    await demo.locator('#inside').scrollIntoViewIfNeeded();await demo.clock.runFor(16000);
    assert.equal(await demo.locator('#tab-plan').getAttribute('aria-selected'),'true','The demo changes without user input');
    await manual.close();
    report.push('PASS payment FAQ matches JSON-LD; navigation anchors, social titles, deep links and manual demo behavior');
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
    const plain=await noJs.newPage();await plain.goto(base+'/',{waitUntil:'load'});
    assert.equal(await plain.locator('#how-title').evaluate(e=>getComputedStyle(e.closest('.reveal')).opacity),'1');
    assert.equal(await plain.locator('h1').isVisible(),true);
    for(const name of ['log','day','plan','shop'])assert.equal(await plain.locator('#scene-'+name).isVisible(),true,'Demo content missing without JavaScript: '+name);
    await noJs.close();
    assert.deepEqual(errors,[],'Browser JavaScript errors');
    report.push('PASS no JavaScript fallback and mobile brand kit; no JavaScript errors');
    fs.writeFileSync(path.join(out,'verification.txt'),report.join('\n')+'\n');
    console.log(report.join('\n'));
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
