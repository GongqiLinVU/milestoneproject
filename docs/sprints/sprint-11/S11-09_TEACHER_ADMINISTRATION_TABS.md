# S11-09 — Independent teachers, classes and assignments

Status: implemented and locally verified; browser/production acceptance pending.

The administrator Classes & teachers page has three keyboard-accessible tabs. Assignments is the default. Teacher creation sends an empty classIds array through the existing account API; no class must exist or be selected. The existing backend already accepts empty assignments and permits password setup for an unassigned teacher while class RLS denies class data. No SQL or API changes are needed.

## Assignments

Choose an enabled teacher, then assign them to a current class. Each card shows its full Course · Year · Block · Class identity, lifecycle status and all assigned teachers. Remove acts on only the named teacher/class association. Each add/remove reads the teacher's latest membership list and changes one class, preserving all other current and archived memberships and the account status. Operations use the existing administrator-only set_teacher_classes RPC. They remain individual operations, not a new multi-teacher bulk transaction; concurrent administrators should refresh before editing the same teacher.

Active classes appear first; Planned classes are also Current. Archived assignments are retained in a collapsed history group without assignment controls. Restore a historical class in Classes before changing its assignments. Disabled teachers remain visible on historical/current membership lists but cannot be newly assigned until enabled.

## Teachers

Create an account with Name and Email only. Temporary credentials still appear in the existing transient panel and must be shared manually. No automatic email is sent. Teacher list shows current classes, collapsed archived classes, or No classes assigned. Assign classes selects that teacher and switches to Assignments. Enable/disable, reset password and delete retain their existing behavior and confirmations. Removing the last class does not disable/delete the teacher. Enabling/disabling preserves the latest membership list.

## Classes

Create a class through the existing form. Current classes (Active and Planned) appear in the main list. Archived classes are in a compact collapsed list with a count and status controls for restoration. Archiving does not remove teacher associations or class records. Class access and lifecycle guards are unchanged. Existing NIT3004 course-field behavior is retained.

## Validation

Production TypeScript/Vite build, 23 class database checks and 248 existing Intake/API checks passed. The class DB checks cover empty assignment revocation, class-scoped access, teacher assignment authorization and disabled-account restrictions.

A mocked DOM workflow rehearsal passed: default tab, collapsed history, independent teacher creation with classIds=[], assigning a newly created teacher, preserving archived/unrelated memberships, removing individual/last assignments without disabling, creating a Planned class, restoring an Archived class without altering memberships, and disabling a teacher while retaining assignments. This is DOM interaction verification, not a real-browser visual pass. Browser appearance/hosted acceptance remains pending.

To repeat the DOM rehearsal, provide jsdom in the test environment (not a runtime dependency), compile with `npx esbuild src/TeacherAdministration.tsx --bundle --platform=node --format=cjs --loader:.css=empty --external:react --outfile=.test-build/TeacherAdministration.cjs`, then run `STAFF_DOM_MODULE=/path/to/jsdom node --test tests/classes/administration-ui.test.cjs`. The fixture mocks Auth/API/RPC calls and uses synthetic identities; it performs no live account operation.

## Release

Frontend-only PR; no SQL. After merge approval, deploy and check all three tabs as superadmin. Verify teacher creation without selection, one add/remove operation, archived collapse/restore and mobile layout. Existing accounts, passwords and associations are unchanged by deployment. Reverting frontend code is sufficient for recovery.
