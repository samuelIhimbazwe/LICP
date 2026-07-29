import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, ApiError } from '../context/AuthContext';
import { API_BASE } from '../lib/api';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { AlertCircle, Loader2 } from 'lucide-react';

const demoCodeEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

export function MFAVerificationPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();
  const { verifyMFA, needsMFA } = useAuth();
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (!demoCodeEnabled) return;
    const loadDevCode = async () => {
      try {
        const data = await fetch(`${API_BASE}/auth/mfa/dev-code`).then((r) => r.json());
        if (data.code) setDevCode(data.code);
      } catch {
        setDevCode(null);
      }
    };
    loadDevCode();
    const timer = setInterval(loadDevCode, 25000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!needsMFA) {
      navigate('/login');
    }
  }, [needsMFA, navigate]);

  const handleVerify = async () => {
    const codeToVerify = showBackupCode ? backupCode.replace(/[\s-]/g, '') : code;
    if (!showBackupCode && code.length !== 6) {
      setError('Please enter a complete 6-digit code');
      return;
    }
    if (showBackupCode && codeToVerify.length < 8) {
      setError('Please enter a valid backup code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const success = await verifyMFA(showBackupCode ? backupCode.replace(/[\s-]/g, '') : code);
      if (success) {
        if (trustDevice) {
          localStorage.setItem('licp_trusted_device', Date.now().toString());
        }
        navigate('/dashboard');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(`Invalid code. ${3 - newAttempts} attempt(s) remaining.`);
        setCode('');
        setBackupCode('');
        if (newAttempts >= 3) {
          setTimeout(() => navigate('/login'), 2000);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verification required"
      subtitle="Enter the code from your authenticator app."
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-[13px]">{error}</AlertDescription>
          </Alert>
        )}

        {!showBackupCode ? (
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        ) : (
          <input
            type="text"
            placeholder="Backup code"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value)}
            disabled={loading}
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-center font-mono text-sm tracking-widest focus:outline-none focus:ring-1 focus:ring-ring"
          />
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="trustDevice"
            checked={trustDevice}
            onCheckedChange={(v) => setTrustDevice(!!v)}
            disabled={loading}
          />
          <Label htmlFor="trustDevice" className="text-[13px] font-normal cursor-pointer text-muted-foreground">
            Trust this device for 30 days
          </Label>
        </div>

        {demoCodeEnabled && devCode && (
          <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-center text-[12px] text-muted-foreground">
            Demo code: <code className="font-mono text-foreground">{devCode}</code>
          </p>
        )}

        <Button
          onClick={handleVerify}
          className="h-10 w-full"
          disabled={loading || (!showBackupCode && code.length !== 6) || (showBackupCode && backupCode.length < 6)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Verifying…
            </>
          ) : (
            'Verify'
          )}
        </Button>

        <div className="flex items-center justify-between text-[12px]">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
          <button
            type="button"
            onClick={() => { setShowBackupCode(!showBackupCode); setCode(''); setBackupCode(''); setError(''); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showBackupCode ? 'Use authenticator' : 'Use backup code'}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
