import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type VerifyState = 'verifying' | 'verified' | 'error';

export function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setState('error');
        setMessage('Missing verification token.');
        return;
      }

      try {
        // Same-origin /api call. The backend answers 302 -> /login?verified=true
        // on success, 400 (JSON) on invalid/expired token. redirect:'manual'
        // lets us observe the 302 instead of the browser following it.
        const res = await fetch(`/api/auth/verify-email/${encodeURIComponent(token)}`, {
          redirect: 'manual',
        });

        if (cancelled) return;

        if (res.type === 'opaqueredirect' || res.status === 302) {
          setState('verified');
          setMessage('Your email has been verified. You can now log in.');
          return;
        }

        if (res.status === 200) {
          const data = await res.json().catch(() => ({}));
          if (data?.success) {
            setState('verified');
            setMessage('Your email has been verified. You can now log in.');
            return;
          }
        }

        if (res.status === 400) {
          setState('error');
          setMessage(
            'This link has already been used or is no longer valid. If you already verified your email, you can log in directly.'
          );
          return;
        }

        const data = await res.json().catch(() => ({}));
        setState('error');
        setMessage(
          (typeof data?.message === 'string' ? data.message : 'Something went wrong while verifying your email.') +
            ' Please try again.'
        );
      } catch (err) {
        if (cancelled) return;
        setState('error');
        setMessage('Something went wrong while verifying your email. Please try again.');
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'verifying') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (state === 'verified') {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#dbcd90' }}>
          Email verified
        </h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <Button asChild className="bg-gradient-to-r from-primary to-teal text-white">
          <Link to="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#dbcd90' }}>
        Link no longer valid
      </h2>
      <p className="text-muted-foreground mb-4">{message}</p>
      <div className="flex items-center justify-center gap-3">
        <Button asChild variant="outline">
          <Link to="/">Back to Home</Link>
        </Button>
        <Button asChild className="bg-gradient-to-r from-primary to-teal text-white">
          <Link to="/login">Go to Login</Link>
        </Button>
      </div>
    </div>
  );
}

export default VerifyEmail;
