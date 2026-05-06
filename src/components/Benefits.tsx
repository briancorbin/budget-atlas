import { useEffect, useRef, useState } from 'react';
import type { BudgetResult, Source } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import {
  checkBenefit,
  type BenefitEligibility,
  type BenefitId,
  type BenefitInputs,
} from '@/lib/benefits';
import {
  CHIP_SOURCE,
  CHIP_STATE_THRESHOLDS_SOURCE,
  chipStateSource,
  MEDICAID_SOURCE,
  MEDICAID_EXPANSION_SOURCE,
  medicaidStateSource,
  SNAP_SOURCE,
  snapStateSource,
} from '@/data/benefits';
import { POVERTY_SOURCE } from '@/data/poverty';
import { Cite, CiteGroup, SectionTitle } from './ui';

interface BenefitMeta {
  id: BenefitId;
  name: string;
  /** One-sentence description of the program. */
  blurb: string;
  /** What the benefit reduces in the budget, in plain language. */
  appliesTo: string;
  /** Federal-level citation(s). Always shown. */
  source: Source | readonly Source[];
  /** Optional state-specific citation, computed at render time. */
  stateSource?: (inputs: BenefitInputs) => Source;
  /** Plain-language explanation of how this benefit's monthly dollar value
   *  is derived. Surfaced as a hover tooltip on the value display so the
   *  reader can see what's behind the number. */
  valueDerivation: string;
}

const BENEFIT_META: readonly BenefitMeta[] = [
  {
    id: 'snap',
    name: 'SNAP',
    blurb:
      'Federal food assistance, scaled to household size and income. Loaded onto an EBT card monthly.',
    appliesTo: 'Reduces the grocery line.',
    source: SNAP_SOURCE,
    stateSource: (inputs) => snapStateSource(inputs.state),
    valueDerivation:
      "USDA formula: max benefit for your household size (FY2026 schedule) minus 30% of estimated net income. Net income = gross − 20% earned-income deduction − the standard deduction. Real SNAP also subtracts shelter and childcare deductions; we don't model those yet.",
  },
  {
    id: 'medicaid',
    name: 'Medicaid',
    blurb:
      'Free or near-free health coverage for low-income households. Eligibility depends on whether your state expanded Medicaid under the ACA.',
    appliesTo: 'Zeros out the healthcare line.',
    source: [MEDICAID_SOURCE, MEDICAID_EXPANSION_SOURCE],
    stateSource: (inputs) => medicaidStateSource(inputs.state),
    valueDerivation:
      "Treats Medicaid as worth your full modeled monthly healthcare premium — sourced from KFF's Employer Health Benefits Survey (worker share of an employer-sponsored family or single plan). The model uses the same number for both 'value of public coverage' and 'post-cliff out-of-pocket cost,' so the cliff drop on Discretionary equals the cliff drop on Take-home + benefits. A more honest model would split these (Medicaid is genuinely better than typical employer coverage; ACA marketplace replacements typically cost more). On the roadmap.",
  },
  {
    id: 'chip',
    name: 'CHIP',
    blurb:
      'Low-cost health coverage for children in families above the Medicaid limit. State-set income threshold, typically 200%–400% FPL.',
    appliesTo: "Reduces the kids' share of healthcare.",
    source: [CHIP_SOURCE, CHIP_STATE_THRESHOLDS_SOURCE],
    stateSource: (inputs) => chipStateSource(inputs.state),
    valueDerivation:
      "The kids' marginal share of the family premium: family premium minus an adult-only baseline (single-coverage premium × number of adults). Both premiums sourced from KFF's Employer Health Benefits Survey. Real CHIP often charges small premiums above ~150% FPL; we treat coverage as fully replacing the kids' share for simplicity.",
  },
];

export interface BenefitsState {
  claimed: ReadonlySet<string>;
  toggle: (id: string) => void;
}

export function Benefits({
  result,
  claimed,
  toggle,
}: {
  result: BudgetResult;
  claimed: ReadonlySet<string>;
  toggle: (id: string) => void;
}) {
  // Reconstruct pre-benefit healthcare so eligibility checks can estimate
  // their value based on what the household *would* pay without coverage.
  const preBenefitHealthcare =
    result.expenses.Healthcare +
    (result.benefitsApplied['Medicaid'] ?? 0) +
    (result.benefitsApplied['CHIP'] ?? 0);

  const inputs: BenefitInputs = {
    grossIncome: result.grossIncome,
    householdSize: result.householdSize,
    state: result.cityData.state,
    adults: result.adults,
    kids: result.householdSize - result.adults,
    monthlyHealthcareCost: preBenefitHealthcare,
    monthlyHealthcareSingle: result.cityData.healthSingle,
  };

  const evaluate = (id: BenefitId): BenefitEligibility => checkBenefit(id, inputs);

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle
        kicker={
          <>
            Benefits & safety net
            <Cite source={POVERTY_SOURCE} />
          </>
        }
      >
        Programs you may qualify for
      </SectionTitle>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {BENEFIT_META.map((meta) => {
          const elig = evaluate(meta.id);
          const isClaimed = claimed.has(meta.id);
          const baseSources: readonly Source[] = Array.isArray(meta.source)
            ? meta.source
            : [meta.source as Source];
          const sources: readonly Source[] = meta.stateSource
            ? [...baseSources, meta.stateSource(inputs)]
            : baseSources;
          // Medicaid covers the entire household when claimed (including
          // kids), so CHIP claimed alongside it would add zero relief —
          // the budget code skips applying CHIP in that case (see budget.ts).
          // Surface that here so clicking CHIP doesn't look like a no-op.
          const overshadowedByMedicaid =
            meta.id === 'chip' && claimed.has('medicaid') && evaluate('medicaid').eligible;
          // When both Medicaid and CHIP are eligible, Medicaid is the
          // strictly better option (covers everyone, $0 cost, broader
          // benefits). Flag the Medicaid card so the user doesn't pick
          // CHIP-only by mistake.
          const recommendedOverChip =
            meta.id === 'medicaid' && elig.eligible && evaluate('chip').eligible;
          return (
            <Card
              key={meta.id}
              meta={meta}
              sources={sources}
              eligibility={elig}
              claimed={isClaimed}
              overshadowedByMedicaid={overshadowedByMedicaid}
              recommendedOverChip={recommendedOverChip}
              onToggle={() => toggle(meta.id)}
            />
          );
        })}
      </div>

      {result.totalBenefits > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 16px',
            background: T.bgAlt,
            border: `1px solid ${T.border}`,
            fontFamily: fonts.body,
            fontSize: rem(13),
            color: T.inkSoft,
          }}
        >
          Claimed benefits add{' '}
          <span style={{ fontFamily: fonts.mono, color: T.positive, fontWeight: 600 }}>
            {fmt(result.totalBenefits)}/mo
          </span>{' '}
          of relief, applied directly to the relevant expense lines below.
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          fontSize: rem(12),
          color: T.inkMuted,
          fontFamily: fonts.body,
          lineHeight: 1.6,
        }}
      >
        Eligibility uses simplified federal rules. Real eligibility involves asset tests,
        immigration status, and state-specific variations not modeled here. Most programs are
        means-tested and shown as <em>not eligible</em> when household income is too high.
      </div>
    </div>
  );
}

function Card({
  meta,
  sources,
  eligibility,
  claimed,
  overshadowedByMedicaid = false,
  recommendedOverChip = false,
  onToggle,
}: {
  meta: BenefitMeta;
  sources: readonly Source[];
  eligibility: BenefitEligibility;
  claimed: boolean;
  /** CHIP-only: true when Medicaid is claimed and eligible, in which case
   *  CHIP would add $0 (Medicaid covers kids too). The card surfaces the
   *  redundancy and disables the claim affordance. */
  overshadowedByMedicaid?: boolean;
  /** Medicaid-only: true when both Medicaid and CHIP are eligible, in
   *  which case Medicaid is the strictly better choice (covers everyone,
   *  zero out-of-pocket, broader benefits). Surfaces a small recommended
   *  badge so the user doesn't accidentally pick CHIP-only. */
  recommendedOverChip?: boolean;
  onToggle: () => void;
}) {
  const eligible = eligibility.eligible;
  // Categorically eligible (passes the program's income test) but the
  // calculated benefit is $0 — most often SNAP under a state's BBCE rule.
  // The household is on paper qualified for the program, yet receives no
  // actual aid. This is editorially important — surface it loudly.
  const phantomEligible = eligible && eligibility.monthlyBenefit === 0;
  // Clicking a phantom-eligible card to *claim* is a no-op (you'd be
  // claiming $0/mo) and we don't want to invite that. But if the user
  // previously claimed the program at a different income and then drifted
  // into the phantom zone, the auto-drop logic in BudgetExplorer won't
  // fire (eligibility is still true), so we must keep the unclaim path
  // open — otherwise the card gets stuck "claimed at $0" forever.
  const actionable =
    // Allow unclaim if the card was claimed before Medicaid took over,
    // so the user isn't stuck with a misleading "Claimed" badge.
    (overshadowedByMedicaid && claimed) ||
    (!overshadowedByMedicaid &&
      ((eligible && !phantomEligible) || (phantomEligible && claimed)));
  const handleClick = () => {
    if (actionable) onToggle();
  };

  // Burnt-orange warning palette, used for the phantom-eligible state.
  // Border + tinted background pull the card out of the row at a glance.
  const phantomBorderColor = T.warning;
  const phantomTint = 'rgba(184, 116, 43, 0.06)';

  return (
    <div
      role="button"
      tabIndex={actionable ? 0 : -1}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (actionable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        padding: '16px 18px',
        background: claimed ? T.ink : phantomEligible ? phantomTint : T.surface,
        color: claimed ? T.bg : T.ink,
        border: claimed
          ? `1px solid ${T.ink}`
          : phantomEligible
            ? `1.5px solid ${phantomBorderColor}`
            : `1px solid ${T.border}`,
        cursor: actionable ? 'pointer' : 'not-allowed',
        opacity: eligible ? 1 : 0.55,
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: rem(18),
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            lineHeight: 1.1,
          }}
        >
          <span>{meta.name}</span>
          <CiteGroup sources={sources} />
        </div>
        <EligibilityBadge eligible={eligible} claimed={claimed} phantomEligible={phantomEligible} />
      </div>

      {recommendedOverChip && !claimed && <BetterOptionBadge />}

      <div
        style={{
          fontSize: rem(13),
          lineHeight: 1.5,
          color: claimed ? T.bgAlt : T.inkSoft,
          marginBottom: 8,
        }}
      >
        {meta.blurb}
      </div>

      {overshadowedByMedicaid ? (
        <OvershadowedByMedicaidNote />
      ) : eligible && eligibility.monthlyBenefit > 0 ? (
        <>
          <ValueWithDerivation
            value={`~${fmt(eligibility.monthlyBenefit)}/mo`}
            derivation={meta.valueDerivation}
            claimed={claimed}
          />
          <div
            style={{
              fontSize: rem(11),
              color: claimed ? T.bgAlt : T.inkMuted,
            }}
          >
            {meta.appliesTo}
          </div>
        </>
      ) : phantomEligible ? (
        // Categorically eligible (passes the program's income test) but the
        // calculated benefit phases to $0 — most often SNAP under a state's
        // BBCE rule. The household is "on the rolls" yet receives no actual
        // aid. The badge already says "Eligible · $0"; here we surface the
        // editorial framing as a click-to-reveal popover so the card stays
        // compact, with a short tag visible by default.
        <PhantomEligibilityNote programName={meta.name} claimed={claimed} />
      ) : (
        <div style={{ fontSize: rem(12), color: T.inkMuted, lineHeight: 1.5 }}>
          {eligibility.reason}
        </div>
      )}

      {eligibility.policyNote && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px dashed ${claimed ? T.inkSoft : T.border}`,
            fontSize: rem(11),
            lineHeight: 1.5,
            color: claimed ? T.bgAlt : T.inkSoft,
            fontStyle: 'italic',
          }}
        >
          {eligibility.policyNote}
        </div>
      )}
    </div>
  );
}

function EligibilityBadge({
  eligible,
  claimed,
  phantomEligible,
}: {
  eligible: boolean;
  claimed: boolean;
  phantomEligible: boolean;
}) {
  if (claimed) {
    return (
      <span
        style={{
          fontSize: rem(10),
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: T.bg,
          background: T.positive,
          padding: '2px 6px',
          borderRadius: 2,
          fontFamily: fonts.body,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        ✓ Claimed
      </span>
    );
  }
  if (phantomEligible) {
    return (
      <span
        style={{
          fontSize: rem(10),
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: T.bg,
          background: T.warning,
          padding: '2px 6px',
          borderRadius: 2,
          fontFamily: fonts.body,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        Eligible · $0
      </span>
    );
  }
  if (eligible) {
    return (
      <span
        style={{
          fontSize: rem(10),
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: T.positive,
          fontFamily: fonts.body,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        Eligible · Click to claim
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: rem(10),
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: T.inkMuted,
        fontFamily: fonts.body,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      Not eligible
    </span>
  );
}

/**
 * Click-to-reveal explanation for the phantom-eligibility state. The
 * trigger reads "Phantom eligibility" with a dotted underline (matching
 * the citation-popover affordance pattern); clicking opens a small
 * floating panel beneath it with the editorial explanation. Click outside
 * or press Escape to dismiss. e.stopPropagation prevents the click from
 * bubbling to the card-level role=button handler.
 */
/** Renders the benefit's monthly dollar value with a hover/focus popover
 *  that explains how the number was derived (formula, source, simplifying
 *  assumptions). The value itself stays the same prominent mono number;
 *  the tooltip is opt-in for readers who want to know what's behind it. */
function ValueWithDerivation({
  value,
  derivation,
  claimed,
}: {
  value: string;
  derivation: string;
  claimed: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 4 }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? 'value-derivation' : undefined}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'help',
          fontFamily: fonts.mono,
          fontSize: rem(16),
          fontWeight: 600,
          color: claimed ? T.bg : T.positive,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: 4,
        }}
      >
        {value}
      </button>
      {open && (
        <div
          id="value-derivation"
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 5,
            width: 300,
            padding: '10px 12px',
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(27, 24, 21, 0.12)',
            fontFamily: fonts.body,
            fontSize: rem(12),
            lineHeight: 1.5,
            color: T.ink,
            fontStyle: 'normal',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: rem(10),
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: T.inkMuted,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            How this is computed
          </div>
          {derivation}
        </div>
      )}
    </div>
  );
}

/** Small green badge that appears on the Medicaid card when CHIP is also
 *  eligible. Hover/focus reveals a popover explaining WHY Medicaid is the
 *  better choice — covers the whole household at $0 cost with broader
 *  benefits, plus the practical UX note that claiming Medicaid will
 *  auto-drop CHIP. */
function BetterOptionBadge() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? 'better-option-popover' : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'inline-block',
          fontSize: rem(10),
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: T.positive,
          background: 'rgba(45, 80, 22, 0.1)',
          border: `1px solid ${T.positive}`,
          padding: '3px 8px',
          borderRadius: 2,
          fontWeight: 600,
          cursor: 'help',
          fontFamily: fonts.body,
        }}
      >
        ★ Better option than CHIP
      </button>
      {open && (
        <div
          id="better-option-popover"
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 5,
            width: 320,
            padding: '10px 12px',
            background: T.surface,
            border: `1px solid ${T.positive}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(27, 24, 21, 0.12)',
            fontFamily: fonts.body,
            fontSize: rem(12),
            lineHeight: 1.5,
            color: T.ink,
            fontStyle: 'normal',
            pointerEvents: 'none',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          <div
            style={{
              fontSize: rem(10),
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: T.inkMuted,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Why Medicaid over CHIP
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>
              <strong>Covers the whole household</strong> — adults and kids — instead of just
              the kids' share.
            </li>
            <li>
              <strong>Genuinely $0 cost.</strong> CHIP often charges small monthly premiums above
              ~150% FPL (varies by state); Medicaid does not.
            </li>
            <li>
              <strong>Broader benefits.</strong> Medicaid typically has $0 deductible, $0 copay,
              and includes dental/vision; CHIP varies more by state.
            </li>
          </ul>
          <div style={{ marginTop: 6, color: T.inkMuted, fontSize: rem(11) }}>
            Claiming Medicaid will automatically uncheck CHIP — the kids are covered either
            way.
          </div>
        </div>
      )}
    </div>
  );
}

/** CHIP-only: shown when Medicaid is claimed and the budget code skips
 *  applying CHIP (Medicaid covers the household — kids included). The
 *  visible label is short ("Covered by Medicaid · why?") with a dotted
 *  underline that opens a richer tooltip on hover/focus explaining the
 *  policy reality and what to do if the user wants CHIP's standalone
 *  value back. */
function OvershadowedByMedicaidNote() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? 'overshadow-popover' : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'help',
          fontFamily: fonts.body,
          fontSize: rem(12),
          color: T.inkMuted,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: 3,
          fontStyle: 'italic',
        }}
      >
        🔒 Covered by Medicaid · why?
      </button>
      {open && (
        <div
          id="overshadow-popover"
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 5,
            width: 320,
            padding: '10px 12px',
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(27, 24, 21, 0.12)',
            fontFamily: fonts.body,
            fontSize: rem(12),
            lineHeight: 1.5,
            color: T.ink,
            fontStyle: 'normal',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: rem(10),
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: T.inkMuted,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Why CHIP isn't claimable here
          </div>
          When a household qualifies for Medicaid, the kids are included in that coverage —
          they're enrolled in Medicaid, not CHIP. CHIP exists for kids in households that earn
          too much for Medicaid but not enough for affordable private insurance. Since this
          household is on Medicaid, CHIP would add zero relief. Unclaim Medicaid above if you
          want to see CHIP's standalone value at this income.
        </div>
      )}
    </div>
  );
}

function PhantomEligibilityNote({
  programName,
  claimed,
}: {
  programName: string;
  claimed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: fonts.body,
          fontSize: rem(12),
          fontWeight: 600,
          color: claimed ? T.bg : T.warning,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: 3,
          letterSpacing: '0.02em',
        }}
      >
        Phantom eligibility
      </button>
      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 5,
            width: 280,
            padding: '10px 12px',
            background: T.surface,
            border: `1px solid ${T.warning}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: rem(12),
            lineHeight: 1.5,
            color: T.ink,
            fontStyle: 'normal',
          }}
        >
          On paper this household qualifies for {programName} — but the calculated benefit phases to
          $0 once 30% of net income exceeds the maximum benefit. Eligibility without aid.
        </div>
      )}
    </div>
  );
}
