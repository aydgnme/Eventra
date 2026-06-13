"""add is_paid and ticket_price to events

Revision ID: 3f90f87b978d
Revises: 5b0139a03348
"""
from alembic import op
import sqlalchemy as sa

revision = '3f90f87b978d'
down_revision = '5b0139a03348'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('events', sa.Column('is_paid', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('events', sa.Column('ticket_price', sa.Numeric(precision=10, scale=2), nullable=True))


def downgrade():
    op.drop_column('events', 'ticket_price')
    op.drop_column('events', 'is_paid')
