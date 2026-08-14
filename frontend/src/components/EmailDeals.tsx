import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { subscribersAPI } from '../api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailDealsProps {
  source?: string;
  context?: string;
}

/**
 * Optional email-capture widget for the "book deals" list (Phase 3).
 * Non-blocking — sits next to the buy CTA, never interrupts the affiliate flow.
 */
export function EmailDeals({ source = 'book-details', context }: EmailDealsProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  // Already subscribed this browser → keep it collapsed/hidden.
  const [hidden] = useState(localStorage.getItem('bp_subscribed') === '1');

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
      setMsg("You're on the list — weekly deals are on the way!");
      localStorage.setItem('bp_subscribed', '1');
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setMsg(err.response?.data?.error || 'Could not subscribe. Please try again.');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-semibold mb-1">📚 Get the best book deals, weekly</p>
        <p className="text-xs text-muted-foreground mb-3">No spam. Just great books in your genres.</p>
        {status === 'done' ? (
          <p className="text-sm text-green-700 font-medium">{msg}</p>
        ) : (
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && subscribe()}
            />
            <Button onClick={subscribe} disabled={status === 'saving'}>
              {status === 'saving' ? '…' : 'Subscribe'}
            </Button>
          </div>
        )}
        {status === 'error' && <p className="text-xs text-red-600 mt-1">{msg}</p>}
      </CardContent>
    </Card>
  );
}

export default EmailDeals;
