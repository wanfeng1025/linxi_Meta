export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly kind: 'structure' | 'data';
  readonly statements: readonly string[];
}
