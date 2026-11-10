from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from blakrasocial.application.errors import NotConfigured
from blakrasocial.application.ports.oauth_provider import OAuthProvider
from blakrasocial.application.ports.platform_connector import PlatformConnector
from blakrasocial.domain.enums import Platform


@dataclass(frozen=True, slots=True)
class Network:
    provider: OAuthProvider
    connector: PlatformConnector


class NetworkRegistry:
    """The networks this deployment has apps for. Adding a network = registering one more entry (OCP)."""

    def __init__(self, networks: Mapping[Platform, Network]) -> None:
        self._networks = dict(networks)

    def get(self, platform: Platform) -> Network:
        network = self._networks.get(platform)
        if network is None:
            raise NotConfigured(f"{platform.value.title()} isn't set up for this service yet.")
        return network

    @property
    def platforms(self) -> frozenset[Platform]:
        return frozenset(self._networks)
