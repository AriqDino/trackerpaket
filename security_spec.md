# Security Specification — LacakPaket Firestore Rules

## 1. Data Invariants
1. **Strict Ownership & Tenant Isolation**: Every document under `/users/{userId}` and `/users/{userId}/packages/{packageId}` belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Master Gate Parent Existence**: A package under `/users/{userId}/packages/{packageId}` cannot be created or updated unless the parent `/users/{userId}` account document exists.
3. **Immutable Identity & Creation Timestamp**: `uid` on `/users/{userId}`, `ownerId`, `id`, `awb`, `courierCode`, `courierName`, and `createdAt` on `/users/{userId}/packages/{packageId}` cannot be changed after creation.
4. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
5. **Terminal State Locking**: Once a package reaches `normalizedStatus == 'delivered'`, its `tracking` payload and `normalizedStatus` are locked against mutation; only `label` (renaming) and `updatedAt` may be modified, or the document may be deleted.
6. **Strict Schema & Bounds**: Unknown shadow fields are rejected via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`. Every string and array (`history.size() <= 100`) is size-bounded and path IDs match `^[a-zA-Z0-9_\\-]+$` with max length 128.
7. **Query-Side Enforcement**: Collection `list` on `/users/{userId}/packages` enforces `resource.data.ownerId == request.auth.uid` directly in the rule (no `get()`/`exists()` inside `allow list`).

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: Writing `/users/u1/packages/spx__123` with `request.auth == null`.
2. **Unverified Email Write**: Writing `/users/u1` with `request.auth.token.email_verified == false`.
3. **Cross-User Read (`get`)**: User `u2` reading `/users/u1` or `/users/u1/packages/spx__123`.
4. **User Directory Enumeration (`list`)**: Any user listing `/users`.
5. **Cross-User List Scraping**: User `u2` querying `/users/u1/packages`.
6. **Identity Spoofing on Create**: User `u1` creating `/users/u1/packages/spx__123` with `ownerId: "u2"`.
7. **Shadow / Ghost Field Injection**: Creating `/users/u1` with `{ ..., isAdmin: true }` or updating with `{ label: "Test", role: "superadmin" }`.
8. **ID Poisoning**: Creating `/users/u1/packages/invalid:id` (colon) or a 1.5KB document ID string.
9. **Client Timestamp Forgery**: Creating `/users/u1/packages/spx__123` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
10. **Immutable Field Mutation**: Updating `createdAt`, `ownerId`, `awb`, or `courierCode` on an existing package.
11. **Terminal State Violation**: Updating `normalizedStatus` or `tracking` on a package whose existing `normalizedStatus == "delivered"`.
12. **Type / Array Overflow Poisoning**: Setting `label` to a boolean/10KB string or `tracking.history` to >100 items or non-list.

## 3. Reference Test Runner (`firestore.rules.test.ts` spec)
```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'node:fs';

// Pseudocode test suite targeting Firebase Emulator Suite:
// - Verified auth context for u1 (`uid: 'u1', email_verified: true`) and u2 (`uid: 'u2', email_verified: true`)
// - Unverified auth context (`uid: 'u3', email_verified: false`)
// - Executes all 12 Dirty Dozen payloads and asserts assertFails(...) -> PERMISSION_DENIED
// - Executes valid user create/update, valid package create, rename, active refresh, and delete -> assertSucceeds(...)
```
