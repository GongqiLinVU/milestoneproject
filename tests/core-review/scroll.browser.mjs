// Real DOM/layout regression with synthetic records; no production or provider requests.
import { buildSync } from "esbuild";
import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.STUDIO_PLAYWRIGHT_MODULE || "playwright"
);
buildSync({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {TeacherIntakeReviews} from './src/IntakeTeacherReview';import './src/styles.css';
const rows=Array.from({length:27},(_,i)=>({studentName:'Student '+i,studentId:'s'+i,teamName:'Team '+(i+1),intakeId:'intake-'+i,submitted:true}));
const record={responsibility:{current:'Frontend',change_from_previous:'initial'},claims:[],evidence:[],testing:[],dependencies:[],blocker:{status:'unknown',description:''},next_action:{action:'',due_session:'S2',expected_evidence:''}};
const workspace={review:{version:0,summaryRevision:1,correctionOpen:false,draft:{workflow:'core.v1',teacherObservation:'',coreSourceObservation:'',coreEdited:false,coreReview:{confirmedProgress:[],mainIssues:[],nextSteps:[]}},privateNote:'',published:null,history:[],studentRecord:record},preparation:{status:'ready',result:{progress:'Student reports a working interface. More evidence is needed.',questions:['Show the working interface.','Explain the request handling.','Show a test.']},sourceChanged:false},feedback:{status:'empty',result:null,sourceChanged:false},legacyDraft:null};
const client={rpc:async name=>({data:name==='get_teacher_intake_review_states'?[]:structuredClone(workspace)})};
function App(){const [open,setOpen]=useState(false);return <><div style={{height:2400,padding:30}}><button onClick={()=>setOpen(true)}>Open review</button><p>Background page</p></div>{open&&<TeacherIntakeReviews client={client as any} sessionId="test" title="S6 · Review" rows={rows as any} renderSource={()=>null} onClose={()=>setOpen(false)}/>}</>;}createRoot(document.getElementById('root')!).render(<App/>);
`,
  },
  bundle: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  outfile: ".test-build/review-scroll.js",
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.STUDIO_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1440, height: 600 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (route) => route.abort());
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({
      content: fs
        .readFileSync(".test-build/review-scroll.css", "utf8")
        .replace(/@import[^;]+;/g, ""),
    });
    await page.addScriptTag({
      content: fs.readFileSync(".test-build/review-scroll.js", "utf8"),
    });
    await page
      .getByRole("button", { name: "Open review", exact: true })
      .click();
    await page.getByRole("button", { name: "Student 0", exact: false }).click();
    await page.getByLabel("Teacher observation", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.style.overflow),
      "hidden",
    );
    const body = page.locator(".core-review-body"),
      roster = page.locator(".review-roster");
    const before = await page.evaluate(() => window.scrollY);
    assert.ok(
      await body.evaluate((e) => e.scrollHeight > e.clientHeight),
      "Core body must overflow within a bounded pane",
    );
    await body.hover();
    await page.mouse.wheel(0, 650);
    await page.waitForTimeout(150);
    assert.ok(
      (await body.evaluate((e) => e.scrollTop)) > 0,
      "Wheel must scroll the core body",
    );
    assert.equal(await page.evaluate(() => window.scrollY), before);
    const footer = await page.locator(".core-review-savebar").boundingBox();
    assert.ok(
      footer.y >= 0 && footer.y + footer.height <= viewport.height + 1,
      "Completion stays inside viewport",
    );
    await body.evaluate((e) => (e.scrollTop = e.scrollHeight));
    await body.hover();
    await page.mouse.wheel(0, 650);
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => window.scrollY),
      before,
      "Scrolling at the end cannot move the background",
    );
    if (viewport.width > 650) {
      await roster.hover();
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(100);
      assert.ok(
        (await roster.evaluate((e) => e.scrollTop)) > 0,
        "Roster scrolls independently",
      );
    }
    fs.mkdirSync(".test-build/review-scroll-screenshots", { recursive: true });
    await page.screenshot({
      path:
        ".test-build/review-scroll-screenshots/" +
        viewport.width +
        "x" +
        viewport.height +
        ".png",
    });
    await page
      .getByRole("button", { name: "Close classroom review", exact: true })
      .click();
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert.equal(
      await page.evaluate(() => document.documentElement.style.overflow),
      "",
    );
    await page.mouse.move(50, 200);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(150);
    assert.ok(
      (await page.evaluate(() => window.scrollY)) > before,
      "Background scroll restores on close",
    );
    assert.deepEqual(errors, []);
    await page.close();
    console.log("PASS review scroll " + viewport.width + "x" + viewport.height);
  }
} finally {
  await browser.close();
}
