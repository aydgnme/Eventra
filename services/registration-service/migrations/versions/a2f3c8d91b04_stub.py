"""stub for existing db revision

Revision ID: a2f3c8d91b04
Revises: 30480a567682
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

revision: str = 'a2f3c8d91b04'
down_revision: Union[str, Sequence[str], None] = '30480a567682'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
