# Data Model (Postgres)

## Tables
### users
- id (uuid)
- email (unique, lowercased)
- passwordHash
- role (enum: ADMIN, MANAGER, OPERATOR, VIEWER)
- createdAt, updatedAt
- lastLoginAt

### requests
- id (uuid)
- description (text, required)
- notes (text)
- priority (enum)
- dueDate (timestamp)
- flowType (enum: ORDER, CONTRACT)
- currentStageId (fk stages.id)
- createdByUserId (fk users.id)
- ownerUserId (fk users.id, optional)
- createdAt, updatedAt

### stages
- id (uuid)
- name (text)
- orderIndex (int)  # for display order per flowType, if needed
- isActive (bool)
- appliesTo (enum: ORDER, CONTRACT, BOTH)
- createdAt, updatedAt

### transitions
- id (uuid)
- fromStageId (fk stages.id)
- toStageId (fk stages.id)
- appliesTo (enum: ORDER, CONTRACT, BOTH)
- isActive (bool)

### stage_history
- id (uuid)
- requestId (fk requests.id)
- stageId (fk stages.id)
- enteredAt (timestamp)
- exitedAt (timestamp nullable)
- actorUserId (fk users.id)
- moveReason (text nullable)

> Invariant: At most one open stage_history row per request (where exitedAt is null).

### tags
- id (uuid)
- name (text unique)
- color (text optional)

### request_tags
- requestId (fk requests.id)
- tagId (fk tags.id)

### attachments
- id (uuid)
- requestId (fk requests.id)
- blobKey (text)  # storage key
- fileName (text)
- mimeType (text)
- sizeBytes (bigint)
- uploadedByUserId (fk users.id)
- createdAt

### audit_events (append-only)
- id (uuid)
- requestId (fk requests.id, nullable for admin actions)
- actorUserId (fk users.id)
- eventType (text enum-like)
- payloadJson (jsonb)  # sanitized diff/metadata
- createdAt

## Derived metrics
- Time-in-stage per request: sum of (exitedAt-enteredAt) per stage
- Current stage duration: now - enteredAt of open stage_history row
