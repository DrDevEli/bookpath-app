import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { subscribersAPI } from '../api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SubscribeCardProps {
  /** The channel that brought the reader (instagram / pinterest / direct …). */
  source?: string;
  /** Where on our own site the form was seen. */
  context?: string;
}

/**
 * Email capture for /links — the page the Instagram bio points at.
 *
 * WHY THIS EXISTS: /links was the single most valuable page in the content
 * funnel and it captured nobody. Instagram gives us reach we do not own; the
 * email list is the only asset that survives an algorithm change, and this page
 * is where every IG arrival lands (captions carry no clickable links, so the bio
 * link is one of only two exits from the profile).
 *
 * PLACEMENT: after the lists, deliberately. The hub's primary job is to send the
 * reader to a specific list in one tap; a form above the lists would compete with
 * that. The reader who scrolled and did not pick a list is exactly the reader who
 * wants to hear when a new one lands.
 *
 * COPY RULE: no "deals", no "weekly", no prices. The catalog has no price data
 * (Amazon PA-API is still pending), so promising deals would be a claim the
 * product cannot keep — and the whole point of this account is that it does not
 * promise what it cannot deliver.
 */
export function SubscribeCard({ source = 'link-hub', context = 'link-hub' }: SubscribeCardProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  // Already subscribed in this browser → do not ask again.
  const [hidden] = useState(() => {
    try {
      return localStorage.getItem('bp_subscribed') === '1';
    } catch {
      return false;
    }
  });

  if (hidden) return null;

  const subscribe = async () => {
    if (!EMAIL_RE.test(email)) {
      setStatus('error');
      setMsg('Enter a valid email address.');
      return;
    }
    setStatus('saving');
    try {
      await subscribersAPI.subscribe(email, source, context);
      setStatus('done');
      setMsg('Done — you are on the list.');
      try {
        localStorage.setItem('bp_subscribed', '1');
      } catch {
        /* private mode: not worth failing the subscribe over */
      }
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setMsg(err?.response?.data?.error || 'Could not subscribe. Please try again.');
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Told when a new list lands</h2>
          <p className="text-sm text-muted-foreground">
            One short email when a list goes up, and the books worth your time. Nothing else —
            no newsletter filler, and no passes to your inbox.
          </p>
        </div>
        {status === 'done' ? (
          <p className="text-sm font-medium">{msg}</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                aria-label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && subscribe()}
              />
              <Button onClick={subscribe} disabled={status === 'saving'}>
                {status === 'saving' ? '…' : 'Keep me posted'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Unsubscribe in one click, any time. We never sell or share your address.
            </p>
          </>
        )}
        {status === 'error' && <p className="text-xs text-red-600">{msg}</p>}
      </CardContent>
    </Card>
  );
}

export default SubscribeCard;
