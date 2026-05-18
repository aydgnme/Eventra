"""add qr_token and confirmation fields to registrations

Revision ID: b3c1d2e4f5a6
Revises: 30480a567682
Create Date: 2026-05-07 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c1d2e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a2f3c8d91b04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('registrations', sa.Column('qr_token', sa.String(length=64), nullable=True))
    op.add_column('registrations', sa.Column('confirmation_sent_at', sa.DateTime(), nullable=True))
    op.add_column('registrations', sa.Column('confirmed_at', sa.DateTime(), nullable=True))
    op.create_index('ix_registrations_qr_token', 'registrations', ['qr_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_registrations_qr_token', table_name='registrations')
    op.drop_column('registrations', 'confirmed_at')
    op.drop_column('registrations', 'confirmation_sent_at')
    op.drop_column('registrations', 'qr_token')
