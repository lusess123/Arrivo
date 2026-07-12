import { describe, expect, test } from 'bun:test';
import worker from '../src/worker';

describe('web domain worker', () => {
  test('redirects the legacy domain and preserves path and query', async () => {
    const response = await worker.fetch(
      new Request('https://app-arrivo.zyking.xyz/article/123?tab=public'),
      { ASSETS: { fetch: async () => new Response('asset') } },
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://arrivo.zyking.xyz/article/123?tab=public');
  });

  test('serves assets on the primary domain', async () => {
    const response = await worker.fetch(
      new Request('https://arrivo.zyking.xyz/'),
      { ASSETS: { fetch: async () => new Response('asset') } },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset');
  });
});
