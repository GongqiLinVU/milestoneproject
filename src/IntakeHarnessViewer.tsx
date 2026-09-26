import { useState } from 'react';
import { decideTurn } from './intakeHarness';
import type { ChatSource } from './intakePolicy';
import type { DeterministicIntakeAnswers } from './aiSessionIntake';

type Event = { at: string; mode: string; request: Record<string, unknown>; response?: Record<string, unknown>; error?: string };
type Decision = { index: number; field: string; outcome: string; reason: string; originalSourceTurn?: unknown; sourceTurn?: number; candidate?: unknown };

export function IntakeHarnessViewer({ events, onClose, onDownload }: { events: Event[]; onClose: () => void; onDownload: () => void }) {
  const [selected, setSelected] = useState(Math.max(0, events.length - 1));
  const [compare, setCompare] = useState(false);
  const event = events[Math.min(selected, events.length - 1)];
  const response = event?.response;
  const decisions = (response?.fieldDecisions || []) as Decision[];
  const request = event?.request;
  const candidate = response?.rawCandidate;
  const conversation = request?.conversation as ChatSource[] | undefined;
  const snapshot = request?.answersSnapshot as DeterministicIntakeAnswers | undefined;
  const replayable = Boolean(candidate && Array.isArray(conversation) && snapshot);
  const counterfactual = compare && replayable ? decideTurn(candidate, conversation!, snapshot!, { sourcePolicy: 'strict_pointer' }) : null;
  function downloadComparison() {
    const comparison = {format:'intake-harness-comparison.v1',exportedAt:new Date().toISOString(),selectedEvent:selected,manifest:response?.manifest,request,rawCandidate:candidate,production:{fieldDecisions:decisions,routeDecision:response?.routeDecision,result:response?.result},alternative:counterfactual ? {policy:'strict_pointer',fieldDecisions:counterfactual.decisions,routeDecision:counterfactual.routeDecision,accepted:counterfactual.accepted,extractionPending:counterfactual.extractionPending} : null};
    const url=URL.createObjectURL(new Blob([JSON.stringify(comparison,null,2)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`intake-harness-comparison-turn-${selected+1}.json`;anchor.click();URL.revokeObjectURL(url);
  }
  return <div className="harness-viewer-backdrop" role="presentation" onClick={onClose}>
    <section className="harness-viewer" role="dialog" aria-modal="true" aria-label="Intake Harness trace" onClick={e => e.stopPropagation()}>
      <header><div><small>Read-only · current student session</small><h2>Harness trace</h2></div><button type="button" className="secondary compact" onClick={onClose}>Close</button></header>
      <p>Follow each turn from the student's answer to the model candidate, field decisions and final UI route. Experiments here never alter the Intake record.</p>
      <nav aria-label="Debug events" className="harness-turn-list">{events.map((item, index) => <button key={index} type="button" aria-current={selected === index ? 'step' : undefined} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}>{index + 1}. {item.mode} · {item.error ? 'error' : String(item.response?.acceptanceLevel || 'saved')}</button>)}</nav>
      {event && <div className="harness-detail">
        <section><h3>1 · Input</h3><p>At {new Date(event.at).toLocaleString()}</p><p>Latest student answer:</p><blockquote>{conversation?.filter(t => t.actor === 'student').at(-1)?.text || 'No student turn recorded'}</blockquote></section>
        <section><h3>2 · Model candidate</h3><p>{String((candidate as {assistantMessage?: string} | undefined)?.assistantMessage || (response?.result as {assistantMessage?: string} | undefined)?.assistantMessage || event.error || 'No candidate retained')}</p><small>Proposed route: {String((response?.routeDecision as {proposed?: string} | undefined)?.proposed || 'not captured')} · Model: {String(response?.model || 'not captured')}</small></section>
        <section><h3>3 · Evidence validation</h3>{decisions.length ? <table><thead><tr><th>Field</th><th>Decision</th><th>Reason</th><th>Source</th></tr></thead><tbody>{decisions.map(d => <tr key={d.index}><td>{d.field}</td><td>{d.outcome}</td><td>{d.reason}</td><td>{String(d.originalSourceTurn ?? '—')}{d.outcome === 'repaired' ? ` → ${d.sourceTurn}` : ''}</td></tr>)}</tbody></table> : <p>No field decisions recorded.</p>}</section>
        <section><h3>4 · Route</h3><p>Harness: {String((response?.routeDecision as {final?: string} | undefined)?.final || (response?.result as {route?: string} | undefined)?.route || 'not captured')} · UI: {String((response?.routeDecision as {uiFinal?: string} | undefined)?.uiFinal || 'not captured')}</p><small>{String((response?.routeDecision as {reason?: string; uiReason?: string} | undefined)?.reason || 'No Harness reason recorded')} · {String((response?.routeDecision as {uiReason?: string} | undefined)?.uiReason || 'No UI reason recorded')}</small></section>
        <section><h3>Replay comparison</h3><label><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} disabled={!replayable}/> Compare with strict source pointers</label>{!replayable && <p>This event lacks the model candidate or input snapshot needed for deterministic replay.</p>}{counterfactual && <div><p>Same recorded candidate; alternative policy rejects invalid source pointers without repair. Production result is unchanged.</p><table><thead><tr><th>Policy</th><th>Accepted</th><th>Repaired</th><th>Rejected</th><th>Harness route</th></tr></thead><tbody><tr><td>Current</td><td>{decisions.filter(d => d.outcome === 'accepted').length}</td><td>{decisions.filter(d => d.outcome === 'repaired').length}</td><td>{decisions.filter(d => d.outcome === 'rejected').length}</td><td>{String((response?.routeDecision as {final?: string} | undefined)?.final || 'unknown')}</td></tr><tr><td>Strict pointer</td><td>{counterfactual.decisions.filter(d => d.outcome === 'accepted').length}</td><td>{counterfactual.decisions.filter(d => d.outcome === 'repaired').length}</td><td>{counterfactual.decisions.filter(d => d.outcome === 'rejected').length}</td><td>{counterfactual.route}</td></tr></tbody></table></div>}</section>
      </div>}
      <footer><button type="button" className="secondary compact" onClick={onDownload}>Download full debug JSON</button><button type="button" className="secondary compact" onClick={downloadComparison}>Download selected comparison JSON</button><small>Contains student answers. Remove identifying details before sharing.</small></footer>
    </section>
  </div>;
}
