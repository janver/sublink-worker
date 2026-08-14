import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { parseVless } from '../src/parsers/protocols/vlessParser.js';

// Synthetic fixture only. It mirrors the reported VLESS xhttp shape without
// carrying a real server, UUID, path, or subscription secret.
const vlessXhttpUrl =
  'vless://11111111-1111-4111-8111-111111111111@example.com:443?encryption=none&security=tls&sni=example.com&fp=chrome&alpn=h2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=xhttp&host=example.com&path=%2Fxhttp&mode=packet-up#VLESS-XHTTP-Test';

describe('VLESS xhttp URL conversion', () => {
  it('parses xhttp transport and TLS metadata from URL query parameters', () => {
    const proxy = parseVless(vlessXhttpUrl);

    expect(proxy.transport).toEqual({
      type: 'xhttp',
      path: '/xhttp',
      host: 'example.com',
      headers: { Host: 'example.com' },
      mode: 'packet-up'
    });
    expect(proxy.tls).toMatchObject({
      enabled: true,
      server_name: 'example.com',
      insecure: false,
      utls: {
        enabled: true,
        fingerprint: 'chrome'
      }
    });
    expect(proxy.alpn).toEqual(['h2', 'http/1.1']);
  });

  it('emits Clash xhttp-opts, fingerprint, sni and alpn without enabling skip-cert-verify', async () => {
    const builder = new ClashConfigBuilder(vlessXhttpUrl, 'minimal', [], null, 'zh-CN', 'test-agent');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);
    const proxy = built.proxies.find(p => p.name === 'VLESS-XHTTP-Test');

    expect(proxy).toMatchObject({
      type: 'vless',
      server: 'example.com',
      port: 443,
      uuid: '11111111-1111-4111-8111-111111111111',
      network: 'xhttp',
      'xhttp-opts': {
        path: '/xhttp',
        host: 'example.com',
        headers: { Host: 'example.com' },
        mode: 'packet-up'
      },
      tls: true,
      servername: 'example.com',
      sni: 'example.com',
      'client-fingerprint': 'chrome',
      alpn: ['h2', 'http/1.1'],
      tfo: false,
      udp: true
    });
    expect(proxy).not.toHaveProperty('skip-cert-verify');
  });
});
