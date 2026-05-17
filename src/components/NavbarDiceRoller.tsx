export default function NavbarDiceRoller({ customProp }: { customProp?: string }) {
    return (
        <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => alert('Привет!')} className="button button--sm button--primary">
                {customProp || 'Кастомная кнопка'}
            </button>
        </div>
    );
}
// TODO: реализовать dice roller UI/UX
