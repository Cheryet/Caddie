/**
 * parseAnalysis — Unit tests
 * Locks the row/envelope → domain mapping (column renames + frame_index →
 * frameIndex), the null-on-malformed behaviour, and the function-error map.
 */

import {
  mapFunctionError,
  parseAnalyzeEnvelope,
  parseStoredAnalysis,
} from '../parseAnalysis';
import {
  MOCK_ANALYSIS,
  mockAnalysisEnvelope,
  mockAnalysisRow,
} from '../__fixtures__/analysis';

describe('parseStoredAnalysis', () => {
  it('maps a stored row to the domain shape', () => {
    expect(parseStoredAnalysis(mockAnalysisRow)).toEqual(MOCK_ANALYSIS);
  });

  it('renames frame_index → frameIndex on each issue', () => {
    const result = parseStoredAnalysis(mockAnalysisRow);
    expect(result?.issues[0]?.frameIndex).toBe(3);
    // The snake_case key must not leak through.
    expect(result?.issues[0]).not.toHaveProperty('frame_index');
  });

  it('returns null when a required field is missing', () => {
    const { coaching_text: _omit, ...rest } = mockAnalysisRow;
    expect(parseStoredAnalysis(rest)).toBeNull();
  });

  it('returns null for an out-of-range frame_index', () => {
    const bad = {
      ...mockAnalysisRow,
      issues: [{ ...mockAnalysisRow.issues[0], frame_index: 9 }],
    };
    expect(parseStoredAnalysis(bad)).toBeNull();
  });

  it('returns null for an unknown severity', () => {
    const bad = {
      ...mockAnalysisRow,
      issues: [{ ...mockAnalysisRow.issues[0], severity: 'critical' }],
    };
    expect(parseStoredAnalysis(bad)).toBeNull();
  });
});

describe('parseAnalyzeEnvelope', () => {
  it('maps the function envelope to the domain shape', () => {
    expect(parseAnalyzeEnvelope(mockAnalysisEnvelope)).toEqual(MOCK_ANALYSIS);
  });

  it('returns null when the envelope is missing its analysis', () => {
    expect(parseAnalyzeEnvelope({ usage: {} })).toBeNull();
  });
});

describe('mapFunctionError', () => {
  it('maps rate_limited to a non-retryable daily-limit message', () => {
    const err = mapFunctionError('rate_limited');
    expect(err.code).toBe('rate_limited');
    expect(err.retryable).toBe(false);
  });

  it('maps schema/parse errors to a retryable invalid-response error', () => {
    expect(mapFunctionError('schema_error').code).toBe('invalid_response');
    expect(mapFunctionError('parse_error').retryable).toBe(true);
  });

  it('maps unauthorized to a non-retryable auth error', () => {
    const err = mapFunctionError('unauthorized');
    expect(err.code).toBe('unauthenticated');
    expect(err.retryable).toBe(false);
  });

  it('falls back to a retryable unknown error', () => {
    const err = mapFunctionError('something_new');
    expect(err.code).toBe('unknown');
    expect(err.retryable).toBe(true);
  });
});
