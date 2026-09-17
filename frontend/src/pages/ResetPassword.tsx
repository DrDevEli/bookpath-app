import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '../api';

// Mirrors the backend policy (mongoose/Joi): >=12 chars, upper, lower, number, special.
const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/auth/validate-reset-token/${token}`);
        if (!cancelled) setValid(!!res.data?.isValid);
      } catch {
        if (!cancelled) setValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!POLICY.test(password)) {
      setError('Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number and a special character.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not reset your password.';
      setError(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Choose a new password</CardTitle>
          <CardDescription className="text-center" style={{ color: '#dbcd90' }}>
            {done ? 'Password updated — taking you to sign in.' : 'Minimum 12 characters with upper, lower, number and symbol.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <p className="text-sm" style={{ color: '#dbcd90' }}>Checking your reset link...</p>
          ) : done ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
              <p className="text-sm text-emerald-700">Your password has been reset. You can sign in now.</p>
            </div>
          ) : !valid ? (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  This reset link is invalid or has expired. Request a new one to continue.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: '#dbcd90' }}>New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  style={{ height: '32px', padding: '6px 12px', fontSize: '14px' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" style={{ color: '#dbcd90' }}>Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={isSubmitting}
                  style={{ height: '32px', padding: '6px 12px', fontSize: '14px' }}
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{String(error)}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || !password || !confirm}>
                {isSubmitting ? 'Saving...' : 'Set new password'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center" style={{ color: '#dbcd90' }}>
            <Link to="/login" className="hover:underline" style={{ color: '#dbcd90' }}>Back to sign in</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ResetPassword;
