import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '../api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await api.post('/auth/forgot-password', { email });
      // Backend answers uniformly (no user enumeration) — always show success.
      setSent(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong. Please try again.';
      setError(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset your password</CardTitle>
          <CardDescription className="text-center" style={{ color: '#dbcd90' }}>
            {sent
              ? 'Check your inbox for the reset link.'
              : "Enter the email you signed up with and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                <p className="text-sm text-emerald-700">
                  If an account exists for <strong>{email}</strong>, a password reset link is on its way.
                  It expires in 1 hour. Don't forget to check spam.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: '#dbcd90' }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  style={{ height: '32px', padding: '6px 12px', fontSize: '14px' }}
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{String(error)}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || !email}>
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center" style={{ color: '#dbcd90' }}>
            Remembered it?{' '}
            <Link to="/login" className="hover:underline font-medium" style={{ color: '#dbcd90' }}>
              Back to sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ForgotPassword;
