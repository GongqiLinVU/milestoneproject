# Password-only student activation

Account activation asks only for a personal password and confirmation. It does not collect a delivery goal, recovery answer or classroom activity. Attendance and project updates remain in their normal Session flows.

Apply `supabase/migrations/20261023_sprint10_v2_password_activation.sql` after the unassigned-roster migration, before deploying the UI. The RPC retains its optional legacy text argument for old clients, but ignores it. A ready account still needs its own active-class roster entry and an assigned team. Activation marks that account activated without creating a synthetic legacy check-in. Existing current-class legacy check-ins can still be linked to the account, preserving their IDs, goal text and other data. Reapplying the migration is safe.

Validation: production build and existing npm tests; isolated SQL activation with no argument, no new check-in, repeat rejection, preservation/linking of an existing check-in and migration repeat; real React activation form with two password inputs and no goal, including a same-account USER_UPDATED event during password change. Test transport is synthetic; no production password or account changes.
