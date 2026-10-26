// NIT3004 curriculum entry points, not completion gates or extra question budgets.
// Guidance and examples are display-only. Prior confirmed context remains in
// the source opening for interpretation, but is presented separately in the UI.
const openings: Record<number,{question:string;hint:string;sentenceStarters:string[];example:string}> = {
  1: {
    question: "Where is your project up to, and what part will you be responsible for in this unit?",
    hint: "Briefly describe what your team already has and your own part. It’s okay if you haven’t started building or your role is still being decided.",
    sentenceStarters: ["Our team has …", "My part is …", "Before the next class, I plan to … (optional)"],
    example: "Our team has completed the requirements and initial wireframes for a campus information assistant, but we haven’t built the application yet. I’ll be responsible for the chat interface. Before the next class, I plan to build a basic page where users can type a question and see a sample response.",
  },
  2: {
    question: "What have you agreed with your team about your part, and what will you work on next?",
    hint: "Describe your own responsibility and a manageable next step. If roles or plans are still being discussed, say so.",
    sentenceStarters: ["We agreed that I will …", "We are still deciding …", "My next step is …"],
    example: "We agreed that I’ll build the chat interface while a teammate handles the AI connection. I have a basic layout, but it does not send questions yet. Next, I’ll add the message input and display sample replies.",
  },
  3: {
    question: "What have you worked on since the last class, and where have you got to?",
    hint: "Focus on your own work: a change, an attempt or something you discovered. You can also mention what is unfinished and what you plan to do next.",
    sentenceStarters: ["I worked on …", "It now … / I found …", "I still need to …"],
    example: "I added message input and sample replies to the chat page. Users can send a message and see it in the conversation. The page is not connected to the AI service yet. Next, I’ll agree on the request format with our backend teammate.",
  },
  4: {
    question: "What can you show or explain about your work so far, and what still needs attention?",
    hint: "Describe something you changed, tried or found. A demonstration, screenshot, analysis or explanation may help, but a link or upload is not required. Unfinished work is okay.",
    sentenceStarters: ["I can show or explain …", "I checked … and found … (if applicable)", "This still needs attention …"],
    example: "I connected the chat page to our test API and tried one question. The reply appeared, but there was no indication that it was loading. I can demonstrate that behaviour. Next, I’ll add a loading message and check the error state.",
  },
  5: {
    question: "How is your part progressing, and what will you work on next?",
    hint: "Mention what changed and what remains. If something is blocking you or the plan changed, describe that briefly. No progress is also a valid update.",
    sentenceStarters: ["Since last time, I …", "The remaining work or difficulty is …", "Next, I plan to …"],
    example: "I added loading and error messages and checked them using sample responses. The layout is readable on my laptop, but I haven’t checked it on mobile. Next, I’ll check the narrow-screen layout.",
  },
  6: {
    question: "What did you work on after the last class, and what will you do next?",
    hint: "If you had an agreed action or received feedback, explain what happened with it. It’s okay if the action is incomplete, the plan changed or you are waiting on someone.",
    sentenceStarters: ["After the last class, I …", "The earlier plan or feedback led to … (if applicable)", "My next step is …"],
    example: "After the review, I adjusted the mobile layout and checked it at 375px. The input is now visible, but long replies still overflow. I haven’t fixed that yet. Next, I’ll work on text wrapping.",
  },
  7: {
    question: "What progress have you made on your part of the project and the technical report?",
    hint: "Describe your implementation or analysis and any report work you contributed. If the report is not started or not your responsibility, say so. Mention unfinished work without inventing results.",
    sentenceStarters: ["My part of the project now …", "For the report, I … / I haven’t …", "What remains is …"],
    example: "I fixed long-reply wrapping and checked it with sample messages. I also drafted the interface section of the report. We have not checked real AI replies on mobile yet, so the report does not claim that test has passed.",
  },
  8: {
    question: "What have you checked in your part of the project, and what still needs checking?",
    hint: "If you ran a check, explain what happened. Keep sample-data checks separate from end-to-end tests. If you haven’t tested yet or don’t know a result, say so.",
    sentenceStarters: ["I checked … and the result was …", "I have not checked …", "The next check or fix is … (if known)"],
    example: "I tried five questions against the connected test API. Four replies displayed correctly; one long reply covered a source link. I haven’t checked keyboard navigation. Next, I’ll fix the link layout and check it again.",
  },
  9: {
    question: "What is ready in your part for submission and presentation, and what still needs work?",
    hint: "You can mention the product, your report contribution or what you will demonstrate. Be clear about unfinished work and testing limits. You don’t need to claim everything is ready.",
    sentenceStarters: ["My part is ready to …", "I can explain or demonstrate …", "Still unfinished or uncertain …"],
    example: "The chat interface is ready to demonstrate, and I updated my report section with the checks we actually ran. I still need to check keyboard navigation. I’ll explain that limitation rather than present the interface as fully tested.",
  },
};
export function intakeStart(sessionNumber: number) {
  const first = sessionNumber === 1;
  const content = openings[sessionNumber] || openings[3];
  return {
    first,
    ...content,
    guideTitle: first ? "Let’s get started" : "A quick check-in, at your pace",
    guideLead: first ? "Tell us where your project stands and your part in it." : "Share what changed and what’s next.",
    noProgressLabel: first ? "I haven’t started yet" : "No progress",
    noProgressReply: first ? "I haven’t started my part yet." : "I made no progress in this Session.",
    helpLabel: first ? "I need help getting started" : "I need Teacher help",
    helpReply: first ? "I need help getting started and deciding my part in the project." : "I need my Teacher to help me decide the next step.",
    placeholder: first ? "Tell us about your project and your part…" : "Reply to the Intake assistant…",
  };
}

// Previous confirmed text is shown separately, without shortening, rewriting or
// turning it into a current commitment.
export function intakePriorContext(previous?: {responsibility?:{current?:string|null};next_action?:{action?:string|null}}|null) {
  const role=previous?.responsibility?.current?.trim()||null;
  const action=previous?.next_action?.action?.trim()||null;
  return role||action?{role,action}:null;
}

export function intakeOpeningText(sessionNumber:number,previous?:Parameters<typeof intakePriorContext>[0]) {
  const question=intakeStart(sessionNumber).question;
  const prior=sessionNumber>1?intakePriorContext(previous):null;
  if(!prior)return question;
  // Retain interpretive context for brief replies such as "I completed that".
  // This is historical assistant context, never a new student-source claim.
  return ["Previous confirmed context, not a current update:",prior.role?`Your part last time: ${prior.role}`:null,prior.action?`Your planned next step: ${prior.action}`:null,"Roles and plans may have changed.","",question].filter(line=>line!==null).join('\n');
}
