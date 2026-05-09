import { theme, fonts, rem } from '../theme';
import { Link } from '../components/Link';

export function NotFoundPage() {
  return (
    <section style={{ padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: rem(48),
            margin: 0,
            color: theme.ink,
          }}
        >
          Not found
        </h1>
        <p
          style={{
            color: theme.inkSoft,
            marginTop: 12,
            fontSize: rem(16),
          }}
        >
          That page does not exist on Marginalia.
        </p>
        <p style={{ marginTop: 20 }}>
          <Link to="/">Back to the index →</Link>
        </p>
      </div>
    </section>
  );
}
