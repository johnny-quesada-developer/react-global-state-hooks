import { DOCUMENTED_VERSION, STABLE_VERSION, SITE_NAME, links } from './site';

describe('site configuration from .env', () => {
  it('defines a name and semver-like versions', () => {
    expect(SITE_NAME).toBeTruthy();
    expect(DOCUMENTED_VERSION).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
    expect(STABLE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it.each(Object.entries(links))('link %s is an absolute https URL', (_name, url) => {
    expect(new URL(url).protocol).toBe('https:');
  });
});
