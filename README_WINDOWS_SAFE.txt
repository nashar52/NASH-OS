NASH OS HF06 SAFE

Purpose:
- Adds explicit Manager visible evidence visibility during employee task evidence upload.
- Manager Review Evidence shows only manager-visible work evidence.
- Restricted HR and confidential documents are hidden.
- Manager can Accept Evidence or Request Correction with receipts.
- Empty manager queue no longer offers an invalid Upload Document action.
- No database schema change or migration.

Run:
  npm.cmd install
  npm.cmd run mysql:lock-check
  npm.cmd run qa:final-gold
  npm.cmd run qa:final-gold-hotfix-01
  npm.cmd run qa:final-gold-hotfix-02
  npm.cmd run qa:final-gold-hotfix-03
  npm.cmd run qa:final-gold-hotfix-04
  npm.cmd run qa:final-gold-hotfix-05
  npm.cmd run qa:final-gold-hotfix-06
  npm.cmd start
