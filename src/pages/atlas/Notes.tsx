import type { Source } from '@/types';
import { FEDERAL_TAX_SOURCE, SS_WAGE_BASE_SOURCE } from '@/data/federalTax';
import { STATE_TAX_SOURCE, STATE_MIN_WAGE_SOURCE } from '@/data/states';
import { CITY_COL_SOURCES } from '@/data/cities';
import { PageSources } from '@/components/ui';

function buildFooterSources(stateSource?: Source): readonly Source[] {
  return [
    FEDERAL_TAX_SOURCE,
    SS_WAGE_BASE_SOURCE,
    STATE_TAX_SOURCE,
    ...(stateSource ? [stateSource] : []),
    STATE_MIN_WAGE_SOURCE,
    ...CITY_COL_SOURCES,
  ];
}

/**
 * Notes section — now just the page's source-list grounding. The
 * Caveats content used to live here but was promoted into the
 * MethodologyNote at the top of the page (above the Customize panel)
 * so first-time readers see the framing before they push knobs
 * rather than scrolling all the way to the bottom for it.
 */
export function Notes({ stateTaxSource }: { stateTaxSource?: Source }) {
  const footerSources = buildFooterSources(stateTaxSource);
  return <PageSources sources={footerSources} heading="Sources backing this calculation" />;
}
