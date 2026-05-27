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
- Existing rows get NULL for central_sync_hash, triggering a one-time full update
  on the next sync cycle. After that, updates only occur when central data changes.
- Users created locally (not from central) will always have NULL and are never
  overwritten by the sync process.
"""

from alembic import op
import sqlalchemy as sa


revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'users',
        sa.Column('central_sync_hash', sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column('users', 'central_sync_hash')
