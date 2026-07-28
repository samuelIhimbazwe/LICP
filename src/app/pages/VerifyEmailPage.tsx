import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    apiRequest<{ success: boolean; message: string }>(`/auth/verify-email/${token}`)
      .then((data) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
            <Mail className="h-6 w-6 text-brand" />
          </div>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Confirming your email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="text-slate-600">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Continue to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Back to Login</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
