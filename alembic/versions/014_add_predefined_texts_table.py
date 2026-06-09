"""
# Add predefined_texts table

## Summary
Creates `predefined_texts` table to store user-specific clinical note templates.

## New Table: predefined_texts

| Column     | Type         | Description                        |
|------------|--------------|-------------------------------------|
| id         | INTEGER PK   | Auto-increment primary key          |
| user_id    | INTEGER FK   | Owner (references users.id)         |
| title      | VARCHAR(200) | Short display name                  |
| content    | TEXT         | Full text body                      |
| active     | BOOLEAN      | Visible in selector when true       |
| created_at | DATETIME     | Creation timestamp                  |
| updated_at | DATETIME     | Last modification timestamp         |
"""

import sqlalchemy as sa
from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "predefined_texts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_predefined_texts_user_id", "predefined_texts", ["user_id"])


def downgrade():
    op.drop_table("predefined_texts")
