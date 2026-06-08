import { vi } from 'vitest';

vi.mock('toastr', () => ({
    default: {
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));
