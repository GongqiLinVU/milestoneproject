// Compile preview.tsx first. Uses synthetic RPC responses, never production.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {chromium}=require(process.env.STUDIO_PLAYWRIGHT_MODULE||'playwright');
test('classroom review autosaves, serializes changes, protects failed drafts and shows only published student feedback',async()=>{
 let launch={headless:true};if(process.env.STUDIO_CHROMIUM_MODULE){const bin=(await import(process.env.STUDIO_CHROMIUM_MODULE)).default;launch={...launch,executablePath:await bin.executablePath(),args:bin.args};}
 const browser=await chromium.launch(launch);try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<div id="root"></div>');await page.addStyleTag({content:fs.readFileSync('.test-build/review-preview.css','utf8').replace(/@import[^\n]*\n/g,'')});await page.addScriptTag({content:fs.readFileSync('.test-build/review-preview.js','utf8'),type:'module'});
 await page.getByRole('button',{name:/Alex Taylor/}).click();await page.getByRole('button',{name:'+ Add review item',exact:true}).click();await page.getByLabel(/^Area/).selectOption('Code review');await page.getByLabel('What did you observe?').fill('The application worked in the live demonstration.');await page.getByText('Private teacher note · not visible to students',{exact:true}).click();await page.getByLabel('Only teachers can see this').fill('Private discussion note');await page.getByText(/Draft saved ·/).waitFor();
 await page.evaluate(()=>{window.reviewDelay=350;window.reviewCalls=[];});await page.getByLabel('What did you observe?').fill('First autosave');await page.waitForFunction(()=>window.reviewCalls.some(c=>c.name==='save_intake_teacher_review'));await page.getByLabel('What did you observe?').fill('Second edit while saving');await page.waitForFunction(()=>window.reviewCalls.some(c=>c.name==='save_intake_teacher_review'&&c.args.p_draft.items[0].observation==='Second edit while saving'));await page.waitForTimeout(450);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Publish feedback',exact:true}).click();await page.getByText('Feedback published · student can now see it',{exact:true}).waitFor();
 await page.evaluate(()=>{window.reviewFail=true;});await page.getByLabel('What did you observe?').fill('Unpublished draft after feedback');await page.getByRole('alert').waitFor();
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:/Morgan Lee/}).click();assert.equal(await page.getByLabel('What did you observe?').inputValue(),'Unpublished draft after feedback');
 await page.evaluate(()=>{window.reviewFail=false;window.reviewDelay=0;});await page.getByRole('button',{name:'Retry save',exact:true}).click();await page.getByText(/Draft saved ·/).waitFor();
 await page.locator('.review-content').evaluate(e=>e.scrollTop=0);assert.equal(await page.locator('dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await page.evaluate(()=>window.showStudentFeedback());await page.getByText('Second edit while saving',{exact:true}).waitFor();assert.equal(await page.getByText('Unpublished draft after feedback',{exact:true}).count(),0);assert.equal(await page.getByText('Private discussion note',{exact:true}).count(),0);assert.deepEqual(errors,[]);
 console.log('Desktop/narrow layout, in-flight autosave, publish, failure/retry, unsaved switch and student feedback verified.');
 }finally{await browser.close();}
});
