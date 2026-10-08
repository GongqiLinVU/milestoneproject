import { useState, type ReactNode } from 'react';
import { decideTurn, fallbackQuestion } from './intakeHarness';
import type { ChatSource } from './intakePolicy';
import type { DeterministicIntakeAnswers } from './aiSessionIntake';

type Event = { at: string; mode: string; request: Record<string, unknown>; response?: Record<string, unknown>; error?: string };
type Decision = { index: number; field: string; outcome: string; reason: string; originalSourceTurn?: unknown; sourceTurn?: number; candidate?: unknown };
type RouteDecision = { proposed?: string; final?: string; reason?: string; uiFinal?: string; uiReason?: string };

type SourcePolicy = 'repair_unique' | 'strict_pointer';
type MessagePolicy = 'current' | 'legacy_v1' | 'none';

const ROUTE_CONDITIONS: { reason: string; label: string }[] = [
  { reason: 'student_requested_teacher_help', label: 'Student asked for Teacher help' },
  { reason: 'question_limit_reached', label: 'Question budget exhausted' },
  { reason: 'accepted_next_action_and_evidence_ready', label: 'Next action accepted and evidence established' },
  { reason: 'model_small_step_proposal', label: 'Model proposed a small step' },
  { reason: 'continue_collecting', label: 'Continue collecting' },
];

function FlowArrow() {
  return <svg className="flow-arrow" width="24" height="28" viewBox="0 0 24 28" aria-hidden="true">
    <line x1="12" y1="0" x2="12" y2="18" stroke="currentColor" strokeWidth="2"/>
    <polyline points="4,14 12,22 20,14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

function FlowNode({ tone, title, badge, children, detail }: { tone: 'neutral'|'info'|'accepted'|'repaired'|'rejected'|'active'; title: string; badge?: string; children: ReactNode; detail?: ReactNode }) {
  return <div className={`flow-node tone-${tone}`}>
    <div className="flow-node-head"><h4>{title}</h4>{badge && <span className="flow-node-badge">{badge}</span>}</div>
    <div className="flow-node-body">{children}</div>
    {detail && <details className="flow-node-detail"><summary>Full detail</summary><div>{detail}</div></details>}
  </div>;
}

// Shows one value when production and the counterfactual agree, or both stacked
// (production, then the alternative policy) when the selected policy changes it —
// this is what makes the diagram double as the policy comparison view.
function ComparedValue({ production, alternative, varied, altLabel }: { production: ReactNode; alternative?: ReactNode; varied: boolean; altLabel: string }) {
  if (!varied || alternative === undefined || production === alternative) {
    return <div className="flow-compare-row"><span>{production}</span>{varied && <small className="flow-unchanged">unchanged under {altLabel}</small>}</div>;
  }
  return <div className="flow-compare-stack">
    <div className="flow-compare-row"><small>Production</small><span>{production}</span></div>
    <div className="flow-compare-row alt"><small>{altLabel}</small><span>{alternative}</span></div>
  </div>;
}

export function IntakeHarnessViewer({ events, onClose, onDownload }: { events: Event[]; onClose: () => void; onDownload: () => void }) {
  const [selected, setSelected] = useState(Math.max(0, events.length - 1));
  const [sourcePolicy, setSourcePolicy] = useState<SourcePolicy>('repair_unique');
  const [messagePolicy, setMessagePolicy] = useState<MessagePolicy>('current');
  const event = events[Math.min(selected, events.length - 1)];
  const response = event?.response;
  const decisions = (response?.fieldDecisions || []) as Decision[];
  const request = event?.request;
  const candidate = response?.rawCandidate as {assistantMessage?: string; route?: string} | undefined;
  const conversation = request?.conversation as ChatSource[] | undefined;
  const snapshot = request?.answersSnapshot as DeterministicIntakeAnswers | undefined;
  const replayable = Boolean(candidate && Array.isArray(conversation) && snapshot);
  const varied = sourcePolicy !== 'repair_unique' || messagePolicy !== 'current';
  const counterfactual = varied && replayable ? decideTurn(candidate, conversation!, snapshot!, { sourcePolicy, messagePolicy }) : null;
  const altLabel = [sourcePolicy !== 'repair_unique' ? sourcePolicy : null, messagePolicy !== 'current' ? messagePolicy : null].filter(Boolean).join(' + ') || 'alternative policy';
  const productionRoute = (response?.routeDecision as RouteDecision | undefined) || {};
  const productionMessage = String((response?.result as {assistantMessage?: string} | undefined)?.assistantMessage || '');
  const productionFallback = conversation && snapshot ? fallbackQuestion(snapshot, conversation) : '';
  // A provider failure (see api/session-intake-ai.ts's two fallback branches) never reaches decideTurn:
  // there is no rawCandidate and routeDecision carries only uiFinal/uiReason, not proposed/final/reason.
  // Without calling this out explicitly the diagram looks like normal control flow ran and nothing fired.
  const providerFailure = String(response?.providerFailure || event?.error || '');
  const providerFailed = Boolean(providerFailure);

  function downloadComparison() {
    const comparison = {format:'intake-harness-comparison.v1',exportedAt:new Date().toISOString(),selectedEvent:selected,manifest:response?.manifest,request,rawCandidate:candidate,production:{fieldDecisions:decisions,routeDecision:response?.routeDecision,assistantMessage:productionMessage,result:response?.result},alternative:counterfactual ? {policy:{sourcePolicy,messagePolicy},fieldDecisions:counterfactual.decisions,routeDecision:counterfactual.routeDecision,accepted:counterfactual.accepted,extractionPending:counterfactual.extractionPending,assistantMessage:counterfactual.assistantMessage} : null};
    const url=URL.createObjectURL(new Blob([JSON.stringify(comparison,null,2)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`intake-harness-comparison-turn-${selected+1}.json`;anchor.click();URL.revokeObjectURL(url);
  }

  return <div className="harness-viewer-backdrop" role="presentation" onClick={onClose}>
    <section className="harness-viewer" role="dialog" aria-modal="true" aria-label="Intake Harness trace" onClick={e => e.stopPropagation()}>
      <header><div><small>Read-only · current student session</small><h2>Harness trace</h2></div><button type="button" className="secondary compact" onClick={onClose}>Close</button></header>
      <p>Each turn's decision pipeline, from the student's answer to the final message. Click a stage for full detail. Experiments here never alter the Intake record.</p>
      <nav aria-label="Debug events" className="harness-turn-list">{events.map((item, index) => {
        const itemRoute = (item.response?.routeDecision as RouteDecision | undefined)?.final || (item.response?.result as {route?: string} | undefined)?.route;
        const itemFields = ((item.response?.fieldDecisions as Decision[] | undefined) || []).filter(d => d.outcome !== 'rejected').length;
        return <button key={index} type="button" aria-current={selected === index ? 'step' : undefined} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}>
          <span>{index + 1}. {item.mode} · {item.error || item.response?.providerFailure ? 'provider fallback' : String(item.response?.acceptanceLevel || 'saved')}</span>
          <small>{itemRoute || 'no route'}{itemFields ? ` · +${itemFields} field${itemFields===1?'':'s'}` : ''}</small>
        </button>;
      })}</nav>
      <div className="harness-policy-bar">
        <label>Source-pointer policy <select value={sourcePolicy} onChange={e => setSourcePolicy(e.target.value as SourcePolicy)} disabled={!replayable}><option value="repair_unique">repair_unique (deployed)</option><option value="strict_pointer">strict_pointer</option></select></label>
        <label>Message-safety policy <select value={messagePolicy} onChange={e => setMessagePolicy(e.target.value as MessagePolicy)} disabled={!replayable}><option value="current">current (deployed)</option><option value="legacy_v1">legacy_v1 (pre-fix guardrail)</option><option value="none">none (no guardrail)</option></select></label>
        {!replayable && <p>This event lacks the model candidate or input snapshot needed for deterministic replay.</p>}
      </div>
      {event && <div className="harness-flow">
        <FlowNode tone="neutral" title="1 · Student input" detail={<div className="flow-conversation">{conversation?.map((t, i) => <p key={i} className={t.actor}><b>{t.actor}</b> {t.text}</p>) || 'No conversation recorded.'}</div>}>
          <p className="flow-quote">{conversation?.filter(t => t.actor === 'student').at(-1)?.text || 'No student turn recorded'}</p>
        </FlowNode>
        <FlowArrow/>

        <FlowNode tone={providerFailed ? 'rejected' : 'info'} title="2 · Model candidate" badge={providerFailed ? 'provider failed' : String(response?.model || 'not captured')} detail={<pre>{JSON.stringify(candidate ?? {providerFailure}, null, 2)}</pre>}>
          {providerFailed
            ? <p>Provider failed: {providerFailure}. No candidate was returned — this turn never reached the evidence/route decision below; it went straight to the deterministic fallback question.</p>
            : <><p>{candidate?.assistantMessage || 'No candidate retained'}</p><small>Proposed route: {candidate?.route || 'not captured'}</small></>}
        </FlowNode>
        <FlowArrow/>

        <FlowNode tone="neutral" title="3 · Evidence validation" badge={`${decisions.length} field${decisions.length===1?'':'s'}`} detail={
          <table><thead><tr><th>Field</th><th>Decision</th><th>Reason</th><th>Source</th></tr></thead><tbody>
            {[...decisions,...(counterfactual?.decisions||[])].length === 0 && <tr><td colSpan={4}>No field decisions recorded.</td></tr>}
            {decisions.map(d => <tr key={`p-${d.index}`}><td>{d.field}</td><td>production: {d.outcome}</td><td>{d.reason}</td><td>{String(d.originalSourceTurn ?? '—')}{d.outcome === 'repaired' ? ` → ${d.sourceTurn}` : ''}</td></tr>)}
            {counterfactual?.decisions.map((d,i) => <tr key={`c-${i}`} className="alt"><td>{d.field}</td><td>{altLabel}: {d.outcome}</td><td>{d.reason}</td><td>{String(d.originalSourceTurn ?? '—')}{d.outcome === 'repaired' ? ` → ${d.sourceTurn}` : ''}</td></tr>)}
          </tbody></table>
        }>
          {decisions.length ? <div className="flow-chip-row">
            {decisions.map(d => <span key={d.index} className={`flow-chip tone-${d.outcome}`}>{d.field}: {d.outcome}</span>)}
          </div> : <p>No field decisions recorded.</p>}
          {counterfactual && <div className="flow-chip-row alt"><small>{altLabel}:</small>
            {counterfactual.decisions.length ? counterfactual.decisions.map((d,i) => <span key={i} className={`flow-chip tone-${d.outcome}`}>{d.field}: {d.outcome}</span>) : <small>no field decisions</small>}
          </div>}
        </FlowNode>
        <FlowArrow/>

        <FlowNode tone={providerFailed ? 'rejected' : 'active'} title="4 · Route decision" detail={<div><p>Production: {JSON.stringify(productionRoute)}</p>{counterfactual && <p>{altLabel}: {JSON.stringify(counterfactual.routeDecision)}</p>}</div>}>
          {providerFailed
            ? <p>No route condition was evaluated — the provider call failed before <code>decideTurn</code> ran, so this turn was routed directly to <b>{String((response?.result as {route?: string} | undefined)?.route || productionRoute.uiFinal || 'provider_fallback_continue')}</b> without checking Teacher-help, budget, or acceptance conditions.</p>
            : <ul className="flow-condition-list">
                {ROUTE_CONDITIONS.map(c => <li key={c.reason} className={productionRoute.reason === c.reason ? 'fired' : ''}>{c.label}</li>)}
              </ul>}
          <ComparedValue varied={Boolean(counterfactual)} altLabel={altLabel} production={`Route: ${productionRoute.final || (response?.result as {route?: string} | undefined)?.route || 'not captured'}`} alternative={counterfactual ? `Route: ${counterfactual.route}` : undefined}/>
        </FlowNode>
        <FlowArrow/>

        <FlowNode tone="repaired" title="5 · Message decision" detail={<div>
          <p><b>Production message:</b> {productionMessage || '—'}</p>
          <p><b>Fallback question available:</b> {productionFallback}</p>
          {counterfactual && <p><b>{altLabel} message:</b> {counterfactual.assistantMessage}</p>}
        </div>}>
          <p className="flow-message-outcome">{productionMessage === productionFallback
            ? providerFailed
              ? 'Fell back to the deterministic question because the provider call failed — not a safety-guardrail rejection.'
              : 'Fell back to the deterministic question — the model message was rejected or empty.'
            : 'Used the model\'s own message.'}</p>
          <ComparedValue varied={Boolean(counterfactual)} altLabel={altLabel} production={productionMessage || '—'} alternative={counterfactual?.assistantMessage}/>
        </FlowNode>
      </div>}
      <footer><button type="button" className="secondary compact" onClick={onDownload}>Download full debug JSON</button><button type="button" className="secondary compact" onClick={downloadComparison} disabled={!counterfactual}>Download selected comparison JSON</button><small>Contains student answers. Remove identifying details before sharing.</small></footer>
    </section>
  </div>;
}
