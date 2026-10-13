import { z } from 'zod';

const nonNegativeIntegerSchema = z.number().int().nonnegative();

/**
 * Catalog entry an equipment item was picked from (`<catalogId>/<entryId>`, spec 009). The item
 * name then displays in the reader's language while it still equals the entry's English name.
 */
const entryRefSchema = z
    .string()
    .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)
    .optional();

export const ItemSchema = z
    .object({
        id: z.string(),
        entryRef: entryRefSchema,
        text: z.string(),
        description: z.string().default(''),
        effects: z.string().default(''),
        weight: z.string().default(''),
        price: z.string().default(''),
        quantity: nonNegativeIntegerSchema.default(1),
        maxQuantity: nonNegativeIntegerSchema.default(1),
        equipped: z.boolean().default(false),
    })
    .refine(({ maxQuantity, quantity }) => quantity <= maxQuantity, {
        message: 'Quantity cannot exceed maximum quantity',
        path: ['quantity'],
    });

export const ArmorItemSchema = z.object({
    id: z.string(),
    entryRef: entryRefSchema,
    name: z.string(),
    classVal: z.string(),
    ar: z.string(),
    dex: z.string(),
});

export const WeaponItemSchema = z
    .object({
        id: z.string(),
        entryRef: entryRefSchema,
        name: z.string(),
        damage: z.string(),
        range: z.string(),
        ammo: z.coerce.number().int().nonnegative().default(0),
        maxAmmo: z.coerce.number().int().nonnegative().default(0),
    })
    .refine(({ ammo, maxAmmo }) => ammo <= maxAmmo, {
        message: 'Ammo cannot exceed maximum ammo',
        path: ['ammo'],
    });

export const ImplantItemSchema = z.object({
    id: z.string(),
    entryRef: entryRefSchema,
    name: z.string(),
    type: z.string(),
    effect: z.string(),
});

export type ArmorItem = z.infer<typeof ArmorItemSchema>;
export type WeaponItem = z.infer<typeof WeaponItemSchema>;
export type ImplantItem = z.infer<typeof ImplantItemSchema>;

export type Item = z.infer<typeof ItemSchema>;
