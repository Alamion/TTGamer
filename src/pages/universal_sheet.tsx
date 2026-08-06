import '../css/set_tailwind_styles.css';

import { CharacterSheet } from '@site/src/sheet_manager/features/sheet';
import Layout from '@theme/Layout';

function App() {
    return (
        <Layout title="Sheet Manager" description="Universal Character Sheet Manager">
            <div id="character-sheet-root" className="tailwind-root">
                <CharacterSheet />
            </div>
        </Layout>
    );
}

export default App;
