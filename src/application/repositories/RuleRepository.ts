import type {
  BranchRelationDto,
  NajiaAssignmentDto,
  PalaceHexagramDto,
  RuleDefinitionDto,
} from './types';

export interface RuleRepository {
  listDefinitions(rulesetId: string, rulesetVersion: string): Promise<readonly RuleDefinitionDto[]>;
  listPalaceHexagrams(
    rulesetId: string,
    rulesetVersion: string,
  ): Promise<readonly PalaceHexagramDto[]>;
  listNajiaAssignments(
    rulesetId: string,
    rulesetVersion: string,
  ): Promise<readonly NajiaAssignmentDto[]>;
  listBranchRelations(
    rulesetId: string,
    rulesetVersion: string,
  ): Promise<readonly BranchRelationDto[]>;
}
