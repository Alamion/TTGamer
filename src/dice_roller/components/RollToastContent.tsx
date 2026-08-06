import type { RollResult } from '../dice-logic/types';

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

export function RollToastContent({ result }: { result: RollResult }) {
    return (
        <div style={toastContainerStyle}>
            <div style={notationStyle}>{result.notation}</div>
            <div style={totalStyle}>= {result.total}</div>
        </div>
    );
}
