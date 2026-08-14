import { describe, it, expect } from 'vitest';
import { parseShadowsocks } from '../src/parsers/protocols/shadowsocksParser.js';

// v2ray-plugin plugin-opts boolean fields (mux, tls, v2ray-http-upgrade,
// skip-cert-verify, name-cert-verify) must be emitted as YAML booleans, not
// the SIP003 string "0"/"1" carried over from the ss:// query string.
// mihomo rejects `mux: '0'` — it requires `mux: false`.
// Refs: https://wiki.metacubex.one/en/config/proxies/ss
describe('SS v2ray-plugin boolean opts (mux=0 regression)', () => {
  it('converts mux=0 to boolean false, not string "0"', () => {
    // Synthetic fixture matching the reported shape: ...;tls;mux=0
    const ssUrl =
      'ss://bm9uZTp0ZXN0LXBhc3N3b3Jk@example.com:443?plugin=v2ray-plugin%3Bmode%3Dwebsocket%3Bhost%3Dexample.com%3Bpath%3D%2Fws%3Btls%3Bmux%3D0#ss-mux-test';

    const proxy = parseShadowsocks(ssUrl);

    expect(proxy.plugin).toBe('v2ray-plugin');
    expect(proxy.plugin_opts.mux).toBe(false);
  });

  it('converts mux=1 to boolean true', () => {
    const ssUrl =
      'ss://bm9uZTp0ZXN0LXBhc3N3b3Jk@example.com:443?plugin=v2ray-plugin%3Bmode%3Dwebsocket%3Bhost%3Dexample.com%3Bpath%3D%2Fws%3Btls%3Bmux%3D1#ss-mux-on';

    const proxy = parseShadowsocks(ssUrl);

    expect(proxy.plugin_opts.mux).toBe(true);
  });

  it('still emits tls as boolean when given as a bare flag', () => {
    const ssUrl =
      'ss://bm9uZTp0ZXN0LXBhc3N3b3Jk@example.com:443?plugin=v2ray-plugin%3Bmode%3Dwebsocket%3Btls#ss-tls';

    const proxy = parseShadowsocks(ssUrl);

    expect(proxy.plugin_opts.tls).toBe(true);
  });
});
