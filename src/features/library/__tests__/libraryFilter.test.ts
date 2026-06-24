/**
 * libraryFilter — Unit tests
 * The client-side search + quick-filter predicate behind the LibraryScreen
 * grid: each chip, case-insensitive query over title/club, and the two
 * combined.
 */

import { filterVideos } from '../libraryFilter';
import type { Video } from '../hooks/useVideos';

function makeVideo(overrides: Partial<Video>): Video {
  return {
    id: 'v',
    title: 'Driver',
    clubType: 'Driver',
    cameraAngle: 'face-on',
    swingHand: 'right',
    durationMs: 4000,
    storagePath: 'u/v.mp4',
    thumbnailPath: null,
    thumbnailUrl: null,
    hasAnalysis: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

const driver = makeVideo({ id: 'driver', title: 'Driver', clubType: 'Driver', hasAnalysis: true });
const sevenIron = makeVideo({ id: '7i', title: '7 Iron', clubType: '7 Iron' });
const wedge = makeVideo({ id: 'sw', title: 'Sand wedge', clubType: 'SW' });
const all = [driver, sevenIron, wedge];

describe('filterVideos', () => {
  it('all → returns the whole list', () => {
    expect(filterVideos(all, { query: '', filter: 'all' })).toEqual(all);
  });

  it('driver → only the Driver', () => {
    expect(filterVideos(all, { query: '', filter: 'driver' })).toEqual([driver]);
  });

  it('irons → numbered irons only, not wedges', () => {
    expect(filterVideos(all, { query: '', filter: 'irons' })).toEqual([sevenIron]);
  });

  it('analysed → only analysed swings', () => {
    expect(filterVideos(all, { query: '', filter: 'analysed' })).toEqual([driver]);
  });

  it('query matches title/club case-insensitively', () => {
    expect(filterVideos(all, { query: 'iron', filter: 'all' })).toEqual([sevenIron]);
    expect(filterVideos(all, { query: 'DRIV', filter: 'all' })).toEqual([driver]);
  });

  it('a blank/whitespace query is ignored', () => {
    expect(filterVideos(all, { query: '   ', filter: 'all' })).toEqual(all);
  });

  it('combines the chip and the query', () => {
    expect(filterVideos(all, { query: 'driver', filter: 'analysed' })).toEqual([driver]);
    expect(filterVideos(all, { query: 'iron', filter: 'analysed' })).toEqual([]);
  });
});
