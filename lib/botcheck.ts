/**
 * Detect anti-bot interstitials (Cloudflare, DataDome, PerimeterX, generic
 * CAPTCHA / "checking your browser" pages). We do NOT try to defeat these —
 * solving CAPTCHAs / rotating residential proxies is an arms race and legally
 * gray. Instead we recognise them so the app can say so honestly and fall
 * back to manual entry. Tracking works from the URL regardless.
 */

const CHALLENGE_MARKERS: { re: RegExp; reason: string }[] = [
  { re: /just a moment/i, reason: 'Cloudflare challenge' },
  { re: /checking your browser before accessing/i, reason: 'Cloudflare "checking your browser"' },
  { re: /cf-browser-verification|cf_chl_|cf-challenge|__cf_chl/i, reason: 'Cloudflare challenge' },
  { re: /attention required!?\s*\|\s*cloudflare/i, reason: 'Cloudflare block' },
  { re: /enable javascript and cookies to continue/i, reason: 'JS/cookie wall' },
  { re: /ddos protection by|ddos-guard/i, reason: 'DDoS-Guard' },
  { re: /datadome|captcha-delivery\.com/i, reason: 'DataDome' },
  { re: /px-captcha|perimeterx|_pxhd/i, reason: 'PerimeterX' },
  { re: /please (?:complete|verify).{0,20}captcha|hcaptcha|g-recaptcha|recaptcha\/api/i, reason: 'CAPTCHA' },
  { re: /access denied|you (?:have been|are) blocked|error 1020/i, reason: 'access blocked' },
  { re: /verifying you are human|verify you are human/i, reason: 'human-verification wall' },
];

/** HTTP status codes that commonly signal a block rather than a real error. */
const BLOCK_STATUS = new Set([401, 403, 429, 503]);

export interface BlockResult {
  blocked: boolean;
  reason?: string;
}

/** Inspect page HTML (+ optional status/title) for anti-bot signals. */
export function detectBlock(html: string, opts: { status?: number; title?: string } = {}): BlockResult {
  if (opts.status && BLOCK_STATUS.has(opts.status)) {
    // Corroborate the status with body text where possible — some sites use
    // 403 for legit "not found" too, but paired with a tiny/challenge body
    // it's almost always a block.
    const marker = CHALLENGE_MARKERS.find((m) => m.re.test(html) || (opts.title && m.re.test(opts.title)));
    return { blocked: true, reason: marker?.reason || `HTTP ${opts.status}` };
  }
  const hay = `${opts.title || ''}\n${html.slice(0, 20_000)}`;
  const marker = CHALLENGE_MARKERS.find((m) => m.re.test(hay));
  if (marker) return { blocked: true, reason: marker.reason };
  return { blocked: false };
}
