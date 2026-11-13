import {test} from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {ReviewFocusFeedback} from '../../.test-api/src/ReviewFocusFeedback.js';
import {parseFeedbackPoints,feedbackText,reviewFocus} from '../../.test-api/src/reviewFocus.js';
const points=[{focus:'Evidence',kind:'clarification',text:'Show your API changes.'},{focus:'Testing',kind:'recommendation',text:'Record a failed-request test.'}];
test('student feedback groups tagged points, omits unsupported sections and shares vocabulary',()=>{
 const html=renderToStaticMarkup(React.createElement(ReviewFocusFeedback,{points}));
 assert.match(html,/Clarification needed/);assert.match(html,/Recommended next steps/);assert.doesNotMatch(html,/Current issues/);assert.doesNotMatch(html,/<select|<textarea/);assert.match(html,/Categories describe the focus/);
 for(const category of Object.keys(reviewFocus))assert.ok(html.includes(category));
 assert.equal(Object.keys(reviewFocus).length,8);
});
test('teacher can select only fixed categories, edit text and remove points',()=>{
 const html=renderToStaticMarkup(React.createElement(ReviewFocusFeedback,{points,onChange:()=>{}}));
 assert.match(html,/Category for point 1/);assert.match(html,/Feedback point 1/);assert.match(html,/Remove point 1/);assert.match(html,/Section for point 1/);
});
test('plain-text fallback preserves groups and untrusted markup is escaped',()=>{
 assert.match(feedbackText(points),/\[Evidence\]/);assert.throws(()=>parseFeedbackPoints([{focus:'Invented',kind:'issue',text:'Bad'}]));
 const html=renderToStaticMarkup(React.createElement(ReviewFocusFeedback,{points:[{...points[0],text:'<script>alert(1)</script>'}]}));assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});
