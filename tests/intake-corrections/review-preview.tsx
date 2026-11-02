// Synthetic local UI fixture. No authentication, database or AI requests.
import {createRoot} from 'react-dom/client';
import {IntakeSummaryCorrection} from '../../src/IntakeSummaryCorrection';
import {reviewRecord} from './review-fixture.mjs';
import '../../src/styles.css';
const client={rpc:async(name:string,payload:unknown)=>{(window as any).savedCorrection={name,payload};return {error:null};}};
createRoot(document.getElementById('root')!).render(<IntakeSummaryCorrection client={client as any} intake={{intakeId:'synthetic-intake',summaryRevision:2,studentRecord:reviewRecord as any}} onClose={()=>{document.body.dataset.closed='true';}} onSaved={()=>{document.body.dataset.saved='true';}}/>);
