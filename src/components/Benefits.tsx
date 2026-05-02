import type { BudgetResult, Source } from '@/types';
import { theme as T, fonts } from '@/theme';
import { fmt } from '@/lib/format';
import { checkBenefit, type BenefitEligibility, type BenefitId, type BenefitInputs } from '@/lib/benefits';
import {
  CHIP_SOURCE, CHIP_STATE_THRESHOLDS_SOURCE, chipStateSource,
  MEDICAID_SOURCE, MEDICAID_EXPANSION_SOURCE, medicaidStateSource,
  SNAP_SOURCE, snapStateSource,
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
    blurb: 'Federal food assistance, scaled to household size and income. Loaded onto an EBT card monthly.',
    appliesTo: 'Reduces the grocery line.',
    source: SNAP_SOURCE,
    stateSource: inputs => snapStateSource(inputs.state),
  },
  {
    id: 'medicaid',
    name: 'Medicaid',
    blurb: 'Free or near-free health coverage for low-income households. Eligibility depends on whether your state expanded Medicaid under the ACA.',
    appliesTo: 'Zeros out the healthcare line.',
    source: [MEDICAID_SOURCE, MEDICAID_EXPANSION_SOURCE],
    stateSource: inputs => medicaidStateSource(inputs.state),
  },
  {
    id: 'chip',
    name: 'CHIP',
    blurb: 'Low-cost health coverage for children in families above the Medicaid limit. State-set income threshold, typically 200%–400% FPL.',
    appliesTo: "Reduces the kids' share of healthcare.",
    source: [CHIP_SOURCE, CHIP_STATE_THRESHOLDS_SOURCE],
    stateSource: inputs => chipStateSource(inputs.state),
  },
];

export interface BenefitsState {
  claimed: ReadonlySet<string>;
  toggle: (id: string) => void;
}

export function Benefits({
  result, claimed, toggle,
}: {
  result: BudgetResult;
  claimed: ReadonlySet<string>;
  toggle: (id: string) => void;
}) {
  // Reconstruct pre-benefit healthcare so eligibility checks can estimate
  // their value based on what the household *would* pay without coverage.
  const preBenefitHealthcare =
    result.expenses.Healthcare
    + (result.benefitsApplied['Medicaid'] ?? 0)
    + (result.benefitsApplied['CHIP'] ?? 0);

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
      <SectionTitle kicker={<>Benefits & safety net<Cite source={POVERTY_SOURCE} /></>}>
        Programs you may qualify for
      </SectionTitle>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16,
      }}>
        {BENEFIT_META.map(meta => {
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
        <div style={{
          marginTop: 14, padding: '12px 16px',
          background: T.bgAlt, border: `1px solid ${T.border}`,
          fontFamily: fonts.body, fontSize: 13, color: T.inkSoft,
        }}>
          Claimed benefits add{' '}
          <span style={{ fontFamily: fonts.mono, color: T.positive, fontWeight: 600 }}>
            {fmt(result.totalBenefits)}/mo
          </span>{' '}
          of relief, applied directly to the relevant expense lines below.
        </div>
      )}

      <div style={{
        marginTop: 12, fontSize: 12, color: T.inkMuted, fontFamily: fonts.body, lineHeight: 1.6,
      }}>
        Eligibility uses simplified federal rules. Real eligibility involves asset tests,
        immigration status, and state-specific variations not modeled here. Most programs are
        means-tested and shown as <em>not eligible</em> when household income is too high.
      </div>
    </div>
  );
}

function Card({ meta, sources, eligibility, claimed, onToggle }: {
  meta: BenefitMeta;
  sources: readonly Source[];
  eligibility: BenefitEligibility;
  claimed: boolean;
  onToggle: () => void;
}) {
  const eligible = eligibility.eligible;
  const handleClick = () => { if (eligible) onToggle(); };

  return (
    <div
      role="button"
      tabIndex={eligible ? 0 : -1}
      onClick={handleClick}
      onKeyDown={e => { if (eligible && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); } }}
      style={{
        padding: '16px 18px',
        background: claimed ? T.ink : T.surface,
        color: claimed ? T.bg : T.ink,
        border: `1px solid ${claimed ? T.ink : T.border}`,
        cursor: eligible ? 'pointer' : 'not-allowed',
        opacity: eligible ? 1 : 0.55,
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 4, gap: 8,
      }}>
        <div style={{
          fontFamily: fonts.display, fontSize: 18, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1.1,
        }}>
          <span>{meta.name}</span>
          <CiteGroup sources={sources} />
        </div>
        <EligibilityBadge eligible={eligible} claimed={claimed} />
      </div>

      <div style={{
        fontSize: 13, lineHeight: 1.5,
        color: claimed ? T.bgAlt : T.inkSoft,
        marginBottom: 8,
      }}>
        {meta.blurb}
      </div>

      {eligible ? (
        <>
          <div style={{
            fontFamily: fonts.mono, fontSize: 16, marginBottom: 4,
            color: claimed ? T.bg : T.positive, fontWeight: 600,
          }}>
            ~{fmt(eligibility.monthlyBenefit)}/mo
          </div>
          <div style={{
            fontSize: 11, color: claimed ? T.bgAlt : T.inkMuted,
          }}>
            {meta.appliesTo}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.5 }}>
          {eligibility.reason}
        </div>
      )}

      {eligibility.policyNote && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: `1px dashed ${claimed ? T.inkSoft : T.border}`,
          fontSize: 11, lineHeight: 1.5,
          color: claimed ? T.bgAlt : T.inkSoft,
          fontStyle: 'italic',
        }}>
          {eligibility.policyNote}
        </div>
      )}
    </div>
  );
}

function EligibilityBadge({ eligible, claimed }: { eligible: boolean; claimed: boolean }) {
  if (claimed) {
    return (
      <span style={{
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: T.bg, background: T.positive, padding: '2px 6px', borderRadius: 2,
        fontFamily: fonts.body, fontWeight: 700, whiteSpace: 'nowrap',
      }}>✓ Claimed</span>
    );
  }
  if (eligible) {
    return (
      <span style={{
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: T.positive, fontFamily: fonts.body, fontWeight: 700, whiteSpace: 'nowrap',
      }}>Eligible · Click to claim</span>
    );
  }
  return (
    <span style={{
      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: T.inkMuted, fontFamily: fonts.body, fontWeight: 600, whiteSpace: 'nowrap',
    }}>Not eligible</span>
  );
}
