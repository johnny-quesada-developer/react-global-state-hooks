import { z } from 'zod';
import { parseStructuredOutput } from './extractJsonBlock';

const ScoreSchema = z.object({ score: z.number().min(0).max(10), flags: z.array(z.string()) });

describe('parseStructuredOutput', () => {
  it('finds the JSON object in the shapes CLIs actually print and explains why a response is rejected', () => {
    const bare = parseStructuredOutput({ text: '{"score": 8, "flags": []}', schema: ScoreSchema });
    const fencedAfterProse = parseStructuredOutput({
      text: 'Here is my review:\n```json\n{"score": 6, "flags": ["mocksOwnCode"]}\n```\nDone.',
      schema: ScoreSchema,
    });
    const embeddedWithAnsi = parseStructuredOutput({
      text: '[32m> [0mThinking... result {"score": 9, "flags": ["a"]} end',
      schema: ScoreSchema,
    });

    expect(bare).toEqual({ success: true, data: { score: 8, flags: [] } });
    expect(fencedAfterProse).toEqual({ success: true, data: { score: 6, flags: ['mocksOwnCode'] } });
    expect(embeddedWithAnsi).toEqual({ success: true, data: { score: 9, flags: ['a'] } });

    const noJson = parseStructuredOutput({ text: 'I could not do it', schema: ScoreSchema });
    const brokenJson = parseStructuredOutput({ text: '```json\n{"score": 8,}\n```', schema: ScoreSchema });
    const wrongShape = parseStructuredOutput({ text: '{"score": 42}', schema: ScoreSchema });

    expect(noJson).toEqual({ success: false, error: 'The response did not contain a JSON object.' });
    expect(brokenJson.success).toBe(false);
    expect(!brokenJson.success && brokenJson.error).toContain('could not be parsed');
    expect(!wrongShape.success && wrongShape.error).toMatch(/score: .*10.*; flags: /);
  });
});
