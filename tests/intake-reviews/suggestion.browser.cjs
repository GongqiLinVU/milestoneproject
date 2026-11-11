const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {chromium}=require('playwright');
test('explicit generation, regeneration, adoption, autosave, publication and student switch',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/.test-build/review-origin.html').catch(()=>{});
 await page.setContent('<div id="root"></div>');
 await page.addStyleTag({content:fs.readFileSync('.test-build/review-preview.css','utf8').replace(/@import[^\n]*\n/g,'')});
 let calls=0;
 await page.route('**/api/review-suggestion',async route=>{calls++;await route.fulfill({json:{suggestion:{progress:'S4: Student reports API integration.',feedback:'Student reports API work; demonstrate it in this review.',questions:['Can you demonstrate the API?'],currentSession:4,baselineSession:3,generatedAt:new Date().toISOString()}}});});
 await page.addScriptTag({content:fs.readFileSync('.test-build/review-preview.js','utf8')});
 await page.getByRole('button',{name:/Alex Taylor/}).click();
 const feedback=page.getByLabel('Optional review feedback',{exact:true});await feedback.waitFor();assert.equal(calls,0);assert.equal(await page.locator('.review-columns').evaluate(e=>getComputedStyle(e).display),'block');await page.getByRole('button',{name:'View sources',exact:true}).click();await page.getByRole('region',{name:'Review sources'}).waitFor();await page.getByRole('button',{name:'Close sources ×',exact:true}).click();
 await feedback.fill('Teacher observed login only.');
 await page.getByRole('button',{name:'Generate suggestion',exact:true}).click();await page.getByRole('button',{name:'Update suggestion',exact:true}).waitFor();
 assert.equal(await feedback.inputValue(),'Teacher observed login only.');
 await page.getByRole('button',{name:'Update suggestion',exact:true}).click();await page.getByRole('button',{name:'Update suggestion',exact:true}).waitFor();assert.equal(await feedback.inputValue(),'Teacher observed login only.');
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Use suggestion in feedback',exact:true}).click();assert.equal(await feedback.inputValue(),'Teacher observed login only.');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Use suggestion in feedback',exact:true}).click();assert.match(await feedback.inputValue(),/Student reports API work/);
 await feedback.fill('Login demonstrated. API not reviewed. Next: demonstrate failure recovery.');
 await page.waitForFunction(()=>window.reviewCalls.some(c=>c.name==='save_intake_teacher_review'&&c.args.p_draft.quickNotes.startsWith('Login demonstrated.')));
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Publish feedback',exact:true}).click();await page.getByText('Feedback published · student can now see it',{exact:true}).waitFor();
 await page.screenshot({path:'.test-build/review-suggestion-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.screenshot({path:'.test-build/review-suggestion-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:/Morgan Lee/}).click();await page.getByRole('button',{name:'Generate suggestion',exact:true}).waitFor();assert.equal(await feedback.inputValue(),'');assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
