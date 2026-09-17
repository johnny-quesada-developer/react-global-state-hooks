import { testCoverageRule } from '../../rules/testCoverage/testCoverageRule';
import type { Rule } from './Rule';

export const ruleRegistry: Rule[] = [testCoverageRule];
