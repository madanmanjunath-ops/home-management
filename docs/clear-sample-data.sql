-- Clear all household data (staff, tasks, shopping, etc.) while KEEPING your
-- account and household. Run once in Supabase → SQL Editor → New query → Run.
--
-- Use this to wipe the starter sample data and begin from a clean slate.
-- (Safe for a single-household setup. It does NOT touch "User" or "Household".)

BEGIN;
DELETE FROM "Payroll";
DELETE FROM "Expense";
DELETE FROM "Leave";
DELETE FROM "Notification";
DELETE FROM "Document";
DELETE FROM "ShoppingItem";
DELETE FROM "Attendance";
DELETE FROM "Task";
DELETE FROM "Staff";
COMMIT;
