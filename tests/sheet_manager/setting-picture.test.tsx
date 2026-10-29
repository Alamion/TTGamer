// @vitest-environment happy-dom
import { CreateForm } from '@site/src/sheet_manager/components/dialogs/library/CreateForm';
import {
    createSetting,
    renameItem,
} from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import { validateTypePayload } from '@site/src/sheet_manager/features/sheet/shell/typeFile';
import { UserSettingSchema } from '@site/src/sheet_manager/systems/userTypes';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { userSetting, userType } from './helpers/library';

/** A user setting's own picture: uploaded, cleaned, kept, removed (spec 046, US2). */

const SVG_NS = 'http://www.w3.org/2000/svg';
const picture = `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>`;
const withScript = `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" onload="alert(1)"><script>alert(2)</script><circle cx="12" cy="12" r="8"/></svg>`;

afterEach(cleanup);

function renderForm(initialPicture?: string) {
    const onSubmit = vi.fn();
    render(
        <CreateForm
            title="Edit"
            submitLabel="Save"
            withBadge
            initial={{ name: 'Ashen Realms', picture: initialPicture }}
            onSubmit={onSubmit}
            onCancel={() => {}}
        />
    );
    return onSubmit;
}

function upload(contents: string, name = 'mark.svg', type = 'image/svg+xml') {
    fireEvent.change(screen.getByLabelText('Upload picture'), {
        target: { files: [new File([contents], name, { type })] },
    });
}

const preview = () => document.querySelector<HTMLImageElement>('img[data-setting-picture]');

describe('the setting form', () => {
    it('uploads an SVG, previews it as an image, and saves the cleaned picture', async () => {
        const onSubmit = renderForm();
        upload(withScript);
        await waitFor(() => expect(preview()).not.toBeNull());
        expect(preview()!.getAttribute('alt')).toBe('');
        expect(preview()!.src.startsWith('data:image/svg+xml')).toBe(true);
        expect(
            screen.getByText(/Removed from the picture: scripts and event handlers/)
        ).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = onSubmit.mock.calls[0]![0].picture as string;
        expect(saved).toContain('<circle');
        expect(saved).not.toMatch(/script|onload/);
    });

    it('refuses a file that is not an SVG, keeping the previous picture', async () => {
        renderForm(picture);
        upload('\x89PNG', 'mark.png', 'image/png');
        expect((await screen.findByRole('alert')).textContent).toMatch(/not an SVG picture/);
        expect(preview()).not.toBeNull();
    });

    it('refuses a picture over the limit', async () => {
        renderForm();
        const long = `<svg xmlns="${SVG_NS}"><path d="M0 0${'l1 1'.repeat(3000)}"/></svg>`;
        upload(long);
        expect((await screen.findByRole('alert')).textContent).toMatch(/larger than 8 KB/);
        expect(preview()).toBeNull();
    });

    it('removes the picture', () => {
        const onSubmit = renderForm(picture);
        fireEvent.click(screen.getByRole('button', { name: 'Remove picture' }));
        expect(preview()).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSubmit.mock.calls[0]![0].picture).toBeUndefined();
    });
});

describe('a setting keeps its picture', () => {
    it('through creating and editing, and loses it when removed', () => {
        const created = createSetting('wod-v5', 'Ashen Realms', '', '', picture);
        expect(created.picture).toBe(picture);
        const node = {
            level: 'setting',
            ownership: 'user',
            ref: { kind: 'user', settingId: created.id },
        } as never;
        const state = { settings: { [created.id]: created } } as never;
        const kept = renameItem(node, 'Ashen', '', state, '', picture).saveSettings?.[0];
        expect(kept?.picture).toBe(picture);
        const removed = renameItem(node, 'Ashen', '', state, '', undefined).saveSettings?.[0];
        expect(removed).not.toHaveProperty('picture');
    });

    it('cleaned on every way in: a stored or imported setting carries no script', () => {
        const parsed = UserSettingSchema.parse(userSetting({ picture: withScript }));
        expect(parsed.picture).toContain('<circle');
        expect(parsed.picture).not.toMatch(/script|onload/);
        const broken = UserSettingSchema.parse(userSetting({ picture: '<html/>' }));
        expect(broken.picture).toBeUndefined();

        const typeFile = validateTypePayload({
            type: userType({ defaultTemplateId: undefined }),
            setting: userSetting({ picture: withScript }),
            templates: [],
        });
        expect(typeFile.ok).toBe(true);
        if (typeFile.ok) expect(typeFile.payload.setting?.picture).not.toMatch(/script/);
    });
});
