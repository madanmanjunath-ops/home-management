// Change-notification hook.
//
// The app previously pushed updates over a WebSocket. On serverless (Netlify
// Functions) there is no long-lived connection, so clients now poll `/api/state`
// (see the client store). `broadcast` is kept as an intentional no-op extension
// point: when we move to Supabase Realtime, this is where a change event would be
// emitted, without touching every route.
export function broadcast(_householdId: string, _resource = 'state'): void {
  // no-op (polling model)
}
