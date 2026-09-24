import { translate } from '@docusaurus/Translate';

import type { RollResult } from '../dice-logic/types';
import { verdictText } from './verdictText';

const toastContainerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '2px 8px',
};

const notationStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 2,
    opacity: 0.9,
};

const totalStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 900,
    lineHeight: 1.2,
};

const outcomeStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 2,
};

export function RollToastContent({ result }: { result: RollResult }) {
    return (
        <div style={toastContainerStyle}>
            <div style={notationStyle}>{result.notation}</div>
            <div style={totalStyle}>= {result.total}</div>
            {result.verdict && <div style={outcomeStyle}>{verdictText(result.verdict)}</div>}
            {result.reading?.outcomes[0] && (
                <div style={outcomeStyle}>{translate(result.reading.outcomes[0].title)}</div>
            )}
        </div>
    );
}
