import { useState } from 'react';
import type { BudgetResult, FilingStatus, TaxBracket } from '@/types';
import { theme as T, fonts } from '@/theme';
import { fmt, fmtPct } from '@/lib/format';
import { bracketBreakdown, type BracketRow } from '@/lib/tax';
import { FEDERAL_BRACKETS_2026, FEDERAL_TAX_SOURCE, STD_DEDUCTION_2026 } from '@/data/federalTax';
import { Cite, SectionTitle } from './ui';

interface FilerWalk {
  label: string;
  gross: number;
  stdDeduction: number;
  taxable: number;
  rows: BracketRow[];
  total: number;
}

const filingLabel: Record<FilingStatus, string> = {
  single: 'single',
  married: 'married, filing jointly',
  head: 'head of household',
};

function makeFilers(
  incomeA: number,
  incomeB: number,
  hasPartner: boolean,
  filing: FilingStatus,
  bracketsFor: (filing: FilingStatus) => readonly TaxBracket[],
  stdFor: (filing: FilingStatus) => number,
): FilerWalk[] {
  const filer = (
    label: string,
    gross: number,
    std: number,
    brackets: readonly TaxBracket[],
  ): FilerWalk => {
    const taxable = Math.max(0, gross - std);
    const rows = bracketBreakdown(taxable, brackets);
    return {
      label,
      gross,
      stdDeduction: std,
      taxable,
      rows,
      total: rows.reduce((s, r) => s + r.taxFromRow, 0),
    };
  };

  // MFJ — one combined return.
  if (filing === 'married') {
    return [
      filer(
        `Married, filing jointly · combined income`,
        incomeA + incomeB,
        stdFor('married'),
        bracketsFor('married'),
      ),
    ];
  }

  const cohabitating = hasPartner && incomeB > 0;
  if (cohabitating) {
    return [
      filer(
        `Primary (filing ${filingLabel[filing]})`,
        incomeA,
        stdFor(filing),
        bracketsFor(filing),
      ),
      filer(`Partner (filing single)`, incomeB, stdFor('single'), bracketsFor('single')),
    ];
  }

  return [filer(`Filing ${filingLabel[filing]}`, incomeA, stdFor(filing), bracketsFor(filing))];
}

export function BracketWalkthrough({
  result,
  incomeA,
  incomeB,
  hasPartner,
  filing,
}: {
  result: BudgetResult;
  incomeA: number;
  incomeB: number;
  hasPartner: boolean;
  filing: FilingStatus;
}) {
  const [open, setOpen] = useState(false);

  const stateData = result.stateData;
  const federalFilers = makeFilers(
    incomeA,
    incomeB,
    hasPartner,
    filing,
    (f) => FEDERAL_BRACKETS_2026[f],
    (f) => STD_DEDUCTION_2026[f],
  );
  const stateFilers = makeFilers(
    incomeA,
    incomeB,
    hasPartner,
    filing,
    (f) => stateData.brackets[f],
    (f) => stateData.stdDeduction[f],
  );

  const federalRawTotal = federalFilers.reduce((s, f) => s + f.total, 0);
  const stateTotal = stateFilers.reduce((s, f) => s + f.total, 0);
  const stateNoTax =
    stateTotal === 0 && stateFilers.every((f) => f.rows.every((r) => r.rate === 0));

  return (
    <div style={{ marginTop: 16, marginBottom: 32 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          padding: '10px 14px',
          background: open ? T.bgAlt : T.surface,
          border: `1px solid ${T.border}`,
          color: T.ink,
          fontWeight: 600,
        }}
      >
        {open ? '− Hide' : '+ View'} bracket walkthrough
      </button>

      {open && (
        <div
          style={{
            marginTop: 16,
            background: T.surface,
            border: `1px solid ${T.border}`,
            padding: '24px 24px 8px',
          }}
        >
          <SectionTitle
            kicker={
              <>
                Federal income tax
                <Cite source={FEDERAL_TAX_SOURCE} />
              </>
            }
          >
            How{' '}
            {federalRawTotal === 0
              ? 'no tax was assessed'
              : `${fmt(federalRawTotal)} in raw federal tax`}{' '}
            was calculated
          </SectionTitle>
          {federalFilers.map((f, i) => (
            <FilerSection key={i} filer={f} />
          ))}
          <CreditsSummary
            raw={federalRawTotal}
            ctc={result.ctc}
            eitc={result.eitc}
            net={result.federalTax}
          />

          <div style={{ height: 28 }} />

          <SectionTitle
            kicker={
              <>
                State income tax · {stateData.name}
                <Cite source={stateData.taxSource} />
              </>
            }
          >
            {stateNoTax
              ? `${stateData.name} has no state income tax`
              : `How ${fmt(stateTotal)} in state tax was calculated`}
          </SectionTitle>
          {!stateNoTax && stateFilers.map((f, i) => <FilerSection key={i} filer={f} />)}

          <div
            style={{
              marginTop: 4,
              paddingTop: 16,
              borderTop: `1px dashed ${T.border}`,
              fontSize: 12,
              color: T.inkMuted,
              fontFamily: fonts.body,
              lineHeight: 1.6,
            }}
          >
            Brackets show how progressive tax actually works: only the dollars within each bracket
            are taxed at that bracket's rate. Your marginal rate is the rate of the highest bracket
            you reach (highlighted) — not the rate applied to your whole income.
          </div>
        </div>
      )}
    </div>
  );
}

function FilerSection({ filer }: { filer: FilerWalk }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: T.inkSoft,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {filer.label}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 18,
          marginBottom: 12,
          fontSize: 13,
          fontFamily: fonts.body,
          color: T.inkSoft,
        }}
      >
        <span>
          Gross <span style={{ fontFamily: fonts.mono, color: T.ink }}>{fmt(filer.gross)}</span>
        </span>
        <span>
          − Std deduction{' '}
          <span style={{ fontFamily: fonts.mono, color: T.ink }}>{fmt(filer.stdDeduction)}</span>
        </span>
        <span>
          = Taxable{' '}
          <span style={{ fontFamily: fonts.mono, color: T.ink }}>{fmt(filer.taxable)}</span>
        </span>
      </div>

      <BracketTable rows={filer.rows} total={filer.total} />
    </div>
  );
}

function BracketTable({ rows, total }: { rows: BracketRow[]; total: number }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        fontFamily: fonts.mono,
        fontSize: 13,
        background: T.bg,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1.4fr 1.4fr',
          padding: '8px 12px',
          borderBottom: `1px solid ${T.border}`,
          fontSize: 11,
          color: T.inkMuted,
          letterSpacing: '0.08em',
          fontFamily: fonts.body,
          textTransform: 'uppercase',
        }}
      >
        <span>Bracket</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right' }}>Taxed in row</span>
        <span style={{ textAlign: 'right' }}>Tax from row</span>
      </div>

      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1.4fr 1.4fr',
            padding: '8px 12px',
            borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none',
            background: r.isUserBracket ? T.bgAlt : 'transparent',
            color: r.taxableInRow > 0 ? T.ink : T.inkMuted,
          }}
        >
          <span>
            {r.isUserBracket && (
              <span
                style={{
                  color: T.accent,
                  marginRight: 6,
                  fontFamily: fonts.body,
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                ▸ MARGINAL
              </span>
            )}
            {fmt(r.from)} – {r.to === Infinity ? '∞' : fmt(r.to)}
          </span>
          <span style={{ textAlign: 'right' }}>{fmtPct(r.rate)}</span>
          <span style={{ textAlign: 'right' }}>{fmt(r.taxableInRow)}</span>
          <span style={{ textAlign: 'right' }}>{fmt(r.taxFromRow)}</span>
        </div>
      ))}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1.4fr 1.4fr',
          padding: '10px 12px',
          borderTop: `2px solid ${T.ink}`,
          fontWeight: 600,
        }}
      >
        <span style={{ fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.08em' }}>
          SUBTOTAL
        </span>
        <span></span>
        <span></span>
        <span style={{ textAlign: 'right' }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

function CreditsSummary({
  raw,
  ctc,
  eitc,
  net,
}: {
  raw: number;
  ctc: number;
  eitc: number;
  net: number;
}) {
  if (ctc === 0 && eitc === 0) return null;
  return (
    <div
      style={{
        marginTop: 4,
        padding: '14px 16px',
        background: T.bg,
        border: `1px solid ${T.border}`,
        fontFamily: fonts.mono,
        fontSize: 13,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: fonts.body,
          color: T.inkMuted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Refundable credits
      </div>
      <Row label="Raw federal tax" value={fmt(raw)} />
      {ctc > 0 && <Row label="− Child Tax Credit" value={fmt(ctc)} positive />}
      {eitc > 0 && <Row label="− Earned Income Credit" value={fmt(eitc)} positive />}
      <div style={{ height: 6 }} />
      <Row
        label={net < 0 ? 'Net federal (refund)' : 'Net federal tax'}
        value={fmt(net)}
        bold
        accent={net < 0 ? T.positive : undefined}
      />
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  bold,
  accent,
}: {
  label: string;
  value: string;
  positive?: boolean;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '3px 0',
        borderTop: bold ? `1px solid ${T.border}` : 'none',
        paddingTop: bold ? 8 : 3,
      }}
    >
      <span
        style={{
          fontFamily: fonts.body,
          color: T.inkSoft,
          fontSize: 13,
          fontWeight: bold ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: accent || (positive ? T.positive : T.ink),
          fontWeight: bold ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}
