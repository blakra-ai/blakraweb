"""data deletion: credential subject hash + deletion receipts

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-01 17:00:00
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("credentials", sa.Column("subject_hash", sa.String(length=64), nullable=True))
    op.create_index(op.f("ix_credentials_subject_hash"), "credentials", ["subject_hash"], unique=False)
    op.create_table(
        "deletion_receipts",
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("platform", sa.String(length=16), nullable=False),
        sa.Column("removed", sa.Integer(), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("code", name=op.f("pk_deletion_receipts")),
    )


def downgrade() -> None:
    op.drop_table("deletion_receipts")
    op.drop_index(op.f("ix_credentials_subject_hash"), table_name="credentials")
    op.drop_column("credentials", "subject_hash")
