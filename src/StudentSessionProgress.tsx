import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntakeStudentRecord } from "./aiSessionIntake";
import { IntakeRecordSummary } from "./IntakeReview";
import { SessionAIPreparation } from "./SessionAIReview";
import { StudentSessionCheckReceipt } from "./SessionTeacherCheck";

export function StudentSessionProgress({client, intakeId, record, confirmedAt}: {
  client: SupabaseClient;
  intakeId: string;
  record: IntakeStudentRecord;
  confirmedAt: string;
}) {
  return <>
    <IntakeRecordSummary record={record} confirmedAt={confirmedAt}/>
    <SessionAIPreparation key={intakeId} client={client} intakeId={intakeId}/>
    <StudentSessionCheckReceipt key={`receipt-${intakeId}`} client={client} intakeId={intakeId}/>
  </>;
}
