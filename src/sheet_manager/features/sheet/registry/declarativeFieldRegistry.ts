import type { ComponentType } from 'react';

import type { TemplateField } from '../../../types/template';
import {
    FormulaFieldControl,
    ImageFieldControl,
    NumberFieldControl,
    RatingFieldControl,
    ReferenceFieldControl,
    ResourceFieldControl,
    SelectFieldControl,
    type TemplateFieldControlProps,
    TextFieldControl,
    ToggleFieldControl,
} from '../declarative/fieldControls';

type FieldControl = ComponentType<TemplateFieldControlProps>;

/**
 * Declarative field type → control mapping (atoms: store-free, value + callbacks only).
 * Exhaustive by type: a new field type without a control fails typecheck.
 */
const registry: { [K in TemplateField['type']]: FieldControl } = {
    text: TextFieldControl,
    number: NumberFieldControl,
    toggle: ToggleFieldControl,
    select: SelectFieldControl,
    rating: RatingFieldControl,
    resource: ResourceFieldControl,
    reference: ReferenceFieldControl,
    image: ImageFieldControl,
    formula: FormulaFieldControl,
};

export function templateFieldControl(type: TemplateField['type']): FieldControl {
    return registry[type];
}
