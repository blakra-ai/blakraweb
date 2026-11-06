"""Honors Meta's 'user removed the app' and 'delete my data' callbacks for Facebook and Instagram."""

from __future__ import annotations

import secrets

from blakrasocial.application.errors import NotFound
from blakrasocial.application.ports.clock import Clock
from blakrasocial.application.ports.repositories import (
    CredentialRepository,
    DeletionReceipt,
    DeletionReceiptRepository,
)
from blakrasocial.domain.enums import Platform


class ForgetNetworkUser:
    """Deletes every token the network user gave us. Posts already published stay on the network;
    queued posts for that account then fail with 'reconnect', so nothing is published afterwards."""

    def __init__(self, credentials: CredentialRepository, receipts: DeletionReceiptRepository, clock: Clock) -> None:
        self._credentials = credentials
        self._receipts = receipts
        self._clock = clock

    async def execute(self, platform: Platform, subject: str) -> DeletionReceipt:
        removed = await self._credentials.delete_by_subject(platform, subject)
        receipt = DeletionReceipt(secrets.token_hex(8), platform, removed, self._clock.now())
        await self._receipts.add(receipt)
        return receipt


class GetDeletionReceipt:
    def __init__(self, receipts: DeletionReceiptRepository) -> None:
        self._receipts = receipts

    async def execute(self, code: str) -> DeletionReceipt:
        receipt = await self._receipts.get(code) if code.isalnum() and len(code) <= 32 else None
        if receipt is None:
            raise NotFound("Unknown confirmation code.")
        return receipt
