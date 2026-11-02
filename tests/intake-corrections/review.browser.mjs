// Run with local Vite on :5179 and Playwright available in the test environment.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5179/tests/intake-corrections/review-preview.html');
 await page.getByRole('heading',{name:'Work and progress',exact:true}).waitFor();await page.getByText('Review · 1 of 4').waitFor();
 assert.equal(await page.locator('textarea').count(),0);assert.ok(await page.getByText('CampusGuide is about 85% complete.',{exact:false}).isVisible());
 await page.screenshot({path:'/tmp/correction-review-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/correction-review-mobile.png'});
 await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Your role',{exact:true}).fill('AI workflow and regression testing');await page.getByRole('button',{name:'Done editing'}).click();
 await page.getByRole('button',{name:'Looks right · Continue'}).click();await page.getByText('Review · 2 of 4').waitFor();
 await page.getByRole('button',{name:'Looks right · Continue'}).click();await page.getByText('Review · 3 of 4').waitFor();
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Next step (optional)',{exact:true}).fill('Run ten common campus questions.');await page.getByRole('button',{name:'Done editing'}).click();await page.getByRole('button',{name:'Looks right · Continue'}).click();await page.getByText('Review · 4 of 4').waitFor();
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Save check-in'}).click();await page.waitForFunction(()=>document.body.dataset.saved==='true');
 const saved=await page.evaluate(()=>window.savedCorrection);assert.equal(saved.name,'reconfirm_my_intake_summary');assert.equal(saved.payload.p_revision,2);assert.equal(saved.payload.p_student_record.responsibility.current,'AI workflow and regression testing');assert.equal(saved.payload.p_student_record.next_action.action,'Run ten common campus questions.');assert.equal(saved.payload.p_student_record.claims[0].completion_percent,85);assert.equal(saved.payload.p_student_record.claims[0].scope,'Question-answering workflow');assert.equal(saved.payload.p_student_record.dependencies.length,1);assert.deepEqual(errors,[]);
 console.log('PASS: desktop/mobile preview, four review steps, edit, confirm and lossless correction submission');
}finally{await browser.close();}
