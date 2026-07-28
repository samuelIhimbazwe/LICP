import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Mail, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { toast } from 'sonner';

export function EmailVerificationPendingPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleResend = async () => {
    setSending(true);
    try {
      const result = await apiRequest<{
        success?: boolean;
        previewUrl?: string;
        emailSent?: boolean;
        emailMode?: string;
      }>('/auth/resend-verification', { method: 'POST' });
      setSent(true);
      setPreviewUrl(result.previewUrl ?? null);
      if (result.emailSent) {
        toast.success(
          result.previewUrl
            ? 'Verification email sent — open the preview link below (dev).'
            : 'Verification email sent. Check your inbox.'
        );
      } else {
        toast.warning('Could not deliver email. Configure SMTP or check server logs.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send verification email.');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    const updated = await refreshUser();
    if (updated?.emailVerified) {
      navigate('/dashboard');
    } else {
      toast.message('Email not verified yet.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Mail className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You must verify your email before accessing the platform. Check your inbox and spam
              folder, then click the link in the email.
            </AlertDescription>
          </Alert>

          {sent && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                A new verification email has been sent.
              </AlertDescription>
            </Alert>
          )}

          {previewUrl && (
            <Button variant="secondary" className="w-full" onClick={() => window.open(previewUrl, '_blank')}>
              Open verification email preview (dev)
            </Button>
          )}

          <Button className="w-full" onClick={handleResend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Resend verification email'
            )}
          </Button>

          <Button variant="outline" className="w-full" onClick={handleRefresh}>
            I&apos;ve verified — continue
          </Button>

          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
