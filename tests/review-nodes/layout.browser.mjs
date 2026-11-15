// Layout regression: load the actual components and both review stylesheets.
// Uses synthetic records only; no provider or production requests.
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
import React from 'react';import {createRoot} from 'react-dom/client';import {ReviewHub} from './src/ReviewHub';import './src/IntakeTeacherReview.css';import './src/styles.css';
const node={id:'r1',label:'Starting point',fromSession:1,toSession:1,suggestedSession:1,includePreviousBlock:true};const student={studentId:'g001',studentName:'Sample Student',teamNumber:1};
const hub={config:{sessionAI:true,previousBlockId:null,nodes:[node]},version:1,students:[student],reviews:[],legacy:[]};
const blank={workflow:'core.v1',teacherObservation:'',coreSourceObservation:'',coreEdited:false,coreReview:{confirmedProgress:[],mainIssues:[],nextSteps:[]}};
const workspace={review:{version:0,summaryRevision:1,correctionOpen:false,draft:blank,privateNote:'',published:null,history:[],studentRecord:null,node,sourceSnapshot:{updates:[],missingSessions:[1]},sourceChanged:false},preparation:{status:'ready',result:{progress:'Student reports a working interface.',feedback:'Check the code.',questions:['Show the interface.','Explain the request handling.','Show a test.']},sourceChanged:false},feedback:{status:'empty',result:null,sourceChanged:false},legacyDraft:null};
const client={rpc:async name=>({data:name==='get_studio_review_hub'?hub:name==='open_teacher_node_review'?'synthetic-review':structuredClone(workspace)})};
createRoot(document.getElementById('root')!).render(<div style={{minHeight:2400,padding:16}}><ReviewHub client={client as any} blockId="class" blocks={[]} onBlockChange={()=>{}} onUnsaved={()=>{}}/></div>);
`,
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  outfile: ".test-build/node-layout.js",
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.STUDIO_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 900, height: 700 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (r) => r.abort());
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({
      content: fs
        .readFileSync(".test-build/node-layout.css", "utf8")
        .replace(/@import[^;]+;/g, ""),
    });
    await page.addScriptTag({
      content: fs.readFileSync(".test-build/node-layout.js", "utf8"),
    });
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();
    await page.getByLabel("Teacher observation", { exact: true }).waitFor();
    const layout = await page
      .locator(".node-review-workspace")
      .evaluate((e) => ({
        width: e.clientWidth,
        display: getComputedStyle(e).display,
      }));
    const main = await page.locator(".core-review-content").boundingBox();
    const body = page.locator(".core-review-body"),
      box = await body.boundingBox();
    assert.equal(layout.display, "flex");
    assert.ok(
      main.width >= layout.width * 0.98,
      "Main pane must fill the dialog workspace",
    );
    assert.ok(
      box.width >= Math.min(900, layout.width * 0.8),
      "Body must not collapse into the legacy 220px roster column",
    );
    const y = await page.evaluate(() => window.scrollY);
    await body.hover();
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(150);
    assert.ok((await body.evaluate((e) => e.scrollTop)) > 0);
    assert.equal(await page.evaluate(() => window.scrollY), y);
    const footer = await page.locator(".core-review-savebar").boundingBox();
    assert.ok(footer.y >= 0 && footer.y + footer.height <= viewport.height + 1);
    fs.mkdirSync(".test-build/node-layout-screenshots", { recursive: true });
    await page.screenshot({
      path: ".test-build/node-layout-screenshots/" + viewport.width + ".png",
    });
    assert.deepEqual(errors, []);
    await page.close();
    console.log("PASS independent review width and scroll " + viewport.width);
  }
} finally {
  await browser.close();
}
