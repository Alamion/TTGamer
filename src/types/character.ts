import { z } from 'zod';

export const CharacterTypeSchema = z.enum(['sentient', 'droid', 'vehicle']);

export const CharacterMetadataSchema = z.object({
  name: z.string().min(1),
  type: CharacterTypeSchema,
  template: z.string().min(1),
  player: z.string().optional(),
  adventure: z.string().optional(),
  concept: z.string().optional(),
  nature: z.string().optional(),
  demeanor: z.string().optional(),
  species: z.string().optional(),
  homeWorld: z.string().optional(),
  age: z.string().optional(),
});

export const HealthSchema = z.object({
  current: z.number().min(0),
  max: z.number().min(1),
  penalties: z.boolean(),
});

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().min(0),
  notes: z.string().optional(),
});

export const BaseCharacterSchema = z.object({
  id: z.string().uuid(),
  metadata: CharacterMetadataSchema,
  attributes: z.record(z.number().min(0).max(5)),
  skills: z.record(z.number().min(0).max(5)),
  forceSkills: z.record(z.number().min(0).max(5)).optional(),
  virtues: z.record(z.number().min(0).max(5)).optional(),
  health: HealthSchema,
  inventory: z.array(ItemSchema),
  notes: z.string(),
});

export type CharacterType = z.infer<typeof CharacterTypeSchema>;
export type CharacterMetadata = z.infer<typeof CharacterMetadataSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type BaseCharacter = z.infer<typeof BaseCharacterSchema>;

export function createDefaultCharacter(): BaseCharacter {
  return {
    id: crypto.randomUUID(),
    metadata: {
      name: 'New Character',
      type: 'sentient',
      template: 'standard',
      player: '',
      adventure: '',
      concept: '',
      nature: '',
      demeanor: '',
      species: '',
      homeWorld: '',
      age: '',
    },
    attributes: {
      Strength: 1,
      Dexterity: 1,
      Stamina: 1,
      Charisma: 1,
      Manipulation: 1,
      Appearance: 1,
      Perception: 1,
      Intelligence: 1,
      Wits: 1,
    },
    skills: {},
    forceSkills: {},
    virtues: {},
    health: {
      current: 7,
      max: 7,
      penalties: false,
    },
    inventory: [],
    notes: '',
  };
}
