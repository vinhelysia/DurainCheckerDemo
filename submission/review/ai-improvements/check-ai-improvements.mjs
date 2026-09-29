// Local AI UI QA. Classification/auth/cloud are fixtures; document OCR and PDF extraction are real.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=fileURLToPath(new URL('./',import.meta.url));
const fixtures=path.join(output,'fixtures');
const lifecycleOnly=process.argv.includes('--document-lifecycle');
const runtime=process.env.RUNTIME_NODE_MODULES || 'C:/Users/Vinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=createRequire(import.meta.url)(`${runtime}/playwright`);
const base='http://127.0.0.1:5178/DurainCheckerDemo/';
const batchId='21c3a513-e847-4131-bd2d-93b9e581eea2';
const batch={id:batchId,code:'QA-AI-MINH-HOA',farm:'HTX kiểm thử QA · dữ liệu fixture',province:'Lâm Đồng',variety:'Ri6',weight_kg:850,harvest_date:'2026-09-28',is_public:false};
Object.assign(process.env,{VITE_SUPABASE_URL:'https://auth.example.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'public-ui-test-key',VITE_GOOGLE_AUTH_ENABLED:'true',VITE_API_BASE_URL:base+'test-api'});
await fs.mkdir(fixtures,{recursive:true});
let server,browser,page,leafMode='high',releaseLeaf,holdModels=lifecycleOnly;
const releaseModels=[];
const blocked=[],ocrAssets=[],ocrResponses=[],leafRequests=[],errors=[],checks=[],documentResults=[];
try{
  server=await createServer({root,optimizeDeps:{entries:['index.html']},server:{host:'127.0.0.1',port:5178,strictPort:true,watch:{ignored:['**/submission/**','**/tmp/**']}}});await server.listen();
  console.log('Local Vite ready on port 5178');
  browser=await chromium.launch({executablePath:process.env.TEST_CHROMIUM || 'C:/Users/Vinh/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  context.on('response',response=>{if(response.url().includes('cdn.jsdelivr.net/gh/naptha/tessdata@'))ocrResponses.push({url:response.url(),status:response.status()});});
  if(lifecycleOnly)await context.addInitScript(()=>{
    window.aiQaActiveWorkers=0;const OriginalWorker=window.Worker;
    window.Worker=class extends OriginalWorker{
      constructor(...args){super(...args);this.qaTracked=String(args[0]).includes('/ocr/');if(this.qaTracked)window.aiQaActiveWorkers++;}
      terminate(){if(this.qaTracked){this.qaTracked=false;window.aiQaActiveWorkers--;}return super.terminate();}
    };
  });
  const maker=await context.newPage();
  const documentHtml=dates=>`<html lang="vi"><meta charset="UTF-8"><style>body{margin:0;padding:55px;font:32px Arial;background:white;color:#111}h1{font-size:42px;margin:0 0 42px}p{margin:28px 0}.note{font-size:24px;margin-top:55px}</style><h1>TÀI LIỆU QA LOCAL</h1><p>Nguồn: HTX Kiểm thử QA</p>${dates.map(date=>`<p>Ngày tài liệu: ${date}</p>`).join('')}<p>Mã lô: QA-AI-MINH-HOA</p><p class="note">DỮ LIỆU KIỂM THỬ. Không phải phiếu lab thật.</p></html>`;
  await maker.setViewportSize({width:1200,height:700});
  await maker.setContent(documentHtml(['27/09/2026']));
  await maker.screenshot({path:path.join(fixtures,'document-vietnamese-qa.png')});
  await maker.setContent('<html lang="en"><meta charset="UTF-8"><style>body{margin:0;padding:55px;font:32px Arial;background:white;color:#111}h1{font-size:42px}p{margin:28px 0}</style><h1>LOCAL QA TEST DOCUMENT</h1><p>Source: QA English Lab</p><p>Document date: 2026-09-27</p><p>TEST DATA ONLY. Not a real lab report.</p></html>');
  await maker.screenshot({path:path.join(fixtures,'document-english-qa.png')});
  await maker.setViewportSize({width:480,height:360});
  await maker.setContent('<html><style>body{margin:0;background:#eaf1e8;text-align:center;font:20px Arial}.leaf{width:170px;height:230px;border-radius:80% 0 80% 0;background:#426941;margin:25px auto}</style><div class="leaf"></div><p>QA synthetic leaf · not a real specimen</p></html>');
  await maker.screenshot({path:path.join(fixtures,'leaf-synthetic-qa.png')});
  await maker.setContent('<html><style>body{margin:0;background:white}</style></html>');
  await maker.screenshot({path:path.join(fixtures,'blank-qa.png')});
  await maker.close();
  execFileSync(process.env.TEST_PYTHON || 'C:/Users/Vinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-c',`
import os, sys
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
folder=sys.argv[1]
pdfmetrics.registerFont(TTFont('QAArial', 'C:/Windows/Fonts/arial.ttf'))
for name, dates in [('document-text-qa.pdf',['27/09/2026']),('document-ambiguous-qa.pdf',['02/03/2026','04/05/2026'])]:
    pdf=canvas.Canvas(os.path.join(folder,name),pagesize=(595,842))
    pdf.setFont('QAArial',22)
    lines=['TÀI LIỆU QA LOCAL','Nguồn: HTX Kiểm thử QA']+['Ngày tài liệu: '+date for date in dates]+['Mã lô: QA-AI-MINH-HOA','DỮ LIỆU KIỂM THỬ. Không phải phiếu lab thật.']
    for i,line in enumerate(lines):
        pdf.drawString(30,780-i*55,line)
    pdf.save()
pdf=canvas.Canvas(os.path.join(folder,'document-scanned-qa.pdf'),pagesize=(595,842))
pdf.drawImage(os.path.join(folder,'document-vietnamese-qa.png'),0,400,width=595,height=347)
pdf.save()
`,fixtures],{timeout:15000});
  console.log('Synthetic QA fixtures ready');
  await fs.writeFile(path.join(fixtures,'unsafe-qa.html'),'<p>LOCAL QA ONLY. Unsupported file type.</p>');
  await fs.writeFile(path.join(fixtures,'oversized-qa.png'),Buffer.alloc(5*1024*1024+1));
  await fs.writeFile(path.join(fixtures,'empty-qa.png'),Buffer.alloc(0));
  await fs.writeFile(path.join(fixtures,'corrupt-qa.png'),Buffer.from('LOCAL QA ONLY: deliberately invalid PNG bytes.'));
  await context.route(url=>new URL(url).origin!==new URL(base).origin,async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='cdn.jsdelivr.net'&&/^\/gh\/naptha\/tessdata@806cd9adc8c6e8abc11c782db1818c990576bebc\/4\.0\.0_best_int\/(?:vie|eng)\.traineddata\.gz$/.test(url.pathname)&&route.request().method()==='GET'){
      ocrAssets.push(url.href);if(holdModels)await new Promise(resolve=>releaseModels.push(resolve));return route.continue();
    }
    blocked.push(url.href);return route.abort();
  });
  await context.route('**/src/lib/cloudClient.js',route=>route.fulfill({contentType:'application/javascript',body:`
    export {validateEvidenceFile} from '${base}src/lib/cloudClient.js?actual=1';
    window.aiQa={requests:[],uploadCalls:0,signedIn:false};
    export const googleLoginEnabled=true;
    export const cloudError=error=>error.message||'Local fixture error';
    export const completeCloudSignIn=()=>Promise.resolve();
    export const supabase={auth:{onAuthStateChange(cb){window.aiQa.session=cb;setTimeout(()=>cb('INITIAL_SESSION',window.aiQa.signedIn?{user:{id:'qa-local',email:'htx-qa@example.com'}}:null),0);return{data:{subscription:{unsubscribe(){}}}}},async signOut(){window.aiQa.signedIn=false;window.aiQa.session('SIGNED_OUT',null);return{error:null}}}};
    export async function signInWithGoogle(){window.aiQa.signedIn=true;window.aiQa.session('SIGNED_IN',{user:{id:'qa-local',email:'htx-qa@example.com'}})}
    export async function cloudRequest(route,options={},publicRead=false){
      window.aiQa.requests.push({route,method:options.method||'GET',publicRead});
      if(options.method&&options.method!=='GET')throw new Error('Cloud writes are outside this local QA');
      if(!publicRead&&!window.aiQa.signedIn)throw new Error('Please sign in');
      if(route.startsWith('/batches?'))return [${JSON.stringify(batch)}];
      if(route==='/batches/${batchId}/events'||route==='/batches/${batchId}/evidence')return [];
      if(route==='/batches/${batchId}')return {...${JSON.stringify(batch)},is_public:publicRead};
      throw new Error('Unexpected fixture route: '+route);
    }
    export async function uploadEvidence(){window.aiQa.uploadCalls++;throw new Error('No upload permitted in this QA')}
    export async function downloadEvidence(){throw new Error('No download permitted in this QA')}
  `}));
  await context.route('**/test-api/api/predict_leaf',async route=>{
    leafRequests.push({mode:leafMode,bytes:route.request().postDataBuffer()?.length||0,bodyHasNotes:(route.request().postData()||'').includes('QA-NOTE-DO-NOT-SEND')});
    if(leafMode==='loading'){await new Promise(resolve=>{releaseLeaf=resolve;});return route.fulfill({status:503,contentType:'application/json',body:'{"error":"QA model unavailable"}'});}
    const uncertain=leafMode==='uncertain';
    await route.fulfill({contentType:'application/json',body:JSON.stringify({disease:'healthy',probability:uncertain?0.29:0.97,decision:'needs_review',score_is_calibrated:false,review_reasons:uncertain?['field_validation_pending','low_model_score','similar_scores','low_image_contrast']:['field_validation_pending']})});
  });
  page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  async function language(lang){await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();await page.waitForFunction(value=>document.documentElement.lang===value,lang);}
  async function capture(name,selector){
    const target=page.locator(selector).first();await target.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: page overflow`);
    await target.screenshot({path:path.join(output,name+'.png'),style:'.site-header,.site-header *,.skip-link,.language-switch{visibility:hidden !important}'});
  }
  async function screens(name,selector,verify){for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await capture(name+'-'+width,selector);await verify?.();}}
  for(const lang of lifecycleOnly?[]:['vi','en']){
    console.log('Checking leaf UI '+lang);
    await page.goto(base+'#/unit/demo',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.leaf-scanner-card').waitFor();await language(lang);
    const image=page.locator('#leaf-image-input'),notes=page.locator('.scanner-remedy-box textarea');
    leafMode='high';await image.setInputFiles(path.join(fixtures,'leaf-synthetic-qa.png'));
    await page.locator('.leaf-scanner-results').waitFor();
    assert.match(await page.locator('.scanner-remedy-box').innerText(),lang==='vi'?/Cần kiểm tra thủ công/:/Manual review required/);
    assert.match(await page.locator('.scanner-result-details').innerText(),lang==='vi'?/chưa phải chẩn đoán[\s\S]*chưa hiệu chuẩn/:/not a diagnosis[\s\S]*uncalibrated/);
    await notes.fill('QA-NOTE-DO-NOT-SEND');await screens('leaf-high-review-'+lang,'.leaf-scanner-card');
    leafMode='uncertain';await image.setInputFiles(path.join(fixtures,'blank-qa.png'));await page.locator('.scanner-remedy-box').filter({hasText:lang==='vi'?'Chưa đủ tin cậy để kết luận':'Insufficient confidence to conclude'}).waitFor();
    assert.equal(await notes.inputValue(),'');await screens('leaf-uncertain-'+lang,'.leaf-scanner-card');
    leafMode='loading';releaseLeaf=undefined;await image.setInputFiles(path.join(fixtures,'leaf-synthetic-qa.png'));await page.locator('.scanner-loading-state').waitFor();assert.equal(await image.isDisabled(),true);
    await capture('leaf-loading-'+lang+'-390','.leaf-scanner-card');assert.ok(releaseLeaf);releaseLeaf();
    await page.locator('.scanner-error-message').waitFor();await capture('leaf-error-'+lang+'-390','.leaf-scanner-card');
    const count=leafRequests.length;await image.setInputFiles(path.join(fixtures,'oversized-qa.png'));
    await page.locator('.scanner-error-message').filter({hasText:lang==='vi'?'1 byte đến 5 MB':'1 byte and 5 MB'}).waitFor();assert.equal(leafRequests.length,count);
    assert.ok(await page.evaluate(()=>![...Object.values(localStorage),...Object.values(sessionStorage)].some(value=>value.includes('QA-NOTE-DO-NOT-SEND'))));
    checks.push('leaf-'+lang+':highReview,blankUncertain,notesReset,loading,error,oversize');
  }
  assert.ok(leafRequests.every(request=>!request.bodyHasNotes));
  for(const lang of lifecycleOnly?['en']:['vi','en']){
    console.log('Checking document assistant '+lang);
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+'#/manage',{waitUntil:'domcontentloaded',timeout:60000});await language(lang);
    const google=page.getByRole('button',{name:lang==='vi'?'Tiếp tục với Google':'Continue with Google',exact:true});
    await google.waitFor();assert.equal(await page.locator('.document-assistant').count(),0);
    await google.click();await page.locator('.cloud-account').waitFor();
    await page.locator('.cloud-batch-choice').filter({hasText:batch.code}).click();
    await page.locator('.cloud-record-heading h2').filter({hasText:batch.code}).waitFor();
    await page.locator('.cloud-evidence .cloud-disclosure > summary').click();
    const form=page.locator('.cloud-evidence form'),source=form.locator('[name=source]'),date=form.locator('[name=document_date]'),file=form.locator('[name=file]');
    const assistant=page.locator('.document-assistant');
    await form.locator('[name=kind]').selectOption('lab_report');
    const manualSource='QA manual source kept until Apply';
    await source.fill(manualSource);await date.fill('2026-09-20');
    const readName=lang==='vi'?'Đọc tài liệu đã chọn':'Read selected document';
    const applyName=lang==='vi'?'Áp dụng thông tin đã kiểm tra':'Apply reviewed details';
    if(lifecycleOnly){
      async function holdRead(filename){
        holdModels=true;await file.setInputFiles(path.join(fixtures,filename));await assistant.getByRole('button',{name:readName,exact:true}).click();
        await assistant.locator('.document-assistant-status').waitFor();
        const deadline=Date.now()+15000;while(releaseModels.length<2&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
        assert.equal(releaseModels.length,2,'Both model GETs must be held during actual worker startup');
      }
      async function releaseAndSettle(){holdModels=false;releaseModels.splice(0).forEach(resolve=>resolve());await page.waitForFunction(()=>window.aiQaActiveWorkers===0,{},{timeout:20000});}
      await holdRead('document-vietnamese-qa.png');
      await file.setInputFiles(path.join(fixtures,'document-text-qa.pdf'));
      assert.equal(await assistant.locator('.document-assistant-review').count(),0);assert.equal(await assistant.getAttribute('aria-busy'),'false');
      await assistant.getByRole('button',{name:readName,exact:true}).click();await assistant.locator('.document-assistant-review').waitFor();
      const replacementText=await assistant.locator('.document-assistant-extracted pre').textContent();
      assert.match(replacementText,/TÀI LIỆU QA LOCAL/);await releaseAndSettle();
      assert.equal(await assistant.locator('.document-assistant-extracted pre').textContent(),replacementText,'Abandoned OCR must not overwrite replacement PDF');
      await holdRead('document-english-qa.png');await file.setInputFiles([]);await releaseAndSettle();
      assert.equal(await assistant.locator('.document-assistant-review,.document-assistant-error').count(),0);
      assert.equal(await assistant.getAttribute('aria-busy'),'false');assert.equal(await assistant.getByRole('button',{name:readName,exact:true}).isDisabled(),true);
      await file.setInputFiles(path.join(fixtures,'document-english-qa.png'));await assistant.getByRole('button',{name:readName,exact:true}).click();
      await assistant.locator('.document-assistant-review').waitFor({timeout:70000});
      assert.equal(await assistant.locator('.document-assistant-review input:not([type])').inputValue(),'QA English Lab');
      assert.equal(await assistant.locator('input[type=date]').inputValue(),'2026-09-27');
      assert.equal(await source.inputValue(),manualSource);assert.equal(await date.inputValue(),'2026-09-20');
      await page.setViewportSize({width:390,height:1000});await capture('document-english-review-en-390','.cloud-evidence');
      await form.evaluate(element=>element.reset());
      assert.equal(await assistant.locator('.document-assistant-review').count(),0);assert.equal(await file.inputValue(),'');
      assert.equal(await source.inputValue(),'');assert.equal(await date.inputValue(),'');assert.equal(await form.locator('[name=kind]').inputValue(),'photo');
      assert.equal(await assistant.getByRole('button',{name:readName,exact:true}).isDisabled(),true);
      assert.equal(await page.evaluate(()=>window.aiQa.uploadCalls),0);assert.ok(await page.evaluate(()=>window.aiQa.requests.every(request=>request.method==='GET')));
      assert.equal(errors.length,0,errors.join('\n'));
      const lifecycle={status:'passed',checks:['fileChangeDuringLoading:replacementPdfPreserved','fileClearDuringLoading:lateWorkerTerminatedNoStaleResult','formReset:resultAndFileCleared','actualEnglishImageOcr:QA English Lab/2026-09-27'],appExceptions:errors,uploadCalls:0,ocrResponses};
      await fs.writeFile(path.join(output,'lifecycle-checks.json'),JSON.stringify(lifecycle,null,2));
      const report=JSON.parse(await fs.readFile(path.join(output,'checks.json'),'utf8'));delete report.workerPackets;report.targetedLifecycle=lifecycle;
      await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(lifecycle));break;
    }
    async function read(filename){
      await file.setInputFiles(path.join(fixtures,filename));
      assert.equal(await assistant.locator('.document-assistant-review').count(),0,'New file must clear stale suggestions');
      await assistant.getByRole('button',{name:readName,exact:true}).click();
      await assistant.locator('.document-assistant-review,.document-assistant-error').first().waitFor({timeout:70000});
    }
    async function candidate(expectedSource,expectedDate){
      const suggestedSource=assistant.locator('.document-assistant-review input:not([type])'),suggestedDate=assistant.locator('input[type=date]');
      assert.equal(await suggestedSource.inputValue(),expectedSource);assert.equal(await suggestedDate.inputValue(),expectedDate);
      assert.equal(await source.inputValue(),manualSource,'Reading must not alter owner metadata');assert.equal(await date.inputValue(),'2026-09-20');
      const apply=assistant.getByRole('button',{name:applyName,exact:true});assert.equal(await apply.isDisabled(),true);
      await assistant.locator('.document-assistant-confirm input').check();await apply.click();
      assert.equal(await source.inputValue(),expectedSource);assert.equal(await date.inputValue(),expectedDate);
      assert.equal(await page.evaluate(()=>window.aiQa.uploadCalls),0);
      assert.match(await assistant.locator('.document-assistant-status').innerText(),lang==='vi'?/chưa upload hoặc lưu/:/no evidence was uploaded or saved/);
      return async()=>{assert.equal(await source.inputValue(),expectedSource,'Applied source must survive viewport resizing');assert.equal(await date.inputValue(),expectedDate,'Applied date must survive viewport resizing');};
    }
    // Real OCR of a clearly labelled synthetic Vietnamese document; no mocked text.
    await file.setInputFiles(path.join(fixtures,'document-vietnamese-qa.png'));
    await assistant.getByRole('button',{name:readName,exact:true}).click();
    await assistant.locator('.document-assistant-status,.document-assistant-review,.document-assistant-error').first().waitFor();
    if(await assistant.getAttribute('aria-busy')==='true'){
      assert.equal(await assistant.getByRole('button',{name:readName,exact:true}).isDisabled(),true);
      await capture('document-loading-'+lang+'-1440','.document-assistant');
    }
    assert.equal(await source.isEditable(),true);assert.equal(await date.isEditable(),true);
    await assistant.locator('.document-assistant-review,.document-assistant-error').first().waitFor({timeout:70000});
    const ocrError=await assistant.locator('.document-assistant-error').count()?await assistant.locator('.document-assistant-error').innerText():'';
    if(ocrError){
      documentResults.push({lang,method:'actual_image_ocr',status:'unavailable',error:ocrError});
      assert.match(ocrError,lang==='vi'?/thủ công/:/manually/);
      assert.equal(await source.isEditable(),true);assert.equal(await date.isEditable(),true);
      await screens('document-ocr-unavailable-'+lang,'.cloud-evidence');
    }else{
      const verifyApplied=await candidate('HTX Kiểm thử QA','2026-09-27');
      await assistant.locator('.document-assistant-extracted > summary').click();
      assert.match(await assistant.locator('.document-assistant-extracted pre').innerText(),/QA/);
      await screens('document-ocr-review-'+lang,'.cloud-evidence',verifyApplied);
      documentResults.push({lang,method:'actual_image_ocr',status:'passed',source:'HTX Kiểm thử QA',documentDate:'2026-09-27'});
    }
    await source.fill(manualSource);await date.fill('2026-09-20');
    await read('document-text-qa.pdf');const verifyPdfApplied=await candidate('HTX Kiểm thử QA','2026-09-27');
    await screens('document-pdf-review-'+lang,'.cloud-evidence',verifyPdfApplied);
    documentResults.push({lang,method:'actual_pdf_text',status:'passed'});
    await source.fill(manualSource);await date.fill('2026-09-20');
    await read('document-ambiguous-qa.pdf');
    assert.equal(await assistant.locator('input[type=date]').inputValue(),'');
    assert.match(await assistant.innerText(),lang==='vi'?/Trình đọc không đoán ngày/:/reader does not guess dates/);
    assert.equal(await date.inputValue(),'2026-09-20');
    await assistant.locator('.document-assistant-confirm input').check();
    await assistant.getByRole('button',{name:applyName,exact:true}).click();
    assert.equal(await date.inputValue(),'2026-09-20','A blank ambiguous date must preserve manual metadata');
    await assistant.locator('input[type=date]').fill('2026-03-02');
    assert.equal(await assistant.locator('.document-assistant-confirm input').isChecked(),false,'Editing invalidates confirmation');
    await screens('document-ambiguous-'+lang,'.cloud-evidence');
    await source.fill(manualSource);await date.fill('2026-09-20');
    await read('document-scanned-qa.pdf');
    assert.match(await assistant.innerText(),lang==='vi'?/PDF không có lớp chữ đọc được/:/PDF pages have no readable text layer/);
    assert.equal(await assistant.locator('input[type=date]').inputValue(),'');
    assert.equal(await assistant.locator('.document-assistant-review input:not([type])').inputValue(),'');
    assert.equal(await source.inputValue(),manualSource);assert.equal(await date.inputValue(),'2026-09-20');
    assert.equal(await assistant.getByRole('button',{name:applyName,exact:true}).isDisabled(),true);
    await screens('document-scanned-manual-'+lang,'.cloud-evidence');
    for(const filename of ['unsafe-qa.html','oversized-qa.png','empty-qa.png','corrupt-qa.png']){
      await read(filename);assert.equal(await assistant.locator('.document-assistant-review').count(),0);
      assert.match(await assistant.locator('.document-assistant-error').innerText(),lang==='vi'?/thủ công/:/manually/);
      assert.equal(await source.isEditable(),true);assert.equal(await date.isEditable(),true);
      assert.equal(await source.inputValue(),manualSource);assert.equal(await date.inputValue(),'2026-09-20');
    }
    await screens('document-error-manual-'+lang,'.cloud-evidence');
    const cloud=await page.evaluate(()=>({uploadCalls:window.aiQa.uploadCalls,requests:window.aiQa.requests}));
    assert.equal(cloud.uploadCalls,0);assert.ok(cloud.requests.every(request=>request.method==='GET'));
    checks.push('document-'+lang+':privateOwnerOnly,realPdf,manualApplyOnly,ambiguousDate,scanFallback,fileBounds,manualErrorFallback,noCloudWrites');
    await page.goto(base+'#/cloud?batchId='+batchId,{waitUntil:'domcontentloaded'});await page.locator('.cloud-record-heading h2').filter({hasText:batch.code}).waitFor();
    assert.equal(await page.locator('.document-assistant,.cloud-evidence input[name=file]').count(),0,'Public records must not offer document upload or assistant');
    await page.goto(base+'#/records/example',{waitUntil:'domcontentloaded'});await page.locator('.cloud-record-heading h2').waitFor();
    assert.equal(await page.locator('.document-assistant,.cloud-evidence input[name=file]').count(),0);
    await page.goto(base+'#/manage',{waitUntil:'domcontentloaded'});await page.locator('.cloud-account').waitFor();
    await page.getByRole('button',{name:lang==='vi'?'Đăng xuất':'Sign out',exact:true}).click();await google.waitFor();
  }
  assert.equal(errors.length,0,errors.join('\n'));
  const ocrPassed=documentResults.filter(result=>result.method==='actual_image_ocr').every(result=>result.status==='passed');
  assert.ok(ocrPassed,'Actual image OCR was unavailable; manual fallback passed, but OCR QA is incomplete');
  const report={status:'passed',checks,documentResults,classification:'mocked UI responses; API accuracy is outside this check',documents:'actual OCR/PDF extraction; synthetic labelled QA files only',ocrAssets,ocrResponses,blocked,appExceptions:errors,output};
  if(!lifecycleOnly){await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}await fs.rm(path.join(output,'failure.json'),{force:true});
}catch(error){if(page)await page.screenshot({path:path.join(output,'failure-current.png'),fullPage:true});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({message:error.message,checks,documentResults,errors,blocked,ocrAssets,ocrResponses},null,2));throw error;}
finally{releaseLeaf?.();releaseModels.splice(0).forEach(resolve=>resolve());await browser?.close();await server?.close();}
