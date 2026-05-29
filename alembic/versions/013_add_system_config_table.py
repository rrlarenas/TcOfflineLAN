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
| id          | INTEGER PK   | Auto-increment primary key                               |
| key         | VARCHAR(100) | Unique configuration key                                 |
| value       | TEXT         | String-encoded value                                     |
| description | TEXT         | Human-readable description shown in the admin UI         |
| updated_at  | DATETIME     | Last modification timestamp                              |

## Configurable Keys Seeded

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

## Notes
- Uses SQLite-compatible syntax (no PL/pgSQL blocks, no TIMESTAMP WITH TIME ZONE)
- Values are always stored as strings; the application layer parses types
- Seeded with defaults matching .env defaults so existing deployments are unaffected
"""

from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "system_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_index("ix_system_config_key", "system_config", ["key"], unique=True)

    bind = op.get_bind()
    bind.execute(sa.text("""
        INSERT OR IGNORE INTO system_config (key, value, description) VALUES
        ('central_url',              'http://demo01.tcdb.vtas.cl.intersystems.com', 'URL base del servidor central TrakCare'),
        ('central_api_endpoint',     '/demo01/tcoffline/getData',                  'Endpoint para obtener episodios del central'),
        ('central_hl7_endpoint',     '/demo01/tcoffline/hl7inbound',               'Endpoint para enviar mensajes HL7 al central'),
        ('central_users_endpoint',   '/demo01/tcoffline/getUsers',                 'Endpoint para sincronizar usuarios desde el central'),
        ('central_api_username',     'demo',                                       'Usuario de autenticacion con el central'),
        ('central_api_password',     'demodemo',                                   'Contrasena de autenticacion con el central'),
        ('health_check_interval',    '8',                                          'Intervalo en segundos para verificar conectividad con el central'),
        ('downstream_sync_interval', '60',                                         'Intervalo en segundos para sincronizacion de episodios desde el central'),
        ('upstream_sync_interval',   '10',                                         'Intervalo en segundos para envio de eventos HL7 al central'),
        ('max_retries',              '5',                                          'Numero maximo de reintentos para eventos HL7 fallidos')
    """))


def downgrade():
    op.drop_index("ix_system_config_key", table_name="system_config")
    op.drop_table("system_config")
