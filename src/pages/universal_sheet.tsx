import '../css/set_tailwind_styles.css';

import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet';
import Layout from '@theme/Layout';

function App() {
    return (
        <Layout
            title={translate(uiMessages.site.sheetPage.pageTitle)}
            description={translate(uiMessages.site.sheetPage.pageDescription)}
        >
            <div id="character-sheet-root" className="tailwind-root">
                <CharacterSheet />
            </div>
        </Layout>
    );
}

export default App;
