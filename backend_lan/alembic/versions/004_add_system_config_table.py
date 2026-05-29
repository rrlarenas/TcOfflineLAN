"""
# Add system_config table

## Summary
Adds a new `system_config` table to persist all runtime-configurable parameters
that administrators can change from the frontend without restarting the backend.

## New Tables

### system_config
Stores key-value configuration entries for operational parameters.

| Column       | Type         | Description                                              |
|-------------|--------------|----------------------------------------------------------|
| id          | SERIAL PK    | Auto-increment primary key                               |
| key         | VARCHAR(100) | Unique configuration key (e.g., "central_url")          |
| value       | TEXT         | String-encoded value                                     |
| description | TEXT         | Human-readable description shown in the admin UI         |
| updated_at  | TIMESTAMP    | Last modification timestamp                              |

## Configurable Keys Seeded by This Migration

| Key                       | Default Value                               |
|--------------------------|---------------------------------------------|
| central_url              | http://demo01.tcdb.vtas.cl.intersystems.com |
| central_api_endpoint     | /demo01/tcoffline/getData                   |
| central_hl7_endpoint     | /demo01/tcoffline/hl7inbound                |
| central_users_endpoint   | /demo01/tcoffline/getUsers                  |
| central_api_username     | demo                                        |
| central_api_password     | demodemo                                    |
| health_check_interval    | 8                                           |
| downstream_sync_interval | 60                                          |
| upstream_sync_interval   | 10                                          |
| max_retries              | 5                                           |
| database_url             | (empty — kept in .env for security)         |

## Security
- No RLS (PostgreSQL/SQLAlchemy stack, not Supabase)
- Access restricted at application layer: only admin users can read/write via API
- database_url key intentionally seeded empty; it remains .env-only for security

## Notes
- Existing settings in sync_state table are NOT migrated (they use a different schema)
- Values are always stored as strings; the application layer parses them to their types
- The table is seeded with defaults matching the current .env defaults so existing
  deployments are unaffected until an administrator explicitly changes a value
"""

from alembic import op
import sqlalchemy as sa


revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "system_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("NOW()"),
            onupdate=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.create_index("ix_system_config_key", "system_config", ["key"], unique=True)

    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            INSERT INTO system_config (key, value, description) VALUES
            ('central_url',              'http://demo01.tcdb.vtas.cl.intersystems.com', 'URL base del servidor central TrakCare'),
            ('central_api_endpoint',     '/demo01/tcoffline/getData',                  'Endpoint para obtener episodios del central'),
            ('central_hl7_endpoint',     '/demo01/tcoffline/hl7inbound',               'Endpoint para enviar mensajes HL7 al central'),
            ('central_users_endpoint',   '/demo01/tcoffline/getUsers',                 'Endpoint para sincronizar usuarios desde el central'),
            ('central_api_username',     'demo',                                       'Usuario de autenticación con el central'),
            ('central_api_password',     'demodemo',                                   'Contraseña de autenticación con el central'),
            ('health_check_interval',    '8',                                          'Intervalo en segundos para verificar conectividad con el central'),
            ('downstream_sync_interval', '60',                                         'Intervalo en segundos para sincronización de episodios desde el central'),
            ('upstream_sync_interval',   '10',                                         'Intervalo en segundos para envío de eventos HL7 al central'),
            ('max_retries',              '5',                                          'Número máximo de reintentos para eventos HL7 fallidos')
            ON CONFLICT (key) DO NOTHING
            """
        )
    )


def downgrade():
    op.drop_index("ix_system_config_key", table_name="system_config")
    op.drop_table("system_config")
