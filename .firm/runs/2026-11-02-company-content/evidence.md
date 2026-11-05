# Evidence: old blakra.us (captured 2026-11-02)

Method: headless Chrome (playwright-core, /usr/bin/google-chrome), 1440x900, full scroll, every same-host link followed, every modal/tab trigger clicked. Raw text: `raw/home.txt` (full page + links + JSON-LD), `raw/interactions.txt` (route probes, modals, case-study tabs).

**Site shape:** one route only. `https://blakra.us/` is the whole site (sitemap.xml lists only `/`). `/privacy`, `/terms`, `/cookies`, `/careers`, `/about`, `/blog` all return the SPA's "404 Page Not Found". The footer "Privacy Policy / Terms of Service / Cookies" and the three "READ ARTICLE" links and "SUBSCRIBE" do nothing (no new content on click). All quotes below are from URL `https://blakra.us/` unless noted.

Status key: **USABLE** = consistent with FACTS.md / owner-confirmed; **DO NOT REUSE** = FACTS.md marks false, unverified or deliberately absent; **OWNER?** = not in FACTS.md, needs confirmation.

## People (section "LEADERSHIP")
| Quote | Status |
|---|---|
| "Hamid Reza Alizadeh (Ashen)" / "FOUNDER & CHIEF TECHNOLOGY OFFICER" / "AI strategy, systems architecture, full‑stack engineering, product delivery" | USABLE (name, title in FACTS) |
| "15+ years in software engineering and AI systems" | DO NOT REUSE (FACTS: "no years of experience shown") |
| "Mehdi Jannatipour" / "SENIOR FULL‑STACK ENGINEER & BACKEND LEAD" / "Backend systems, data platforms, reliability engineering" | USABLE |
| "10+ years in backend and full‑stack engineering" | DO NOT REUSE |
| "Habiburahman Karokhi" / "HEAD OF OPERATIONS & CORPORATE COMPLIANCE (UNITED STATES)" / "Corporate governance, compliance, vendor management" | USABLE (title; commit 2f5f5cb removed "United States" from the role title) |
| "10+ years in operations and compliance leadership" | DO NOT REUSE |
| "the team that presents is the team that builds" | USABLE in spirit (matches current "The people you meet are the people who build") |
| "Every engagement is led by engineers who still ship." | USABLE in spirit |
| No personal LinkedIn or other profile links for any principal. | (no LinkedIn found) |

## Social links (header "CONNECT" icons)
| Link | Status |
|---|---|
| `https://github.com/blakra`, `https://linkedin.com/company/blakra`, `https://twitter.com/blakra` | DO NOT REUSE (FACTS: github is an unrelated person; LinkedIn and X pages do not exist). JSON-LD `"sameAs": []` |

## Company story / dates
| Quote | Status |
|---|---|
| "FOUNDED 2024" (Leadership) and timeline "2024 FOUNDED" | USABLE (owner confirmed 2024) |
| JSON-LD `"foundingDate": "2019"`; Impact record "2019 Founded" | DO NOT REUSE (contradicts owner) |
| "Founded to bring systems‑level engineering to enterprise AI and automation — with a focus on disciplined architecture, rapid delivery, and measurable outcomes from day one." | OWNER? (motive only; no figures) |
| "BLAKRA was founded on a simple observation: most software firms either write elegant code that never ships, or ship quickly with quality as an afterthought. We built a company that does both" | OWNER? (motive; usable once confirmed) |
| "...has scaled into a 35+ person operation serving 48+ enterprise clients across 22 countries." | DO NOT REUSE (FACTS: live-site figures deliberately absent) |
| Timeline "2025 FIRST ENTERPRISE CLIENTS ... AI workflow automation, data platforms, and document intelligence — proving the model works across regulated industries." | OWNER? ("regulated industries" unverified) |
| "35+ COMBINED YEARS", "MID-MARKET TO ENTERPRISE" | DO NOT REUSE (years) / OWNER? (market segment) |
| "© 2024-2025 BLAKRA. All rights reserved." | consistent with 2024 |

## Testimonials and outcomes (section "IMPACT RECORD")
| Quote (verbatim) | Attribution as written | Status |
|---|---|---|
| "BLAKRA delivered a system that cut our document review time by 91%. On time, no surprises." | "CLIENT — FINANCIAL SERVICES" | DO NOT REUSE until owner confirms a real client said it and agrees to its use (charter: no invented testimonials; 91% is not in FACTS) |
| "Their team understood our logistics problem deeply and built exactly what we needed. The results speak for themselves." | "CLIENT — EUROPEAN LOGISTICS" | same |
| Stat tiles "5+ Projects delivered", "91% Avg. process improvement", "100% System uptime", "100% On-time delivery", "24h Response time", all labelled "VERIFIED" | — | Only "24h" is USABLE (FACTS). Others DO NOT REUSE |
| Case "Customer Service AI Assistant ... E-COMMERCE BRAND — 50K MONTHLY ORDERS": "65% of queries automated" | — | 65% USABLE (FACTS "Illustrations": confirmed outcome); "50K" not in FACTS → OWNER? |
| Case "Inventory & Reorder Management System ... REGIONAL RETAIL CHAIN — 12 LOCATIONS": "Reduced stockouts by 40%", "3 hours saved daily" | — | "12 stores" USABLE (FACTS); 40% and 3 hours → OWNER? |
| Case "Route Optimization & Dispatch Dashboard ... LOCAL DELIVERY FLEET — 25 DRIVERS": "20% more deliveries per shift" (raw/interactions.txt) | — | "25 drivers" USABLE; 20% → OWNER? |
| Case "Document Processing & Client Portal ... INDEPENDENT INSURANCE BROKERAGE" | — | OWNER? (no figures) |
| Case "Production Line Monitoring Dashboard ... MID-SIZE MANUFACTURING PLANT" | — | OWNER? |
| "More work" grid of 20 one-paragraph projects (restaurant group, real estate agency, fitness chain, HVAC, clinic, municipal lot, legal firm, construction firm, property manager, hospitality group ...) | — | OWNER? Not in FACTS; current site replaced them with 8 selected projects (commit 1922106). Treat as unverified |

## Engagement (section "ENGAGEMENT MODELS")
| Quote | Status |
|---|---|
| "Every engagement begins with a technical architecture assessment — no commitments, no sales pressure. If it's not the right fit, we'll tell you." | USABLE (free assessment in FACTS) |
| "Every engagement starts with a free technical architecture assessment. No pitch decks. No sales quotas." | USABLE |
| EM.02 "Project-Based Delivery / FIXED SCOPE, FIXED PRICE, ON-TIME DELIVERY." with "Fixed-price contracts", "Milestone-based payments", "Full documentation & handover", "Source code ownership" | Fixed scope/price and code ownership USABLE; "Milestone-based payments" and "documentation & handover" OWNER? |
| EM.01 "Team Extension" ("Same-day onboarding", "Scales up or down in 2 weeks") | OWNER? (current site offers only project → support) |
| EM.03 "Product Squad" ("Dedicated product manager", "SLAs with penalty terms") | OWNER? / likely DO NOT REUSE (no PM role among principals) |
| "We'll respond within 24 hours with a clear plan for how we can help." | USABLE |
| No price, rate, minimum budget, time zone, working hours, working language or NDA wording anywhere. | gap |

## Industries
| Quote | Status |
|---|---|
| R&D.01 "Target market: high-stakes enterprise decision systems — financial services, healthcare, legal." | DO NOT REUSE as served industries (R&D targets, not clients) |
| R&D.03 "Target markets: logistics warehousing, healthcare facilities, manufacturing floors." | same |
| Testimonial attributions "FINANCIAL SERVICES", "EUROPEAN LOGISTICS"; case labels retail chain, delivery fleet, insurance brokerage, manufacturing plant, e-commerce brand | OWNER? (stated on old site, unverified) |

## Investors / R&D
"We're raising a Seed round", "Encrypted data room", "3x the velocity", "18 months", lab metrics ("0.8ms", "99.4%", "847K/s"), JSON-LD funding "minValue 500000 / maxValue 5000000" — DO NOT REUSE (FACTS: no seed round, data room or figures).

## Careers
No careers, jobs or "join us" section, link or route on the old site (`/careers` → 404). Current footer: "Engineers and designers who want to join a project:" (en.ts `footer.join`).
