// NIT3004 starts by reconnecting with an existing project, not starting from zero.
// Display-only guidance must never be inserted into the student's source transcript.
export function intakeStart(sessionNumber: number) {
  const first = sessionNumber === 1;
  return {
    first,
    question: first ? "Where is your project up to, and what part will you be responsible for in this unit?" : null,
    guideTitle: first ? "Let’s get started" : "A quick check-in, at your pace",
    guideLead: first ? "Tell us where your project stands and your part in it." : "Share what changed and what’s next.",
    hint: "Briefly describe what your team already has and your own part. It’s okay if you haven’t started building or your role is still being decided.",
    sentenceStarters: ["Our team has …", "My part is …", "Before the next class, I plan to … (optional)"],
    example: "Our team has completed the requirements and initial wireframes for a campus information assistant, but we haven’t built the application yet. I’ll be responsible for the chat interface. Before the next class, I plan to build a basic page where users can type a question and see a sample response.",
    noProgressLabel: first ? "I haven’t started yet" : "No progress",
    noProgressReply: first ? "I haven’t started my part yet." : "I made no progress in this Session.",
    helpLabel: first ? "I need help getting started" : "I need Teacher help",
    helpReply: first ? "I need help getting started and deciding my part in the project." : "I need my Teacher to help me decide the next step.",
    placeholder: first ? "Tell us about your project and your part…" : "Reply to the Intake assistant…",
  };
}
