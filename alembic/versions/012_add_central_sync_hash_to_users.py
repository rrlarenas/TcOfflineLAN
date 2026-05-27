"""
# Add central_sync_hash to users table

## Summary
Adds a `central_sync_hash` column to the `users` table to support efficient
user synchronization from the central server.

## Changes

### Modified Tables

#### users
- `central_sync_hash` (TEXT, nullable): SHA-256 hash of the user's synced fields
  (username + nombre + password) as received from the central server.
  Used to detect changes and skip unnecessary updates: if the hash matches
  the incoming data, the user row is left untouched.

## Notes
- Existing rows get NULL for central_sync_hash, which will cause a full update
  on the next sync cycle (once per user, after which they are skipped unless
  the central data changes).
- Users created locally (not from central) will always have NULL and are never
  overwritten by the sync process.
"""

from alembic import op
import sqlalchemy as sa


revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(
            sa.Column('central_sync_hash', sa.Text(), nullable=True)
        )


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('central_sync_hash')
