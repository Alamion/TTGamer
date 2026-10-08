import { describe, expect, it } from 'vitest';

import {
    fromWire,
    toSnakeCase,
    toWire,
    WIRE_MODELS,
} from '../../../src/integrations/cloud-api/wireNames';

const envelope = {
    id: '018bcfe5-6800-7abc-8def-0123456789ab',
    kind: 'character',
    systemId: 'wod-v5',
    definitionId: 'hunter',
    schemaVersion: 2,
    metadata: {
        title: 'Kyla',
        templateId: 'tpl-x',
        tags: ['pc'],
        settingId: 'user-setting-1a2b3c4d',
    },
    templateValues: { strengthBonus: 2, 'detail-key': 'x' },
    data: { someKey: { innerKey: 1 }, list: [{ camelCase: true }] },
};

describe('wire names (spec 030, FR-012)', () => {
    it('renames camelCase to snake_case', () => {
        expect(toSnakeCase('schemaVersion')).toBe('schema_version');
        expect(toSnakeCase('preferredViewId')).toBe('preferred_view_id');
        expect(toSnakeCase('id')).toBe('id');
    });

    it('sends contract fields in snake_case, nested models included', () => {
        const wire = toWire(WIRE_MODELS.DocumentEnvelope, envelope);
        expect(Object.keys(wire)).toEqual([
            'id',
            'kind',
            'system_id',
            'definition_id',
            'schema_version',
            'metadata',
            'template_values',
            'data',
        ]);
        expect(wire.metadata).toEqual({
            title: 'Kyla',
            template_id: 'tpl-x',
            tags: ['pc'],
            setting_id: 'user-setting-1a2b3c4d',
        });
    });

    it('never renames keys inside opaque content (SC-007)', () => {
        const wire = toWire(WIRE_MODELS.DocumentEnvelope, envelope);
        expect(wire.template_values).toEqual({ strengthBonus: 2, 'detail-key': 'x' });
        expect(wire.data).toEqual({ someKey: { innerKey: 1 }, list: [{ camelCase: true }] });
    });

    it('reads back an identical document', () => {
        const wire = JSON.parse(JSON.stringify(toWire(WIRE_MODELS.DocumentEnvelope, envelope)));
        expect(fromWire(WIRE_MODELS.DocumentEnvelope, wire)).toEqual(envelope);
    });

    it('leaves out fields the contract does not define and keeps absent fields absent', () => {
        const wire = toWire(WIRE_MODELS.DocumentEnvelope, { ...envelope, localOnly: 1 });
        expect(wire).not.toHaveProperty('localOnly');
        expect(wire).not.toHaveProperty('local_only');
        expect(wire.metadata).not.toHaveProperty('preferred_view_id');
    });
});
