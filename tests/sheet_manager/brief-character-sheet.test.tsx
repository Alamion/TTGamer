// @vitest-environment jsdom

import { BriefDocumentSheet } from '@site/src/sheet_manager/features/sheet/views/BriefDocumentSheet';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import {
    createDefaultStarWarsCharacterData,
    STAR_WARS_WOD_SYSTEM_ID,
} from '@site/src/sheet_manager/systems/star-wars-wod';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
} from '@site/src/sheet_manager/types/document';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function createCharacterEnvelope(): UnknownDocumentEnvelope {
    const data = createDefaultStarWarsCharacterData();
    return {
        id: 'brief-character-1',
        kind: DocumentKindSchema.parse('character'),
        systemId: STAR_WARS_WOD_SYSTEM_ID,
        definitionId: DocumentDefinitionIdSchema.parse('character'),
        schemaVersion: 1,
        metadata: {
            title: 'Test Character',
            tags: [],
            preferredViewId: DocumentViewIdSchema.parse('brief'),
        },
        templateValues: {},
        data: {
            ...data,
            customTalents: [{ id: 'custom-talent-1', label: 'Custom Talent', value: 2 }],
            customSkills: [{ id: 'custom-skill-1', label: 'Custom Skill', value: 3 }],
            customKnowledges: [{ id: 'custom-knowledge-1', label: 'Custom Knowledge', value: 1 }],
        },
    };
}

describe('BriefCharacterSheet', () => {
    beforeEach(() => {
        const document = createCharacterEnvelope();
        useDocumentStore.setState({
            documents: [document],
            currentDocumentId: document.id,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders without crashing and embeds custom traits in their ability groups', () => {
        render(createElement(BriefDocumentSheet));

        expect(screen.getByText('Custom Talent')).not.toBeNull();
        expect(screen.getByText('Custom Skill')).not.toBeNull();
        expect(screen.getByText('Custom Knowledge')).not.toBeNull();

        const talent = screen.getByText('Custom Talent');
        const talentsColumn = talent.closest('div.grid');
        expect(talentsColumn?.textContent).toContain('Alertness');
        expect(talentsColumn?.textContent).not.toContain('Strength');

        const skill = screen.getByText('Custom Skill');
        const skillsColumn = skill.closest('div.grid');
        expect(skillsColumn?.textContent).toContain('Blaster');

        const attributeColumn = screen.getByText('Strength').closest('div.grid');
        expect(attributeColumn?.textContent).not.toContain('Custom Talent');
    });

    it('updates a custom skill value through the brief rating control', () => {
        render(createElement(BriefDocumentSheet));

        const input = screen.getByLabelText('Custom Skill');
        fireEvent.change(input, { target: { value: '4' } });

        const document = useDocumentStore
            .getState()
            .documents.find(({ id }) => id === 'brief-character-1');
        expect(document?.data).toMatchObject({
            customSkills: [{ id: 'custom-skill-1', label: 'Custom Skill', value: 4 }],
        });
    });
});
