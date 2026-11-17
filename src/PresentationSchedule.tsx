import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  highestActiveWeek, presentationClock, presentationSlots,
  type PresentationEntry, type WeekNumber,
} from './presentationTiming';
import './PresentationSchedule.css';

export function useActiveWeek(states: Record<number, boolean> | null) {
  const highest = highestActiveWeek(states);
  const [week, setWeek] = useState<WeekNumber>(highest);
  useEffect(() => setWeek(highest), [highest]);
  return [week, setWeek] as const;
}

export function PresentationSchedule({ isOpen, order, error = '', myTeamName }: {
  isOpen: boolean;
  order: PresentationEntry[] | null;
  error?: string;
  myTeamName?: string;
}) {
  const slots = presentationSlots(order || []);
  const own = (s: PresentationEntry) => s.isMyTeam === true ||
    (s.isMyTeam === undefined && s.teamName === myTeamName);
  const mine = slots.find(own);
  return (
    <section className="week4-schedule" aria-labelledby="presentation-schedule-title">
      <div className="presentation-schedule-intro">
        <span>Week 4 · Presentation day</span>
        <h3 id="presentation-schedule-title">Presentation schedule</h3>
        <p>Find your name and check the published running order.</p>
      </div>
      {isOpen && <div className="presentation-arrival">
        <strong>Everyone must arrive at 8:30 AM, ready to present.</strong>
        <p>Approximate start times are a guide. Your turn may move earlier or later;
          do not use these times as your arrival time. Please stay after presenting
          to support the other teams wherever possible.</p>
      </div>}
      {!isOpen ? (
        <p className="presentation-schedule-notice">The published schedule will appear when Week 4 is active.</p>
      ) : error ? (
        <p role="alert" className="presentation-schedule-notice">{error}</p>
      ) : order === null ? (
        <p role="status">Loading the published schedule…</p>
      ) : !slots.length ? (
        <p className="presentation-schedule-notice">Your teacher has not published the presentation order yet.</p>
      ) : <>
        {mine ? <div className="presentation-own-slot">
          <div>
            <span>Your presentation · No. {mine.position}</span>
            <h4>{mine.projectName || mine.teamName}</h4>
            <p>{mine.members?.join(', ') || 'Member names are not available yet.'}</p>
            <small>{mine.teamName}</small>
          </div>
          <div>
            <span>Approx. start</span><b>{presentationClock(mine.startMinute)}</b>
            <small>Be in the room at 8:30 AM.</small>
          </div>
        </div> : <p className="presentation-schedule-notice">
          Your team is not identified in this published order. Please confirm your
          presentation arrangements with your teacher.
        </p>}
        <p className="presentation-timing-rule">Presentation includes your live demo:
          15 minutes for 1–3 members, or 20 minutes for 4 members, plus 5 minutes for Q&amp;A.</p>
        <ol className="presentation-running-order">
          {slots.map((s, index) => <li key={`${s.position}-${s.teamName}-${index}`}
            className={own(s) ? 'is-own-team' : ''} aria-current={own(s) ? 'true' : undefined}>
            <span className="presentation-order-number">{s.position}</span>
            <div className="presentation-slot-time">
              <small>Approx. start</small><b>{presentationClock(s.startMinute)}</b>
            </div>
            <div className="presentation-slot-detail">
              <h4>{s.projectName || 'Project title to be confirmed'}{' '}
                {own(s) && <span className="presentation-own-badge">Your team</span>}</h4>
              <p>{s.members?.length ? s.members.join(', ') :
                'Member names are not available. Please check with your teacher.'}</p>
              <small>{s.teamName}</small>
            </div>
            <div className="presentation-slot-duration">
              {s.talkMinutes !== null ? <><b>{s.talkMinutes} min incl. demo</b><small>+ 5 min Q&amp;A</small></> :
                <b>Timing to be confirmed</b>}
            </div>
          </li>)}
        </ol>
        {slots.some(s => s.talkMinutes === null) && <p className="presentation-schedule-notice">
          Some team sizes need confirmation. Later start estimates will appear once those timings are known.
        </p>}
      </>}
    </section>
  );
}

export function WeeklyActivitiesSection({ children, help }: { children: ReactNode; help?: ReactNode }) {
  return (
    <section id="weekly" className="portal-section weekly-activities-panel">
      <div className="sessions-heading"><h2>Weekly Activities</h2>{help}</div>
      <details className="class-activities" open>
        <summary><div><b>Weekly activities and presentation schedule</b></div>
          <span className="class-activities-show"><ChevronDown size={20} aria-hidden="true" /></span>
        </summary>
        <div className="portal-weekly-section">{children}</div>
      </details>
    </section>
  );
}
