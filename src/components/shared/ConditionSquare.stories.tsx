import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConditionSquare, ConditionTrack, type ConditionMark } from './ConditionSquare';

const meta: Meta<typeof ConditionSquare> = {
  title: 'Atomic/ConditionSquare',
  component: ConditionSquare,
  tags: ['autodocs'],
  argTypes: {
    mark: { control: 'select', options: ['empty', 'slash', 'cross', 'filled'] },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof ConditionSquare>;

export const Empty: Story = {
  args: {
    mark: 'empty',
  },
};

export const Slash: Story = {
  args: {
    mark: 'slash',
  },
};

export const Cross: Story = {
  args: {
    mark: 'cross',
  },
};

export const Filled: Story = {
  args: {
    mark: 'filled',
  },
};

export const Disabled: Story = {
  args: {
    mark: 'cross',
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    mark: 'slash',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    mark: 'cross',
    size: 'lg',
  },
};

export const Interactive: Story = {
  args: {
    mark: 'empty',
    onClick: () => console.log('Clicked!'),
  },
};

const trackMeta: Meta<typeof ConditionTrack> = {
  title: 'Atomic/ConditionTrack',
  component: ConditionTrack,
  tags: ['autodocs'],
};

export { trackMeta as meta };
type TrackStory = StoryObj<typeof ConditionTrack>;

export const TrackDefault: TrackStory = {
  args: {
    states: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    labels: ['Healthy', 'Bruised', 'Injured', 'Wounded', 'Crippled', 'Incapacitated', 'Dead'],
  },
};

export const TrackWithDamage: TrackStory = {
  args: {
    states: ['filled', 'filled', 'slash', 'slash', 'empty', 'empty', 'empty'],
    labels: ['Healthy', 'Bruised', 'Injured', 'Wounded', 'Crippled', 'Incapacitated', 'Dead'],
  },
};

export const TrackInteractive: TrackStory = {
  args: {
    states: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    onChange: (index: number, mark: ConditionMark) => console.log(`Index ${index}: ${mark}`),
  },
};

export const TrackSmall: TrackStory = {
  args: {
    states: ['filled', 'slash', 'cross', 'empty', 'empty', 'empty', 'empty'],
    size: 'sm',
  },
};

export const TrackDisabled: TrackStory = {
  args: {
    states: ['filled', 'cross', 'slash', 'empty', 'empty', 'empty', 'empty'],
    disabled: true,
  },
};
