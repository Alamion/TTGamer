import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatDot } from './StatDot';

const meta: Meta<typeof StatDot> = {
  title: 'Atomic/StatDot',
  component: StatDot,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 5 } },
    maxValue: { control: { type: 'number', min: 1, max: 10 } },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof StatDot>;

export const Default: Story = {
  args: {
    value: 3,
    maxValue: 5,
  },
};

export const Value0: Story = {
  args: {
    value: 0,
    maxValue: 5,
  },
};

export const Value5: Story = {
  args: {
    value: 5,
    maxValue: 5,
  },
};

export const MaxValue10: Story = {
  args: {
    value: 7,
    maxValue: 10,
  },
};

export const Disabled: Story = {
  args: {
    value: 3,
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    value: 2,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    value: 4,
    size: 'lg',
  },
};

export const Interactive: Story = {
  args: {
    value: 0,
    onChange: (val: number) => console.log('Changed to:', val),
  },
  play: async ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll('button');
    if (buttons.length > 0) {
      buttons[2].click();
    }
  },
};
