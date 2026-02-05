# Workflows

## Default workflow configuration
Two supported paths. Admins can edit stages and transitions.

### Order path
MRF → Supplier Assignment → Requisition → Order → Inventory → Done

### Contract path
MRF → Supplier Assignment → Requisition → Contract → Certificate → Done

## How branching works
- A Request has a `flowType`:
  - `ORDER` or `CONTRACT`
- Allowed stages depend on `flowType` plus transition rules.

## Stage durations
Track each time a Request enters a stage and when it leaves:
- `enteredAt` is set when moved into stage
- `exitedAt` is set when moved out
- Duration is computed as `exitedAt - enteredAt` (or “open” if currently in stage)

## Audit requirements
Every change produces an immutable event:
- Request created/edited
- Stage moved
- Attachment added/removed
- Tag changes
- Priority/due date changes
Each audit event stores:
- actor user id
- action type
- old/new values (sanitized)
- timestamp
