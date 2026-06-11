"""Widen sexo column from VARCHAR(10) to VARCHAR(20)

Revision ID: 015
Revises: 014
"""

import sqlalchemy as sa
from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("episodes") as batch_op:
        batch_op.alter_column(
            "sexo",
            existing_type=sa.String(10),
            type_=sa.String(20),
            existing_nullable=True,
        )


def downgrade():
    with op.batch_alter_table("episodes") as batch_op:
        batch_op.alter_column(
            "sexo",
            existing_type=sa.String(20),
            type_=sa.String(10),
            existing_nullable=True,
        )
