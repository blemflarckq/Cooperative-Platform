# Cooperative Platform — Roadmap to Pilot

**Team:** Solo founder + Claude
**Pilot target:** One real cooperative, a few dozen members
**Scope for pilot:** Full loan lifecycle (apply → approve → disburse →
repay), built on a generalized approval-workflow engine that also supports
non-lending group purposes (community projects, church funds, crowdfunding)

---

## How to read this document

Nine phases, roughly sequential but with some overlap. Each phase ends with
a concrete "done" test — not "code written" but "this specific thing is
true." As a solo founder, your scarce resource isn't typing speed (that's
what I'm for) — it's **decision-making and review time**. So each phase is
scoped to produce a small number of decisions for you, not an overwhelming
pile of choices.

Rough total: **4–6 months** at a steady part-time pace, less if you can work
on it close to full-time — longer than the original estimate, because the
approval-workflow engine (Phase 2) and mobile money integration (Phase 3)
are now core platform infrastructure, not just a "loans" feature. That's the
right tradeoff: it's more foundational work, but it makes the platform
genuinely general-purpose rather than single-use, which is the vision you
described.

---

## Phase 0 — Personas & User Stories (3–5 days)

**Why first:** You said it yourself — the current views are admin-focused
because that's who the code was written for. Before touching the loans
feature or redesigning any screen, we need to agree on *who* uses this
system and *what they're trying to do*, in plain language. This becomes the
yardstick for every later decision ("does this help the member persona?").

**Deliverable:** A short persona + user story doc (I'll draft it, you correct
it — you know the real users, I don't). These are now grounded in your
positioning work, not generic "fintech user" roles — a Motshelo group runs on
identity and social trust, not just transactions:

- **Member (Group Participant)** — joins for belonging and identity as much
  as function. Motivated more by *not letting the group down* than by
  growth (loss aversion beats gain motivation). Wants to see the group's
  collective story, not just a personal balance — "did we hit our target
  this cycle," not just "what do I have." Low financial-jargon literacy
  assumed; high social/relational literacy — speak in terms of commitments
  and belonging, not accounting terms.
- **Treasurer** — not just "an admin." Per your own go-to-market plan, this
  is your single most important user and champion. Today this person
  carries the burden of trust manually — mental math, paper ledgers, social
  pressure to be accurate in front of the group. The platform's job is to
  make them look good and carry less of that burden, not just give them a
  CRUD panel. This reframes some Phase 1/2 priorities: treasurer-facing
  clarity is as much a launch-blocker as security hardening.
- **Loan Officer / Committee member** *(may or may not be distinct from
  Treasurer in your real cooperative — question for you)*.
- **Community Leader / Endorser** *(chief, pastor)* — open question, not yet
  decided: is this a real in-app role (e.g. a "verified/endorsed by" badge
  on a group), or purely an off-platform trust-transfer relationship that
  never touches the software? Worth deciding before Phase 5 branding work.
- **You (Platform Owner)** — onboarding new cooperatives, monitoring health
  across tenants, and — new, from the positioning work — eventually pulling
  *aggregate* cross-cooperative numbers for public "State of Basotho
  Savings" reporting. See Phase 7.

**Done when:** You can read the persona doc and say "yes, that's actually
how my cooperative works" — or correct it until it is.

---

## Phase 1 — Security & Stability Hardening (1.5–2 weeks)

Closing the gaps identified in the audit. This is not glamorous work but
it's non-negotiable before real money touches the system. Grouped by what
each fix actually buys you:

**Trust the auth system**
- Remove hardcoded fallback JWT secrets — app should refuse to start if
  `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` aren't set, never silently use a
  known default.
- Fix `process.env.port` → `process.env.PORT` casing bug (api + worker).
- Make CORS origin environment-driven instead of hardcoded to localhost.

**Trust that data isolation actually holds**
- Write a dedicated integration test: log in as Cooperative A, attempt to
  read/write Cooperative B's data, confirm it's blocked. This is the single
  most important test in the whole hardening phase for a multi-tenant
  financial system.
- Clean up `TenantGuard` — remove debug `console.log`s, resolve the
  duplicate-registration confusion between `api.module.ts` and
  `tenant.module.ts`.

**Trust that bad input can't get in**
- Add a global `ValidationPipe` so the `class-validator` decorators you
  already have actually get enforced.

**Trust that you'll know when something breaks**
- Add a global exception filter (consistent, safe error responses — no raw
  stack traces leaking to clients).
- Replace `console.log`/`console.error` with structured logging.
- Add `/health` endpoints for API and Worker.

**Trust the deployment**
- Clean up the Dockerfile (remove commented-out lines and the debug `ls`
  step, properly wire `entrypoint.sh` or remove it).
- Confirm/remove the apparently-dead `apps/coop-platform` scaffold.
- Add `helmet` and basic rate limiting.

**Trust the money-moving code specifically**
- Add real test coverage for the posting engine, journal entries, and
  contributions — this is the part of the system where a silent bug means a
  member's balance is simply wrong. Everything else can be "good enough for
  a pilot"; this can't.

**Done when:** CI is green, the cross-tenant test passes, and you could
explain to a cooperative member in one sentence why their money is safe.

---

## Phase 2 — Generalize "Scheme" and Build the Approval Workflow Engine (3–4 weeks)

This is the biggest architectural change coming out of your answers. The
original Phase 2 was scoped as "build loans." That's now too narrow —
loans are just *one instance* of a more general pattern: **money leaving a
group's pooled account always requires initiate → 1st approval → 2nd
approval, regardless of whether it's a loan disbursement, a project expense,
or a crowdfunding payout.**

1. **Generalize the group concept.** The existing `cooperative-scheme`
   entity becomes the base for a broader "Group" concept with a
   `purpose_type` (savings & credit, community project, church fund,
   crowdfunding, other). This determines which optional features are active
   — e.g. only savings & credit groups get loan-specific fields like
   interest terms — but every group type shares the same core: membership,
   full transparency into pooled-account activity, and approval-gated
   withdrawals.
2. **Build a reusable Approval Workflow Engine**, not a loan-specific
   approval flow. A generic "Outbound Request" (withdrawal, disbursement,
   expense payout) moves through: **Initiate → Approval 1 → Approval 2 →
   Executed**, exactly matching what you described for the real society
   accounts.
3. **Standardize on 2 approvers for every outbound request, across all group
   types.** This replaces the earlier "Treasurer alone" idea — no single
   person, including the Treasurer, can move money out unilaterally. What
   still varies by group type is *who's eligible* to be one of the two
   approvers, configured per group as an **Approval Policy**:
   - Formal cooperative → e.g. Treasurer + one designated co-signatory.
   - Community-led project → any 2 of the committee.
   This is simpler to reason about and build than variable approval counts,
   and it's a stronger control besides.
4. **Rotating roles, with a deliberate handover step.** You confirmed the
   onus is on the *outgoing* committee to action the transition to the new
   one — this should be a real, visible action in the system (not an
   automatic timer), so there's always a clear record of who handed over to
   whom and when. For disputes, add a **petition mechanism**: a group can
   flag a contested handover to you (the platform owner) for manual
   resolution. Lightweight for pilot — a form that creates a flagged case
   for you to review, not an automated arbitration system.
5. **Add the Auditor role** — read-only visibility into a group's full
   financial activity, cannot initiate or approve anything. Straightforward
   to add given the RBAC system already in place.
6. **Visibility is configurable by the group's leader, with two modes.**
   The raw society-account statement always shows who made each
   transaction — that's inherent to how the mobile money account itself
   works, not something we control. But *within the platform*, the group
   leader chooses how contribution activity is surfaced to members:
   - **Full transparency** — members see individual contribution amounts
     across the group.
   - **Ranking mode** — members see relative standing ("you rank 5th this
     cycle") without exact figures being broadcast. This gives the social
     motivation of comparison without the exposure/shaming risk of raw
     numbers — genuinely a nice middle ground, worth building as a real
     first-class option, not an afterthought.
   Individual contribution history stays visible to the member themself
   regardless of mode.
7. **Loans become the first real use of this engine.** Loan application →
   2-approver sign-off (per that group's Approval Policy) → disbursement
   request enters the Outbound Request flow → on full approval, posts the
   journal entry and emits `loan.issued`.

**On interest/growth as a motivator:** noted and folded into Phase 6 — loss
aversion and growth incentives aren't either/or, they work together. A
member should see both "don't miss your payment" *and* "here's what you're
on track to receive," not just one framing.

**Done when:** A test community-project group and a test savings group both
correctly require exactly 2 eligible approvers before a withdrawal executes
(with different eligible-approver rules per group), role rotation doesn't
corrupt historical audit records, and a group leader can switch a group
between full-transparency and ranking-mode visibility with correct behavior
in both.

---

## Phase 3 — Mobile Money Integration (scope depends on provider APIs — 2–5 weeks)

This is new, and it's the phase where the platform stops being
self-contained software and starts talking to the real financial system.
Given the regulatory point above, the design principle is: **the platform
governs and records; it never custodies funds.**

**Good news, confirmed by you:** early conversations with the providers
indicate programmatic access is supported in principle. What's still
missing is the actual API documentation — you're following up on that.
This phase can move from "design pending an unknown" to "design pending
paperwork," which is a much better place to be. Once the docs land, I can
scope this phase precisely; until then, the plan below holds as the
working assumption.

**Core pieces regardless of final API details:**
1. **Member-to-mobile-money-number linking**, so an incoming deposit can be
   matched to the member who made it.
2. **Deposit reconciliation** — automatic if a provider API/webhook exists;
   otherwise a simple "confirm receipt" flow for the Treasurer, with the
   platform flagging mismatches.
3. **Withdrawal handoff** — once an Outbound Request clears all required
   approvals, either call the provider's disbursement API directly, or
   generate clear execution instructions for the approved signatory and
   await confirmation.

**Done when:** A test deposit made into a real (sandbox or test) mobile
money account is correctly matched to a member in the platform, and a fully
approved withdrawal request results in money actually moving — automated or
human-executed, reconciled either way.

---

## 📌 PINNED — Phone-based authentication (parked, not forgotten)

**This is explicitly flagged as important, not deferred by default.**
Founder's own framing, verbatim in intent: phone number will be how 95%+
of real users access this platform — not email. Email + password is
today's mechanism purely because no SMS/OTP provider integration exists
yet, not because it's the right long-term answer.

**Why it's parked despite that:** building real OTP delivery requires an
SMS provider relationship and integration — the same category of
external dependency as mobile money (Phase 3), not something to bolt on
casually. It shouldn't be rushed into the Access-flow rework happening
now just because that work touches login.

**What *is* being done now, specifically because of this pin:** the
login/tenant-resolution rework (see Access flow, below) is being
architected around a generic "identifier" concept rather than hardcoding
email throughout — so that when phone+OTP is eventually built, it's a new
identity-verification step slotted into an existing seam, not a
re-architecture of tenant resolution, session handling, or anything else
downstream of login.

**Trigger to revisit:** as soon as an SMS/OTP provider relationship is
viable (same conversation as mobile money providers, possibly the same
providers) — treat this as equally high-priority as Phase 3, not
something that waits for Phase 3 to finish first. They can move in
parallel once the provider groundwork exists for either.

---

## Phase 4 — Make Notifications Real (1 week)

Right now events are written but nothing's listening. This phase adds a
Worker consumer that turns events like `loan.issued`, `contribution.recorded`,
and `payment.due` into something a member actually sees or receives.

**Decision needed from you:** SMS is likely the most realistic channel for
your pilot cooperative — I'd want to research SMS gateway options that
actually work well in Lesotho specifically before committing to one. Email
and in-app notifications are simpler fallbacks to add alongside.

**Message framing matters here, not just delivery.** Given the loss-aversion
insight from your positioning work, a reminder like "Your group is counting
on your contribution — due Friday" will likely outperform "You have an
upcoming payment." Small copywriting decision, real behavioral lever — worth
getting right rather than defaulting to generic transactional-SMS language.

**Done when:** A test disbursement or contribution results in an actual
SMS/notification reaching a test phone/account.

---

## Phase 5 — Audit Log Visibility (2–3 days)

Small, but worth deciding deliberately rather than leaving implicit: do you
want a simple "Activity Log" screen for admins/auditors at pilot launch, or
is it fine to keep audit logs as a background safety net you can query
directly if a dispute ever comes up? Given you've added a real Auditor role,
a basic log viewer becomes more clearly worth building — that's literally
what the role is for. Leaning toward: build a simple version here, not defer
it.

---

## 📌 PINNED — Loan Operations vs. Loan Story (designed, not yet built)

A real architectural decision reached and locked in, deliberately paused
before implementation in favor of the frontend harmonization pass — worth
protecting from being lost under that work, not forgotten.

**The distinction, formalized:**
- **Operations** (exists today — the Loans list and detail pages) stays
  exactly as lean and task-oriented as it is. Not the place for a full
  history, metrics, or search.
- **Story** (not built) — a per-loan narrative view, reached from the
  operational detail page ("view full story"), not merged into it.
  Contains: a real chronological narrative synthesized from data that
  already exists across several tables (request → each pledge → each
  approval → disbursement → each repayment, "Lerato pledged M300 on 14
  July," not a raw log); the lag metric (disbursement to full repayment);
  live outstanding interest; risk status.
- **Report** (not built, later, separate) — scheme-level, filterable by
  date/member/status, professional-mode density. A genuinely different,
  smaller piece of work from Story — don't conflate the two when this
  gets picked back up.

**Why Story matters beyond UX polish:** it's the accountability mechanism
for "members are accountable to each other" — and it should respect the
scheme's existing `visibilityMode` (`FULL_TRANSPARENCY` / `RANKING`,
already in the data model since Phase 0, never yet connected to anything
user-facing). In a full-transparency scheme, another member seeing a
loan's full story *is* the point.

**One honesty dependency, not to be silently glossed over when this is
built:** a "next interest bracket" countdown on the Story view implies an
automatic monthly rate-escalation schedule that doesn't exist yet —
escalation today is a manual trigger only. Building Story means either
building the real scheduler alongside it, or labeling the figure
honestly ("next escalation, if triggered") rather than implying a
guarantee that isn't real.

**Trigger to revisit:** once the frontend harmonization pass (Access →
Setup → Dashboard, then the rest of the app) reaches a natural pause, or
sooner if pilot feedback specifically asks for it.

---

## Phase 6 — Product Reform for Real Users (3–4 weeks, can start alongside Phase 2–3)

This is the other big piece, and arguably the one that determines whether
the platform actually gets adopted. Two audiences, two different designs:

**Member view** — built for someone with no financial background:
- Plain language throughout — no "journal entry," "accrual," "posting
  period." Say what happened, not accounting terms for what happened.
- Lead with the answer, not the data: "You have M450 saved. Your next loan
  payment is M120, due 15 August." Not a table.
- Visual over textual wherever possible — progress bars, simple icons,
  large touch targets (mobile-first — assume this is used on a phone).
- Progressive disclosure — simple summary first, details available on tap,
  never forced on the user.
- Consider bilingual support (Sesotho + English) — worth a explicit decision
  from you on whether that's in scope for pilot or a fast-follow.

**Admin/Treasurer view** — can stay data-dense and "professional," since
this user *wants* the detail. The existing work here is a reasonable
starting point.

**Process note:** Before finalizing member-view designs, if at all possible,
show rough mockups to a few real people who match the persona — even 2–3
informal conversations with actual cooperative members will surface more
than any amount of us guessing. This matters more for this platform than
most, given the literacy/financial-jargon gap you flagged.

**Additions driven by your positioning work — these aren't cosmetic, they're
the product expression of the brand strategy:**

- **"Your group's story," not just "your account."** Member view should
  surface collective, fully transparent pooled-account activity alongside
  personal contribution history — this is the endowment-effect and
  belonging insight made literal in the UI, and it's now a confirmed
  requirement (full visibility), not just a nice-to-have.
- **Personal savings statement as a point of pride.** The `savings-statements`
  module already exists in the backend — worth treating its member-facing
  presentation as a real design target ("this is proof of what you've
  built"), not just a transaction export.
- **Both loss aversion and growth, together.** Show the streak/reliability
  angle *and* concrete growth or payout projections where relevant — you
  were right to flag that interest/growth remains a real motivator
  alongside the fear of letting the group down, not a replacement for it.
- **Reliability/streak signals — flag as a decision, not a default.** Same
  open question as before: private-only or group-visible. I'd still default
  to private-only unless you decide otherwise.
- **Sesotho-first, not bilingual-as-afterthought.** Given the "made a Mosotho
  grandmother nod in recognition" bar you set for the brand, language
  support for the member view should be treated as core scope for this
  phase, not a fast-follow.

**Done when:** A member with no financial background can, unprompted, tell
you their balance and next loan payment just by looking at the screen — *and*
can point to something on the screen that makes them feel proud to be part
of the group.

---

## 📌 PINNED — Member equity / share capital accounting (not scoped, needs real expertise)

**Genuinely different in kind from the other pins in this document** — the
others were parked for lack of time or a provider dependency; this one is
parked because it can't be responsibly scoped without real subject-matter
input, and shouldn't be guessed at.

**The gap, precisely:** every contribution a member makes is currently
modeled as a *liability* — money the cooperative owes back to them. That's
correct for a mutual savings society. It is **not** fully correct for a
formal, registered cooperative's *share capital*, which is conventionally
*equity* — an ownership stake, typically with different rules from ordinary
savings: dividends instead of interest, often not freely withdrawable,
governed by the applicable Cooperative Societies Act (or equivalent) rather
than just internal policy.

**Why this is explicitly flagged as needing outside input, not just
engineering time:** neither the founder nor Claude has the specialized
cooperative-accounting or regulatory background to define this correctly.
Guessing at the rules risks producing financial statements that are
confidently wrong for a real organization — a materially worse failure mode
than most product gaps, since it could mislead members, auditors, or
regulators rather than just being an unfinished feature.

**What would actually unblock this:** a conversation with an accountant or
auditor experienced in cooperative societies accounting in the target
jurisdiction (Lesotho, and likely worth checking how portable the answer is
beyond it), and a look at how the local Cooperative Societies Act (or
equivalent) actually requires share capital and member equity to be
reported. Possibly also worth a quick look at how existing SACCO/cooperative
accounting software elsewhere models this, as a sanity check rather than a
template to copy blind.

**Trigger to revisit:** as soon as that subject-matter conversation is
possible — this one shouldn't wait for a "phase" to come around on its own,
since the blocker is expertise, not sequencing.

---

## Phase 7 — Pilot Readiness (1–2 weeks)

- Onboard the real pilot cooperative's data (members, opening balances,
  role assignments, and its Approval Policy).
- Walk through the full flow yourself, end to end, as if you were the
  Treasurer *and* as if you were on the committee.
- Decide your support plan for the pilot — as a solo founder, how bugs
  reported during pilot get to you and how fast you can respond matters as
  much as the code itself.
- Define what "successful pilot" means in numbers before you start (e.g.,
  X% of members log in weekly, zero ledger discrepancies, Y loans processed
  cleanly, zero deposit-reconciliation mismatches) so you're not guessing
  afterward whether it worked.

---

## Phase 8 — Aggregate Insights (Post-Pilot, but worth flagging now)

Your positioning strategy leans on a specific mechanism: once enough groups
run on the platform, aggregate, anonymized numbers ("X groups, Y members,
M[amount] in collective activity, here's where the money goes") become a
public credibility asset and eventually political leverage — the "State of
Basotho Savings" report idea. With the platform now supporting multiple
group purposes (savings, community projects, church funds, crowdfunding),
this reporting could eventually segment by purpose too — a richer story than
savings alone.

This is explicitly **not** pilot-phase work — with one pilot cooperative,
"aggregate data" is just that one cooperative's data, and reporting it
publicly would be a trust violation, not a credibility win. It only makes
sense once there are enough independent groups that no single one is
identifiable in the aggregate.

**Why it's worth flagging now, not later:** the event-driven architecture
already in place (outbox → RabbitMQ) is precisely the mechanism that would
feed this later. The only thing worth doing *now*, cheaply, is making sure
event payloads are consistently structured as new features are built, so a
future analytics consumer doesn't need to reverse-engineer inconsistent
event shapes. No new work required this phase beyond discipline in Phase 2.

**Done when (post-pilot, multiple groups):** you can generate an aggregate
report across all tenants without ever exposing one group's data to
another — same tenant-isolation guarantee from Phase 1, applied to
reporting instead of live access.

---

## Immediate next step

Phase 0's persona doc needs a revision pass to reflect everything above —
rotating roles, the Auditor role, and approval-model-depends-on-group-type.
Want me to update it now, then move on to fleshing out the Approval Policy
and Outbound Request data model for Phase 2?
