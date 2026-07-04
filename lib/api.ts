import { NextResponse } from 'next/server';

/**
 * Route-handler wrapper: any uncaught error becomes a JSON {error} response
 * instead of an empty-body 500 (which crashes clients doing res.json()).
 */
export function withErrors<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error('[api]', err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
