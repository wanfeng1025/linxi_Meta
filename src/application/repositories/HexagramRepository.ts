import type { HexagramDto } from './types';

export interface HexagramRepository {
  getById(hexagramId: string, contentVersion: string): Promise<HexagramDto | null>;
  getByCombination(
    upperTrigramId: string,
    lowerTrigramId: string,
    contentVersion: string,
  ): Promise<HexagramDto | null>;
}
