import type { FilingStatus, Lifestyle, StateCode } from '@/types';
import { theme as T, fonts } from '@/theme';
import { fmt, fmtPct } from '@/lib/format';
import { CITIES, RENT_LOGIC_SOURCES, getCityData, stateSlug } from '@/data/cities';
import { STATES, bracketRange } from '@/data/states';
import { SCENARIOS } from '@/data/scenarios';
import { CiteGroup, SearchableSelect, SectionTitle, type SearchableOption } from './ui';

export interface InputsState {
  scenarioId: string;
  setScenarioId: (id: string) => void;
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
}

export function ScenarioPicker(s: InputsState) {
  const apply = (sc: typeof SCENARIOS[number]) => {
    s.setScenarioId(sc.id);
    s.setIncomeA(sc.income);
    s.setIncomeB(sc.incomeB || 0);
    s.setTwoIncome((sc.incomeB || 0) > 0);
    s.setFiling(sc.filing);
    s.setCity(sc.city);
    s.setKids(sc.kids);
    s.setLifestyle(sc.lifestyle);
  };

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionTitle kicker="Quick scenarios">Start with someone real</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {SCENARIOS.map(sc => {
          const total = sc.income + (sc.incomeB || 0);
          const active = s.scenarioId === sc.id;
          return (
            <button
              key={sc.id} onClick={() => apply(sc)}
              style={{
                textAlign: 'left', padding: '14px 16px',
                background: active ? T.ink : T.surface,
                color: active ? T.bg : T.ink,
                border: `1px solid ${active ? T.ink : T.border}`,
                fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.35,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{
                fontFamily: fonts.mono, fontSize: 13,
                color: active ? T.bgAlt : T.accent, marginBottom: 4,
              }}>
                {fmt(total)}
                {sc.incomeB && sc.incomeB > 0 && (
                  <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>
                    ({fmt(sc.income)} + {fmt(sc.incomeB)})
                  </span>
                )}
              </div>
              {sc.label}
            </button>
          );
        })}
      </div>
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
    .map(code => ({ value: code, label: STATES[code].name, hint: code }));

  // Locality picker options for the *currently selected state*: curated cities
  // first (sorted by tier+name), then the synthetic "Statewide average" entry.
  const tierRank: Record<string, number> = {
    'Very High': 0, 'High': 1, 'Moderate': 2, 'Lower': 3, 'Very Low': 4,
  };
  const curatedInState = Object.entries(CITIES)
    .filter(([, c]) => c.state === cityState)
    .sort(([, a], [, b]) => (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9) || a.name.localeCompare(b.name));
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
    width: '100%', padding: '10px 12px', fontFamily: fonts.mono,
    fontSize: 18, background: T.bg, border: `1px solid ${T.border}`,
    color: T.ink, outline: 'none', boxSizing: 'border-box' as const,
  };
  const selectStyle = {
    width: '100%', padding: '10px 12px', fontFamily: fonts.body,
    fontSize: 14, background: T.bg, border: `1px solid ${T.border}`,
    color: T.ink, outline: 'none',
  };
  const labelStyle = {
    fontSize: 12, color: T.inkSoft, display: 'block' as const,
    marginBottom: 6, letterSpacing: '0.05em',
  };

  return (
    <div style={{
      marginBottom: 40, padding: '24px 28px',
      background: T.surface, border: `1px solid ${T.border}`,
    }}>
      <div style={{
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: T.accent, fontWeight: 600, marginBottom: 18,
      }}>Customize</div>

      {/* Income row */}
      <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px dashed ${T.border}` }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10, flexWrap: 'wrap', gap: 8,
        }}>
          <label style={{ fontSize: 12, color: T.inkSoft, letterSpacing: '0.05em' }}>
            {s.twoIncome ? 'INCOME' : 'ANNUAL HOUSEHOLD INCOME'}
          </label>
          <button
            onClick={() => s.setTwoIncome(!s.twoIncome)}
            style={{
              fontSize: 11, letterSpacing: '0.08em', padding: '6px 12px',
              cursor: 'pointer', background: s.twoIncome ? T.bgAlt : T.bg,
              color: T.ink, border: `1px solid ${T.border}`, fontFamily: fonts.body,
            }}>
            {s.twoIncome ? '− SINGLE INCOME' : '+ ADD PARTNER / SPOUSE INCOME'}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: s.twoIncome ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
          gap: 20,
        }}>
          <div>
            {s.twoIncome && <label style={labelStyle}>PRIMARY · ANNUAL</label>}
            <input
              type="number" value={s.incomeA}
              onChange={e => s.setIncomeA(+e.target.value)}
              style={inputStyle}
            />
            <input
              type="range" min={0} max={750000} step={1000} value={s.incomeA}
              onChange={e => s.setIncomeA(+e.target.value)}
              style={{ width: '100%', marginTop: 8, accentColor: T.accent }}
            />
          </div>

          {s.twoIncome && (
            <div>
              <label style={labelStyle}>PARTNER · ANNUAL</label>
              <input
                type="number" value={s.incomeB}
                onChange={e => s.setIncomeB(+e.target.value)}
                style={inputStyle}
              />
              <input
                type="range" min={0} max={500000} step={1000} value={s.incomeB}
                onChange={e => s.setIncomeB(+e.target.value)}
                style={{ width: '100%', marginTop: 8, accentColor: T.accent }}
              />
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginTop: 12, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontSize: 11, color: T.inkMuted }}>
            State min wage at 40 hrs/wk = {fmt(stateMinAnnual)}
          </div>
          {s.twoIncome && (
            <div style={{ fontSize: 13, fontFamily: fonts.mono, color: T.ink }}>
              HOUSEHOLD TOTAL <span style={{ color: T.accent, marginLeft: 6 }}>{fmt(totalIncome)}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>LOCATION</label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 1fr) minmax(220px, 1.4fr)',
            gap: 8,
          }}>
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
          <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 6 }}>
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
                return <>3BR rent (family): {fmt(currentCity.rent3)}/mo<CiteGroup sources={RENT_LOGIC_SOURCES} /></>;
              }
              if (twoAdults) {
                return <>1BR rent (couple, +20%): {fmt(Math.round(currentCity.rent1 * 1.2))}/mo<CiteGroup sources={RENT_LOGIC_SOURCES} /></>;
              }
              return <>1BR rent: {fmt(currentCity.rent1)}/mo<CiteGroup sources={RENT_LOGIC_SOURCES} /></>;
            })()}
            {currentCity.kind === 'statewide' && (
              <span style={{ color: T.accent, marginLeft: 8 }}>· statewide approx.</span>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>FILING STATUS</label>
          <select value={s.filing} onChange={e => s.setFiling(e.target.value as FilingStatus)} style={selectStyle}>
            <option value="single">Single</option>
            <option value="married">Married, filing jointly</option>
            <option value="head">Head of household</option>
          </select>
          {s.twoIncome && s.filing !== 'married' && (
            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 6 }}>
              Cohabitating · each files separately
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>CHILDREN</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map(n => (
              <button
                key={n} onClick={() => s.setKids(n)}
                style={{
                  flex: 1, padding: '10px',
                  background: s.kids === n ? T.ink : T.bg,
                  color: s.kids === n ? T.bg : T.ink,
                  border: `1px solid ${s.kids === n ? T.ink : T.border}`,
                  fontFamily: fonts.mono, fontSize: 14, cursor: 'pointer',
                }}>
                {n}{n === 4 ? '+' : ''}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>LIFESTYLE LEVEL</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              ['modest', 'Modest'],
              ['moderate', 'Moderate'],
              ['comfortable', 'Comfortable'],
            ] as const).map(([v, l]) => (
              <button
                key={v} onClick={() => s.setLifestyle(v)}
                style={{
                  flex: 1, padding: '10px',
                  background: s.lifestyle === v ? T.ink : T.bg,
                  color: s.lifestyle === v ? T.bg : T.ink,
                  border: `1px solid ${s.lifestyle === v ? T.ink : T.border}`,
                  fontFamily: fonts.body, fontSize: 13, cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
