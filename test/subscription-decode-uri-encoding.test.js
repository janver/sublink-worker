import { afterEach, describe, expect, it, vi } from 'vitest';
import yaml from 'js-yaml';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { fetchSubscriptionWithFormat, fetchSubscription } from '../src/parsers/subscription/httpSubscriptionFetcher.js';
import { parseVless } from '../src/parsers/protocols/vlessParser.js';
import { encodeBase64 } from '../src/utils.js';

// WebSocket path carrying an encoded `://` and `?` — the shape produced by
// subscription generators that tunnel TURN/QUIC endpoints over WS.
const ENCODED_PATH = '%2Fturn%3A%2F%2F203.0.113.9%3A3478%3Fed%3D2560';
const DECODED_PATH = '/turn://203.0.113.9:3478?ed=2560';

const vlessUri =
    `vless://11111111-2222-3333-4444-555555555555@edge.example.com:443` +
    `?encryption=none&security=tls&sni=turn.example.com&fp=firefox&type=ws` +
    `&host=turn.example.com&path=${ENCODED_PATH}` +
    `#%F0%9F%87%A7%F0%9F%87%B7%20BR%20node`;

function mockFetchText(text) {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => text,
        headers: {
            get: () => null
        }
    })));
}

describe('Subscription decoding preserves URI parameter encoding', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('keeps percent-encoded URI parameters intact for Base64 subscriptions', async () => {
        mockFetchText(encodeBase64(vlessUri));

        const result = await fetchSubscriptionWithFormat('https://example.com/sub?base64', 'test-agent');

        expect(result.content).toContain(`path=${ENCODED_PATH}`);
    });

    it('parses the WebSocket path and tag of an encoded VLESS URI', async () => {
        mockFetchText(encodeBase64(vlessUri));

        const [line] = await fetchSubscription('https://example.com/sub?base64', 'test-agent');
        const proxy = parseVless(line);

        expect(proxy.tag).toBe('🇧🇷 BR node');
        expect(proxy.transport).toEqual({
            type: 'ws',
            path: DECODED_PATH,
            headers: { host: 'turn.example.com' }
        });
    });

    it('emits the node instead of an empty proxies list when building Clash', async () => {
        mockFetchText(encodeBase64(vlessUri));

        const builder = new ClashConfigBuilder(
            'https://example.com/sub?base64',
            'minimal',
            [],
            null,
            'zh-CN',
            'test-agent'
        );
        const built = yaml.load(await builder.build());

        expect(built.proxies).toHaveLength(1);
        expect(built.proxies[0].name).toBe('🇧🇷 BR node');
        expect(built.proxies[0]['ws-opts'].path).toBe(DECODED_PATH);
    });

    it('takes the authority from the scheme separator, not from a path containing "://"', () => {
        const proxy = parseVless(
            'vless://11111111-2222-3333-4444-555555555555@edge.example.com:443' +
            '?encryption=none&security=tls&type=ws&path=/turn://203.0.113.9:3478#BR%20node'
        );

        expect(proxy.tag).toBe('BR node');
        expect(proxy.server).toBe('edge.example.com');
        expect(proxy.transport.path).toBe('/turn://203.0.113.9:3478');
    });
});
