"""Tiny server-rendered pages shown inside the connect popup after a network's consent screen.

Everything dynamic is HTML-escaped; a per-response nonce is the only way scripts/styles run.
"""

from __future__ import annotations

import html
import secrets
from collections.abc import Sequence

from fastapi.responses import HTMLResponse

from blakrasocial.domain.entities import ConnectedAccount
from blakrasocial.domain.enums import Platform

_NAMES = {
    Platform.INSTAGRAM: "Instagram",
    Platform.FACEBOOK: "Facebook",
    Platform.TIKTOK: "TikTok",
    Platform.LINKEDIN: "LinkedIn",
    Platform.WHATSAPP: "WhatsApp",
}


_CSS = (
    """
body{font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;background:#f7f7fb;color:#1c1b29;
margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
main{background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);padding:28px;
max-width:420px;width:calc(100% - 32px)}
h1{font-size:20px;margin:0 0 8px} p{margin:6px 0;line-height:1.7;color:#4b4a5c}
.en{direction:ltr;text-align:left;font-size:13px} form{margin:0}
button{width:100%;display:flex;align-items:center;gap:12px;border:1px solid #e3e2ee;background:#fff;
border-radius:12px;padding:10px 12px;margin-top:10px;cursor:pointer;font:inherit;text-align:start}
button:hover{border-color:#7c5cff} img{width:36px;height:36px;border-radius:50%;object-fit:cover}
.ok{color:#13795b} .err{color:#b42318}
"""
).replace("\n", " ")


def _page(title: str, body: str, *, close_after_ms: int | None = None, status: int = 200) -> HTMLResponse:
    nonce = secrets.token_urlsafe(16)
    script = (
        f'<script nonce="{nonce}">setTimeout(function(){{window.close()}},{close_after_ms});</script>'
        if close_after_ms is not None
        else ""
    )
    document = (
        '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>{html.escape(title)}</title><style nonce="{nonce}">{_CSS}'
        f"</style></head><body><main>{body}</main>{script}</body></html>"
    )
    return HTMLResponse(
        document,
        status_code=status,
        headers={
            "Content-Security-Policy": (
                f"default-src 'none'; script-src 'nonce-{nonce}'; style-src 'nonce-{nonce}'; img-src https: data:; "
                "form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
            ),
            "Cache-Control": "no-store",
        },
    )


def connected(platform: Platform, account: ConnectedAccount) -> HTMLResponse:
    name = html.escape(account.display_name)
    network = _NAMES[platform]
    return _page(
        f"{network} connected",
        f'<h1 class="ok">✓ {network} وصل شد</h1><p>حساب «{name}» متصل شد. این پنجره خودکار بسته می‌شود.</p>'
        f'<p class="en">{network} account "{name}" is connected. This window closes automatically.</p>',
        close_after_ms=1500,
    )


def failed(platform: Platform | None, message: str, status: int = 400) -> HTMLResponse:
    network = _NAMES.get(platform, "") if platform else ""
    return _page(
        "Connection failed",
        f'<h1 class="err">اتصال {html.escape(network)} انجام نشد</h1>'
        f'<p class="en">{html.escape(message)}</p><p>پنجره را ببندید و دوباره امتحان کنید.</p>',
        status=status,
    )


def choose(
    platform: Platform, token: str, choices: Sequence[tuple[str, ConnectedAccount]], action: str
) -> HTMLResponse:
    buttons = "".join(
        f'<form method="post" action="{html.escape(action)}">'
        f'<input type="hidden" name="token" value="{html.escape(token)}">'
        f'<input type="hidden" name="account_id" value="{html.escape(account_id)}">'
        f'<button type="submit">{_avatar(account)}<span>{html.escape(account.display_name)}</span></button></form>'
        for account_id, account in choices
    )
    network = _NAMES[platform]
    return _page(
        f"Choose a {network} account",
        f'<h1>کدام صفحه وصل شود؟</h1><p class="en">Choose the {network} Page to publish to.</p>{buttons}',
    )


def _avatar(account: ConnectedAccount) -> str:
    if account.avatar_url and account.avatar_url.startswith("https://"):
        return f'<img src="{html.escape(account.avatar_url)}" alt="" referrerpolicy="no-referrer">'
    return ""
