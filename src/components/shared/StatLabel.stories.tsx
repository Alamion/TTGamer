import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatLabel } from './StatLabel';

const meta: Meta<typeof StatLabel> = {
    title: 'Atomic/StatLabel',
    component: StatLabel,
    tags: ['autodocs'],
    argTypes: {
        required: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof StatLabel>;

export const Default: Story = {
    args: {
        label: 'Strength',
    },
};

export const WithTooltip: Story = {
    args: {
        label: 'Strength',
        tooltip: 'Physical power and muscle capability',
    },
};

export const Required: Story = {
    args: {
        label: 'Character Name',
        required: true,
    },
};

export const RequiredWithTooltip: Story = {
    args: {
        label: 'Intelligence',
        tooltip: 'Mental acuity and reasoning ability',
        required: true,
    },
};
