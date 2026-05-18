import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool

# Ensure the service root is on sys.path so "app" and "config" are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app, db  # noqa: E402
from app.models.user import User  # noqa: E402, F401
from app.models.password_reset import PasswordResetToken  # noqa: E402, F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

flask_app = create_app()
target_metadata = db.metadata


def run_migrations_offline() -> None:
    with flask_app.app_context():
        url = flask_app.config["SQLALCHEMY_DATABASE_URI"]
        context.configure(
            url=url,
            target_metadata=target_metadata,
            literal_binds=True,
            dialect_opts={"paramstyle": "named"},
            render_as_batch=True,
            version_table='alembic_version_auth',
        )
        with context.begin_transaction():
            context.run_migrations()


def run_migrations_online() -> None:
    with flask_app.app_context():
        connectable = db.engine

        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                render_as_batch=True,
                version_table='alembic_version_auth',
            )
            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
