# Comprehensive Audit Logging + Revert/Restore Design

## Goal

Extend the existing audit log to cover all critical data collections with before/after snapshots, and add a restore capability so any logged change can be undone directly from the audit log admin page.

## Context

The app already has an `audit_log` Supabase table and an `auditLog()` function in `admin.html`. Current gaps:

- **Missing `changed_by` display name** — only `user_email` and `user_id` are stored
- **No snapshots** — `previous_value`/`new_value` are not stored, so revert is impossible
- **Coverage gaps** — tournaments, news, awards, sponsors, albums, photos, pageLayouts, config, and account changes are not logged at all

## Architecture

### Phase 1: Schema

One SQL migration adds three columns to `audit_log`:

```sql
alter table audit_log
  add column previous_value  jsonb,
  add column new_value       jsonb,
  add column changed_by      text;
```

- `previous_value` — record/collection state before the change. `null` for creates.
- `new_value` — record/collection state after the change. `null` for deletes.
- `changed_by` — admin's display name at time of action (e.g. "Scott Spratlen"), pulled from `HeroesAuth.getProfile().display_name`.
- `created_at` already exists (`timestamptz not null default now()`) — no change needed.

**Snapshot semantics:**

| Action type | `previous_value` | `new_value` |
|---|---|---|
| add/create | `null` | the new record object |
| edit/update | the record before change | the record after change |
| delete | the record before deletion | `null` |
| collection-level save (pageLayouts, config) | full collection array before | full collection array after |

**Restore semantics:**

| Action type | Restore operation |
|---|---|
| add | remove the record (filter by `record_id`) |
| edit | replace current record with `previous_value` |
| delete | re-insert `previous_value` into the collection |
| collection-level | replace entire collection with `previous_value` |

### Phase 2: `auditLog()` Function

`auditLog()` in `admin.html` is updated to:
- Accept an optional fifth parameter `opts = {}` with `opts.previousValue` and `opts.newValue`
- Auto-populate `changed_by` from `HeroesAuth.getProfile().display_name`
- Pass all fields to the Supabase insert

All existing `auditLog()` call sites continue to work with no changes (opts defaults to `{}`).

```js
async function auditLog(action, collection, recordId, summary, opts = {}) {
  const sb = _getClient();
  if (!sb) return;
  let userEmail = 'unknown', userId = null, changedBy = null;
  try {
    if (typeof HeroesAuth !== 'undefined') {
      const prof = HeroesAuth.getProfile();
      const sess = HeroesAuth.getSession();
      userEmail = prof?.email || sess?.user?.email || 'unknown';
      userId    = sess?.user?.id || null;
      changedBy = prof?.display_name || prof?.email || null;
    }
  } catch(_) {}
  await sb.from('audit_log').insert({
    user_email:     userEmail,
    user_id:        userId,
    changed_by:     changedBy,
    action, collection,
    record_id:      String(recordId || ''),
    summary:        summary || '',
    previous_value: opts.previousValue ?? null,
    new_value:      opts.newValue      ?? null,
  });
}
```

### Phase 3: Coverage Gaps

**Existing calls — add snapshots:** Each existing `auditLog()` call site is updated to capture before/after. Pattern:

```js
const before = d.games.find(g => g.id === id);
// ... make the change ...
saveCollection('games', d.games);
auditLog('game_edit', 'games', id, summary, { previousValue: before, newValue: updated });
```

Collections with existing logging that need snapshots added: `players`, `teams`, `games`, `events`, approvals.

**New coverage — collections with zero logging today:**

| Collection | Events to log | Snapshot type |
|---|---|---|
| `tournaments` | add, edit, delete | single record |
| `news` | add, edit, delete | single record |
| `awards` | add, edit, delete | single record |
| `sponsors` | add, edit, delete | single record |
| `albums` | add, delete | single record |
| `photos` | add, delete | single record |
| `pageLayouts` | any save | full collection array |
| `config` | any save | full collection array |
| profiles (accounts) | role change, deactivation, manual edit | single record |

**Stats note:** There is no separate `stats` collection. Stats are embedded in `games` and `players`. Logging those collections covers stats changes automatically.

### Phase 4: Restore Logic

A `restoreFromAudit(entry)` function in `admin.html` applies the inverse of any logged change:

```js
async function restoreFromAudit(entry) {
  const { action, collection, record_id, previous_value, new_value } = entry;
  const isDelete = action.includes('_delete') || action === 'delete';
  const isAdd    = action.includes('_add')    || action === 'add';

  if (['players', 'teams', 'tournaments'].includes(collection)) {
    const d = loadData();
    if (isDelete)   d[collection] = [...d[collection], previous_value];
    else if (isAdd) d[collection] = d[collection].filter(r => r.id !== record_id);
    else            d[collection] = d[collection].map(r => r.id === record_id ? previous_value : r);
    saveCollection(collection, d[collection]);
  } else {
    const d = loadData();
    if (isDelete)                        d[collection] = [...(d[collection] || []), previous_value];
    else if (isAdd)                      d[collection] = (d[collection] || []).filter(r => r.id !== record_id);
    else if (Array.isArray(previous_value)) d[collection] = previous_value; // full collection restore
    else                                 d[collection] = (d[collection] || []).map(r => r.id === record_id ? previous_value : r);
    saveData(d);
  }

  auditLog('restore', collection, record_id,
    `Restored to state from ${new Date(entry.created_at).toLocaleString()}`);
}
```

### Phase 5: Audit Log UI

Changes to the existing audit log admin section:

- **New columns displayed:** `changed_by` name, `created_at` as full date + time (e.g. "Sep 4, 2026 3:42 PM"), action, collection, summary
- **Restore button:** Each row with a non-null `previous_value` (or `new_value` for adds) shows a "↩ Restore" button
- **Confirmation modal:** "Restore [summary] to its state from [date/time]? This will overwrite the current record."
- **On confirm:** calls `restoreFromAudit(entry)`, shows success toast, refreshes audit log table
- **Old entries** (before this feature, no snapshots): no restore button shown
- **Restore action itself** is logged as a new `audit_log` entry with `action = 'restore'`

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260904_audit_log_snapshots.sql` | Add `previous_value`, `new_value`, `changed_by` columns |
| `admin.html` | Update `auditLog()`, add `restoreFromAudit()`, update all call sites with snapshots, add new call sites for unlogged collections, update audit log UI |

Both repos (prod + staging) receive identical changes.

## Success Criteria

1. Every create/edit/delete across all listed collections writes an audit row with `previous_value`, `new_value`, and `changed_by`
2. The audit log page shows `changed_by` name and full date/time for every row
3. A "↩ Restore" button appears on rows that have snapshot data
4. Clicking Restore + confirming successfully reverts the record/collection to its prior state and logs a `restore` entry
5. Restoring a deleted record re-adds it to the collection; restoring an added record removes it; restoring an edit reverts the fields
6. Old audit rows (no snapshots) display normally with no restore button
