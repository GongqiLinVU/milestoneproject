# Visual assessment structure editor

Approved 14 November 2026, after the teacher found the JSON-first setup hard to read and operate. This is a focused UI follow-up to PR #120.

## Result

The setup now starts with three NIT3004 assessment cards. Progress report and Presentation expose maximum marks directly. Final report contains its five component rows, with an automatically derived subtotal. The overall maximum updates from the current valid values. Assessment title, item names, marks and teacher-feedback settings are editable. Stable internal item IDs do not appear in normal teacher controls.

Teachers can remove/reorder assessments and components, restore removed NIT3004 items from the Add assessment/component picker, or add a custom component/group. Undo restores the snapshot before the last add/remove/reset. Discard structure changes restores the loaded class structure. Restore NIT3004 default reinstates the initial template. A group retains at least one component; remove the parent assessment to remove the entire group. Invalid maxima/empty structures block saving with an explanatory error.

Advanced · JSON configuration is collapsed initially. Raw JSON edits pause visual editing until explicitly applied or discarded. Apply validates the entire structure, including duplicate IDs and maxima, before changing the visual cards. Malformed or unapplied JSON never reaches the save RPC. Existing arbitrary valid structures and nested groups remain readable through the same editor.

Save uses the existing `set_assessment_plan` version-checked RPC. Initial setup has an enabled Use this assessment structure button; an unchanged saved structure has no redundant save. Unsaved configuration changes participate in navigation/class-switch/close guards. Mark inputs and exports pause until the structure edits are saved or discarded. Failed saves preserve the editable configuration. Starting a student record still locks both visual and JSON structure editing, with the existing server restriction as authority.

No database migration, changes to existing marks/comments, student visibility, AI generation or grading rules are included. Existing templates and per-class snapshots remain intact. API function count remains 10.

## Validation and release

`npm run test:assessment`: all 28 tests pass. Coverage includes the existing ledger/database/API/export checks plus actual React editor interactions: default setup; removal, undo, restore and reordering; stable IDs; custom items/groups; explicit JSON apply/discard and malformed JSON; invalid maxima; failed saves; discard/dirty tracking; post-marking lock; ledger navigation/mark/export guards; and first-time save through the existing versioned RPC.

`npm run build` passes for the production TypeScript/Vite build. Component tests exercise state and handlers rather than actual browser layout; desktop/mobile visual acceptance remains outstanding. The CSS uses flexible cards and responsive wrapping, compact remove/order actions, explicit totals, a green save action and a collapsed advanced editor.

After a successful preview, review on desktop and narrow widths: setup cards, five Final report rows, add/remove/undo, edited totals, JSON closed by default, explicit JSON apply, save/discard, then locked state after test marking. Existing live marks must be preserved. Follow the usual explicit merge instruction; this change requires no SQL execution.
