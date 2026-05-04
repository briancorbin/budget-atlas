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
  },
  {
    id: 'medicaid',
    name: 'Medicaid',
    blurb:
      'Free or near-free health coverage for low-income households. Eligibility depends on whether your state expanded Medicaid under the ACA.',
    appliesTo: 'Zeros out the healthcare line.',
    source: [MEDICAID_SOURCE, MEDICAID_EXPANSION_SOURCE],
    stateSource: (inputs) => medicaidStateSource(inputs.state),
  },
  {
    id: 'chip',
    name: 'CHIP',
    blurb:
      'Low-cost health coverage for children in families above the Medicaid limit. State-set income threshold, typically 200%–400% FPL.',
    appliesTo: "Reduces the kids' share of healthcare.",
    source: [CHIP_SOURCE, CHIP_STATE_THRESHOLDS_SOURCE],
    stateSource: (inputs) => chipStateSource(inputs.state),
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
          return (
            <Card
              key={meta.id}
              meta={meta}
              sources={sources}
              eligibility={elig}
              claimed={isClaimed}
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
  onToggle,
}: {
  meta: BenefitMeta;
  sources: readonly Source[];
  eligibility: BenefitEligibility;
  claimed: boolean;
  onToggle: () => void;
}) {
  const eligible = eligibility.eligible;
  // Categorically eligible (passes the program's income test) but the
  // calculated benefit is $0 — most often SNAP under a state's BBCE rule.
  // The household is on paper qualified for the program, yet receives no
  // actual aid. This is editorially important — surface it loudly.
  const phantomEligible = eligible && eligibility.monthlyBenefit === 0;
  const actionable = eligible && !phantomEligible;
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
        background: claimed
          ? T.ink
          : phantomEligible
            ? phantomTint
            : T.surface,
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
        <EligibilityBadge
          eligible={eligible}
          claimed={claimed}
          phantomEligible={phantomEligible}
        />
      </div>

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

      {eligible && eligibility.monthlyBenefit > 0 ? (
        <>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: rem(16),
              marginBottom: 4,
              color: claimed ? T.bg : T.positive,
              fontWeight: 600,
            }}
          >
            ~{fmt(eligibility.monthlyBenefit)}/mo
          </div>
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
          On paper this household qualifies for {programName} — but the
          calculated benefit phases to $0 once 30% of net income exceeds
          the maximum benefit. Eligibility without aid.
        </div>
      )}
    </div>
  );
}
