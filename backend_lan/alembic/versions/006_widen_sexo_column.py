"""Widen sexo column from VARCHAR(10) to VARCHAR(20)

Revision ID: 006
Revises: 005
"""

import sqlalchemy as sa
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "episodes",
        "sexo",
        existing_type=sa.String(10),
        type_=sa.String(20),
        existing_nullable=True,
    )


def downgrade():
    op.alter_column(
        "episodes",
        "sexo",
        existing_type=sa.String(20),
        type_=sa.String(10),
        existing_nullable=True,
    )
