"""Add author_user_id to outbox_events

Revision ID: 011
Revises: 010
Create Date: 2026-05-19

Changes:
- Adds nullable column author_user_id (FK -> users.id) to outbox_events table
- Allows tracking which user created each outbox event for correct HL7 OBR.24 population
"""

from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('outbox_events') as batch_op:
        batch_op.add_column(
            sa.Column('author_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True)
        )


def downgrade():
    with op.batch_alter_table('outbox_events') as batch_op:
        batch_op.drop_column('author_user_id')
