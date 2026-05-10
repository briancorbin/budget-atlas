import { useEffect, useRef, useState } from 'react';
import type { FilingStatus, HousingTenure, Lifestyle, StateCode } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt, fmtPct } from '@/lib/format';
import { CITIES, RENT_LOGIC_SOURCES, getCityData, stateSlug } from '@/data/cities';
import { STATES, bracketRange } from '@/data/states';
import { SCENARIOS } from '@/data/scenarios';
import { CiteGroup, SearchableSelect, type SearchableOption } from '@/components/ui';

export interface InputsState {
  incomeA: number;
  setIncomeA: (n: number) => void;
  incomeB: number;
  setIncomeB: (n: number) => void;
  twoIncome: boolean;
  setTwoIncome: (b: boolean) => void;
  filing: FilingStatus;
  setFiling: (f: FilingStatus) => void;
  city: string;
  setCity: (id: string) => void;
  kids: number;
  setKids: (n: number) => void;
  lifestyle: Lifestyle;
  setLifestyle: (l: Lifestyle) => void;
  tenure: HousingTenure;
  setTenure: (t: HousingTenure) => void;
}

/**
 * Standalone scenario picker. Used inside CustomizePanel on desktop, and
 * (separately) hoisted to mobile as the only scenario-loading affordance
 * — the sticky chip on mobile omits scenarios to keep the bar compact, so
 * this picker fills that gap as a static, non-sticky element where the
 * full Customize panel would otherwise sit.
 */
export function ScenarioPicker(
  s: Pick<
    InputsState,
    | 'setIncomeA'
    | 'setIncomeB'
    | 'setTwoIncome'
    | 'setFiling'
    | 'setCity'
    | 'setKids'
    | 'setLifestyle'
    | 'setTenure'
  > & {
    className?: string;
    style?: React.CSSProperties;
    /** Eyebrow label shown above the picker. Defaults to the desktop
     *  copy ("OR LOAD AN EXAMPLE") which presupposes a Customize panel
     *  above it; standalone usages should pass their own. */
    label?: string;
    /** Optional one-line description shown below the label, before the
     *  picker. Useful when the picker stands alone (e.g. mobile). */
    description?: string;
  },
) {
  const scenarioOptions: SearchableOption<string>[] = SCENARIOS.map((sc) => {
    const total = sc.income + (sc.incomeB ?? 0);
    const totalK = '$' + Math.round(total / 1000) + 'K';
    return { value: sc.id, label: `${totalK} · ${sc.label}`, hint: sc.takeaway };
  });
  const applyScenarioById = (id: string) => {
    const sc = SCENARIOS.find((x) => x.id === id);
    if (!sc) return;
    s.setIncomeA(sc.income);
    s.setIncomeB(sc.incomeB ?? 0);
    s.setTwoIncome((sc.incomeB ?? 0) > 0);
    s.setFiling(sc.filing);
    s.setCity(sc.city);
    s.setKids(sc.kids);
    s.setLifestyle(sc.lifestyle);
    s.setTenure('renter');
  };
  return (
    <div className={s.className} style={s.style}>
      <label
        style={{
          fontSize: rem(12),
          color: T.inkSoft,
          display: 'block',
          marginBottom: s.description ? 4 : 6,
          letterSpacing: '0.05em',
        }}
      >
        {s.label ?? 'OR LOAD AN EXAMPLE'}
      </label>
      {s.description && (
        <p
          style={{
            fontSize: rem(13),
            color: T.inkSoft,
            lineHeight: 1.5,
            margin: '0 0 10px',
          }}
        >
          {s.description}
        </p>
      )}
      <SearchableSelect<string>
        value=""
        options={scenarioOptions}
        onChange={applyScenarioById}
        placeholder="Pick a real-feeling household to prefill these inputs…"
        ariaLabel="Load an example household"
      />
    </div>
  );
}

export function CustomizePanel(s: InputsState) {
  const totalIncome = s.incomeA + (s.twoIncome ? s.incomeB : 0);
  const currentCity = getCityData(s.city);
  const cityState = currentCity.state;
  const stateMinAnnual = STATES[cityState].min * 40 * 52;

  // State picker options — all 51, name-only.
  const stateOptions: SearchableOption<StateCode>[] = (Object.keys(STATES) as StateCode[])
    .sort((a, b) => STATES[a].name.localeCompare(STATES[b].name))
    .map((code) => ({ value: code, label: STATES[code].name, hint: code }));

  // Locality picker options for the *currently selected state*: curated cities
  // first (sorted by tier+name), then the synthetic "Statewide average" entry.
  const tierRank: Record<string, number> = {
    'Very High': 0,
    High: 1,
    Moderate: 2,
    Lower: 3,
    'Very Low': 4,
  };
  const curatedInState = Object.entries(CITIES)
    .filter(([, c]) => c.state === cityState)
    .sort(
      ([, a], [, b]) =>
        (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9) || a.name.localeCompare(b.name),
    );
  const localityOptions: SearchableOption<string>[] = [
    ...curatedInState.map(([id, c]) => ({ value: id, label: c.name, hint: c.tier })),
    { value: stateSlug(cityState), label: 'Statewide average', hint: 'approx.' },
  ];

  const onStateChange = (code: StateCode) => {
    // Auto-pick a sensible locality: first curated city in that state, else statewide.
    const firstCurated = Object.entries(CITIES).find(([, c]) => c.state === code);
    s.setCity(firstCurated ? firstCurated[0] : stateSlug(code));
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontFamily: fonts.mono,
    fontSize: rem(18),
    background: T.bg,
    border: `1px solid ${T.border}`,
    color: T.ink,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
  const labelStyle = {
    fontSize: rem(12),
    color: T.inkSoft,
    display: 'block' as const,
    marginBottom: 6,
    letterSpacing: '0.05em',
  };

  return (
    <div
      style={{
        marginBottom: 40,
        padding: '24px 28px',
        background: T.surface,
        border: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          fontSize: rem(11),
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 600,
          marginBottom: 18,
        }}
      >
        Customize
      </div>

      {/* Quick-load: pick a real-feeling household to prefill every input below.
          Stateless — picking applies the values and resets the dropdown so it
          never claims to reflect "current state" once the user starts tweaking. */}
      <ScenarioPicker
        {...s}
        style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px dashed ${T.border}` }}
      />

      {/* Income row */}
      <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px dashed ${T.border}` }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <label style={{ fontSize: rem(12), color: T.inkSoft, letterSpacing: '0.05em' }}>
            {s.twoIncome ? 'INCOME' : 'ANNUAL HOUSEHOLD INCOME'}
          </label>
          <button
            onClick={() => s.setTwoIncome(!s.twoIncome)}
            style={{
              fontSize: rem(11),
              letterSpacing: '0.08em',
              padding: '6px 12px',
              cursor: 'pointer',
              background: s.twoIncome ? T.bgAlt : T.bg,
              color: T.ink,
              border: `1px solid ${T.border}`,
              fontFamily: fonts.body,
            }}
          >
            {s.twoIncome ? '− SINGLE INCOME' : '+ ADD PARTNER / SPOUSE INCOME'}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: s.twoIncome ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
            gap: 20,
          }}
        >
          <div>
            {s.twoIncome && <label style={labelStyle}>PRIMARY · ANNUAL</label>}
            <input
              type="number"
              value={s.incomeA}
              onChange={(e) => s.setIncomeA(+e.target.value)}
              style={inputStyle}
            />
            <input
              type="range"
              min={0}
              max={750000}
              step={1000}
              value={s.incomeA}
              onChange={(e) => s.setIncomeA(+e.target.value)}
              style={{ width: '100%', marginTop: 8, accentColor: T.accent }}
            />
          </div>

          {s.twoIncome && (
            <div>
              <label style={labelStyle}>PARTNER · ANNUAL</label>
              <input
                type="number"
                value={s.incomeB}
                onChange={(e) => s.setIncomeB(+e.target.value)}
                style={inputStyle}
              />
              <input
                type="range"
                min={0}
                max={500000}
                step={1000}
                value={s.incomeB}
                onChange={(e) => s.setIncomeB(+e.target.value)}
                style={{ width: '100%', marginTop: 8, accentColor: T.accent }}
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: 12,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ fontSize: rem(11), color: T.inkMuted }}>
            State min wage at 40 hrs/wk = {fmt(stateMinAnnual)}
          </div>
          {s.twoIncome && (
            <div style={{ fontSize: rem(13), fontFamily: fonts.mono, color: T.ink }}>
              HOUSEHOLD TOTAL{' '}
              <span style={{ color: T.accent, marginLeft: 6 }}>{fmt(totalIncome)}</span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>LOCATION</label>
          <div
            style={{
              display: 'grid',
              // auto-fit so the two pickers sit side-by-side when there's room
              // (~360px+) and stack into a single column on narrow phones.
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 8,
            }}
          >
            <SearchableSelect<StateCode>
              value={cityState}
              options={stateOptions}
              onChange={onStateChange}
              placeholder="State"
              ariaLabel="State"
            />
            <SearchableSelect<string>
              value={s.city}
              options={localityOptions}
              onChange={s.setCity}
              placeholder="City or statewide"
              ariaLabel="City or statewide locality"
            />
          </div>
          <div style={{ fontSize: rem(11), color: T.inkMuted, marginTop: 6 }}>
            {(() => {
              const [lo, hi] = bracketRange(STATES[cityState].brackets[s.filing]);
              if (hi === 0) return 'No state income tax';
              if (lo === hi) return `State income tax: ${fmtPct(hi)} (flat)`;
              return `State income tax: ${fmtPct(lo)}–${fmtPct(hi)}`;
            })()}
            {' · '}
            {(() => {
              // Mirror the housing logic in lib/budget.ts so the displayed
              // figure matches what the model actually uses for this household:
              //   kids ≥ 1            → 3BR family rent
              //   2 adults, no kids   → 1BR + 20% (a small 2BR or roomier 1BR)
              //   solo, no kids       → 1BR
              // Adults is driven by the partner toggle, not filing status.
              const twoAdults = s.twoIncome;
              if (s.kids >= 1) {
                return (
                  <>
                    3BR rent (family): {fmt(currentCity.rent3)}/mo
                    <CiteGroup sources={RENT_LOGIC_SOURCES} />
                  </>
                );
              }
              if (twoAdults) {
                return (
                  <>
                    1BR rent (couple, +20%): {fmt(Math.round(currentCity.rent1 * 1.2))}/mo
                    <CiteGroup sources={RENT_LOGIC_SOURCES} />
                  </>
                );
              }
              return (
                <>
                  1BR rent: {fmt(currentCity.rent1)}/mo
                  <CiteGroup sources={RENT_LOGIC_SOURCES} />
                </>
              );
            })()}
            {currentCity.kind === 'statewide' && (
              <span style={{ color: T.accent, marginLeft: 8 }}>· statewide approx.</span>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>FILING STATUS</label>
          <SearchableSelect<FilingStatus>
            value={s.filing}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married, filing jointly', hint: 'MFJ' },
              { value: 'head', label: 'Head of household', hint: 'HoH' },
            ]}
            onChange={s.setFiling}
            placeholder="Filing status"
            ariaLabel="Filing status"
          />
          {s.twoIncome && s.filing !== 'married' && (
            <div style={{ fontSize: rem(11), color: T.inkMuted, marginTop: 6 }}>
              Cohabitating · each files separately
            </div>
          )}
        </div>

        {/* HOUSING TENURE picker is intentionally hidden in v1.
            The full wiring (tenure axis on `BudgetInput`, gating on owner-
            only leaves, three-way mode in `expenseModelNotes`, share-link
            round-trip) is in place and tested — but the owner-only leaves
            (Mortgage P&I, Property tax, Homeowners insurance, Maintenance & repairs)
            are still $0 placeholders pending the actual mortgage math
            (roadmap #13). Exposing the picker today would let users flip
            into a mode where their housing line drops to $0 with nothing
            useful to show — confusing.

            When #13 lands and the owner leaves carry real values, re-add
            the picker here. The setTenure prop stays on InputsState so
            the wiring is reachable; it's just not user-flipped right now. */}

        <div>
          <label style={labelStyle}>CHILDREN</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => s.setKids(n)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: s.kids === n ? T.ink : T.bg,
                  color: s.kids === n ? T.bg : T.ink,
                  border: `1px solid ${s.kids === n ? T.ink : T.border}`,
                  fontFamily: fonts.mono,
                  fontSize: rem(14),
                  cursor: 'pointer',
                }}
              >
                {n}
                {n === 4 ? '+' : ''}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>LIFESTYLE LEVEL</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(
              [
                ['modest', 'Modest'],
                ['moderate', 'Moderate'],
                ['comfortable', 'Comfortable'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => s.setLifestyle(v)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: s.lifestyle === v ? T.ink : T.bg,
                  color: s.lifestyle === v ? T.bg : T.ink,
                  border: `1px solid ${s.lifestyle === v ? T.ink : T.border}`,
                  fontFamily: fonts.body,
                  fontSize: rem(13),
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact sticky variant of CustomizePanel — shown after the full panel scrolls
 * offscreen so users can keep tweaking inputs without scrolling back to the top.
 *
 * Deliberately omits: the "Load an example" scenario picker, the income range
 * slider, the state-min-wage tag, the housing-tenure picker (already hidden in
 * v1), and the rent/state-tax detail line under Location. The partner toggle
 * is preserved as a compact +/- icon since dual-earner is a primary axis of
 * the model.
 */
export function CustomizeStickyBar(s: InputsState & { visible: boolean }) {
  const currentCity = getCityData(s.city);
  const cityState = currentCity.state;
  // Mobile collapse state. Defaults closed because the full bar wraps to
  // 4-5 input rows on a phone — covering meaningful page content. The
  // collapsed row shows the user's current configuration as a summary
  // chip; tapping it expands to the full controls. Desktop ignores this
  // state entirely (CSS shows the controls regardless).
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  // Auto-collapse on click-outside and scroll-start. The bar should feel
  // ephemeral: tap to edit, then get out of the way. SearchableSelect
  // dropdowns render outside the bar via portals/absolute positioning,
  // so check both the bar itself and any open listbox before collapsing.
  useEffect(() => {
    if (!mobileExpanded) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (barRef.current?.contains(target)) return;
      // Don't collapse if the click landed inside an open dropdown listbox
      // — those render in-flow inside the bar's tree, but native <option>
      // clicks on iOS sometimes bubble through document before React's
      // synthetic event handlers run. role=listbox is our convention.
      if (target instanceof Element && target.closest('[role="listbox"]')) return;
      setMobileExpanded(false);
    };
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      // Don't collapse if the user is actively interacting with a control
      // inside the bar — focusing an input on iOS opens the keyboard,
      // which resizes the visual viewport and fires a synthetic scroll
      // event that would otherwise misfire as "user scrolled the page."
      if (
        document.activeElement instanceof Node &&
        barRef.current?.contains(document.activeElement)
      ) {
        lastScrollY = window.scrollY;
        return;
      }
      // 4px threshold ignores iOS momentum/bounce jiggle.
      if (Math.abs(window.scrollY - lastScrollY) > 4) setMobileExpanded(false);
      lastScrollY = window.scrollY;
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
      window.removeEventListener('scroll', onScroll);
    };
  }, [mobileExpanded]);
  const totalIncome = s.incomeA + (s.twoIncome ? s.incomeB : 0);
  // Compact $-with-K formatting for the chip — keeps the line short enough
  // to fit a 360px viewport without truncation. $40,000 → $40K, $1,200,000
  // → $1.2M.
  const fmtCompactIncome = (n: number): string => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n}`;
  };
  const kidsLabel =
    s.kids === 0 ? 'no kids' : `${s.kids === 4 ? '4+' : s.kids} ${s.kids === 1 ? 'kid' : 'kids'}`;
  // Three fields: income, city, kids. Filing and lifestyle are visible
  // (and editable) on expand, but they're secondary at a glance — a
  // user identifying "which scenario am I looking at?" reads income +
  // place + family first.
  const summaryFields = [fmtCompactIncome(totalIncome), currentCity.name, kidsLabel];

  const stateOptions: SearchableOption<StateCode>[] = (Object.keys(STATES) as StateCode[])
    .sort((a, b) => STATES[a].name.localeCompare(STATES[b].name))
    .map((code) => ({ value: code, label: STATES[code].name, hint: code }));

  const tierRank: Record<string, number> = {
    'Very High': 0,
    High: 1,
    Moderate: 2,
    Lower: 3,
    'Very Low': 4,
  };
  const curatedInState = Object.entries(CITIES)
    .filter(([, c]) => c.state === cityState)
    .sort(
      ([, a], [, b]) =>
        (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9) || a.name.localeCompare(b.name),
    );
  const localityOptions: SearchableOption<string>[] = [
    ...curatedInState.map(([id, c]) => ({ value: id, label: c.name, hint: c.tier })),
    { value: stateSlug(cityState), label: 'Statewide average', hint: 'approx.' },
  ];

  const onStateChange = (code: StateCode) => {
    const firstCurated = Object.entries(CITIES).find(([, c]) => c.state === code);
    s.setCity(firstCurated ? firstCurated[0] : stateSlug(code));
  };

  const compactInput = {
    width: '100%',
    padding: '6px 8px',
    fontFamily: fonts.mono,
    fontSize: rem(13),
    background: T.bg,
    border: `1px solid ${T.border}`,
    color: T.ink,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
  const compactLabel = {
    fontSize: rem(9),
    color: T.inkSoft,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    display: 'block' as const,
    marginBottom: 3,
  };

  return (
    <div
      ref={barRef}
      className="customize-sticky-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        boxShadow: T.shadows.sm,
        padding: '8px 16px',
        transform: s.visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 180ms ease-out',
        pointerEvents: s.visible ? 'auto' : 'none',
      }}
      aria-hidden={!s.visible}
      // `inert` removes the entire subtree from the focus order and the
      // a11y tree when the bar is hidden. Without this, keyboard users
      // would tab into invisible inputs/buttons even though the bar is
      // off-screen via the translateY transform.
      {...({ inert: !s.visible ? '' : undefined } as Record<string, unknown>)}
    >
      {/* Below 720px the bar starts collapsed (just a summary chip with the
          current config); the user taps to expand the full controls. The
          full bar wrapping to 4-5 rows by default obscured content; the
          chip is small enough to live on screen full-time. */}
      <style>{`
        .sticky-summary { display: none; }
        @media (max-width: 720px) {
          .sticky-summary { display: flex; }
          /* Animate max-height + opacity instead of toggling display so
             expand/collapse feels like a panel rather than a pop. The bar
             is position: fixed so growing/shrinking doesn't push page
             content. max-height is generous (no JS measurement) — the
             actual content's natural height settles below this ceiling. */
          .sticky-controls {
            max-height: 720px;
            opacity: 1;
            overflow: hidden;
            transition:
              max-height 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
              opacity 200ms ease-out;
          }
          .sticky-controls[data-mobile-open="false"] {
            max-height: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
            margin-top: 0 !important;
          }
          /* Uniform tap-target height for every interactive control in
             the bar — inputs, selects, and buttons all sit at 44px on
             mobile (Apple's tap-target floor). Without the floor on
             inputs, iOS gives them an intrinsic height that flex
             align-items:stretch doesn't fully override, leaving the
             partner +/− button visibly shorter than the income field. */
          .sticky-controls button,
          .sticky-controls input,
          .sticky-controls select { min-height: 44px; box-sizing: border-box; }
          .sticky-controls button { font-size: 14px !important; }
        }
      `}</style>
      <button
        type="button"
        className="sticky-summary"
        onClick={() => setMobileExpanded((v) => !v)}
        aria-expanded={mobileExpanded}
        aria-controls="sticky-controls"
        style={{
          width: '100%',
          maxWidth: 1240,
          margin: '0 auto',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          padding: '4px 2px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: T.ink,
          fontFamily: fonts.body,
          fontSize: rem(13),
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 8,
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontWeight: 600,
              color: T.accent,
              letterSpacing: '0.01em',
            }}
          >
            {summaryFields[0]}
          </span>
          <span aria-hidden style={{ color: T.border }}>
            ·
          </span>
          <span style={{ color: T.ink }}>{summaryFields[1]}</span>
          <span aria-hidden style={{ color: T.border }}>
            ·
          </span>
          <span style={{ color: T.inkSoft }}>{summaryFields[2]}</span>
        </span>
        <span
          aria-hidden
          style={{
            flex: '0 0 auto',
            color: T.accent,
            fontSize: rem(10),
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {mobileExpanded ? 'Close' : 'Customize'}
          <span style={{ fontSize: rem(9) }}>{mobileExpanded ? '▴' : '▾'}</span>
        </span>
      </button>
      <div
        id="sticky-controls"
        className="sticky-controls"
        data-mobile-open={mobileExpanded ? 'true' : 'false'}
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '0 0 auto' }}>
          <label style={compactLabel}>Income</label>
          {/* alignItems: stretch — the global mobile font-size: 16px on
              inputs makes them grow taller than the partner-toggle
              button's fixed height; stretching vertically keeps the
              button height matched to the input on phones without
              hardcoding two heights. */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
            <input
              type="number"
              value={s.incomeA}
              onChange={(e) => s.setIncomeA(+e.target.value)}
              style={{ ...compactInput, width: 110 }}
              aria-label={s.twoIncome ? 'Primary income' : 'Annual household income'}
            />
            {s.twoIncome && (
              <input
                type="number"
                value={s.incomeB}
                onChange={(e) => s.setIncomeB(+e.target.value)}
                style={{ ...compactInput, width: 110 }}
                aria-label="Partner income"
              />
            )}
            <button
              onClick={() => s.setTwoIncome(!s.twoIncome)}
              title={s.twoIncome ? 'Remove partner income' : 'Add partner income'}
              aria-label={s.twoIncome ? 'Remove partner income' : 'Add partner income'}
              style={{
                width: 32,
                cursor: 'pointer',
                background: s.twoIncome ? T.bgAlt : T.bg,
                color: T.ink,
                border: `1px solid ${T.border}`,
                fontFamily: fonts.mono,
                fontSize: rem(14),
                lineHeight: 1,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {s.twoIncome ? '−' : '+'}
            </button>
          </div>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 220 }}>
          <label style={compactLabel}>Location</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <SearchableSelect<StateCode>
              value={cityState}
              options={stateOptions}
              onChange={onStateChange}
              placeholder="State"
              ariaLabel="State"
              compact
            />
            <SearchableSelect<string>
              value={s.city}
              options={localityOptions}
              onChange={s.setCity}
              placeholder="City"
              ariaLabel="City or statewide locality"
              compact
            />
          </div>
        </div>

        <div style={{ flex: '0 1 180px', minWidth: 160 }}>
          <label style={compactLabel}>Filing</label>
          <SearchableSelect<FilingStatus>
            value={s.filing}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married filing jointly', hint: 'MFJ' },
              { value: 'head', label: 'Head of household', hint: 'HoH' },
            ]}
            onChange={s.setFiling}
            placeholder="Filing status"
            ariaLabel="Filing status"
            compact
          />
        </div>

        <div style={{ flex: '0 0 auto' }} role="radiogroup" aria-label="Number of kids">
          <label style={compactLabel}>Kids</label>
          <div style={{ display: 'flex', gap: 2 }}>
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => s.setKids(n)}
                style={{
                  width: 28,
                  padding: '6px 0',
                  background: s.kids === n ? T.ink : T.bg,
                  color: s.kids === n ? T.bg : T.ink,
                  border: `1px solid ${s.kids === n ? T.ink : T.border}`,
                  fontFamily: fonts.mono,
                  fontSize: rem(12),
                  cursor: 'pointer',
                }}
                role="radio"
                aria-checked={s.kids === n}
                aria-label={`${n}${n === 4 ? '+' : ''} children`}
              >
                {n}
                {n === 4 ? '+' : ''}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: '0 0 auto' }} role="radiogroup" aria-label="Lifestyle level">
          <label style={compactLabel}>Lifestyle</label>
          <div style={{ display: 'flex', gap: 2 }}>
            {(
              [
                ['modest', 'Modest'],
                ['moderate', 'Moderate'],
                ['comfortable', 'Comfortable'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => s.setLifestyle(v)}
                style={{
                  padding: '6px 10px',
                  background: s.lifestyle === v ? T.ink : T.bg,
                  color: s.lifestyle === v ? T.bg : T.ink,
                  border: `1px solid ${s.lifestyle === v ? T.ink : T.border}`,
                  fontFamily: fonts.body,
                  fontSize: rem(12),
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
                role="radio"
                aria-checked={s.lifestyle === v}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
