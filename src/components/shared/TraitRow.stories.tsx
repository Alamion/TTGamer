import type { Meta, StoryObj } from '@storybook/react-vite';
import { TraitRow } from './TraitRow';

const meta: Meta<typeof TraitRow> = {
    title: 'Atomic/TraitRow',
    component: TraitRow,
    tags: ['autodocs'],
    argTypes: {
        value: { control: { type: 'number', min: 0, max: 5 } },
        maxValue: { control: { type: 'number', min: 1, max: 10 } },
        disabled: { control: 'boolean' },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
    },
};

export default meta;
type Story = StoryObj<typeof TraitRow>;

export const Default: Story = {
    args: {
        label: 'Strength',
        value: 3,
    },
};

export const WithTooltip: Story = {
    args: {
        label: 'Dexterity',
        value: 2,
        tooltip: 'Agility and reflexes',
    },
};

export const Value0: Story = {
    args: {
        label: 'Constitution',
        value: 0,
    },
};

export const Value5: Story = {
    args: {
        label: 'Intelligence',
        value: 5,
    },
};

export const Disabled: Story = {
    args: {
        label: 'Wits',
        value: 3,
        disabled: true,
    },
};

export const MaxValue10: Story = {
    args: {
        label: 'Perception',
        value: 7,
        maxValue: 10,
    },
};

export const Interactive: Story = {
    args: {
        label: 'Charisma',
        value: 0,
        onChange: (val: number) => console.log('Changed to:', val),
    },
};

export const SmallSize: Story = {
    args: {
        label: 'Manipulation',
        value: 2,
        size: 'sm',
    },
};

export const LargeSize: Story = {
    args: {
        label: 'Appearance',
        value: 4,
        size: 'lg',
    },
};
