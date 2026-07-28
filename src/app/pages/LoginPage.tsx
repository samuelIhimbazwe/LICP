import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, ApiError } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { AlertCircle, Loader2, Eye, EyeOff, Lock, ChevronDown, ChevronUp } from 'lucide-react';

const MAX_LOGIN_ATTEMPTS = 5;

const demoAccounts = [
  { label: 'Admin', email: 'david.park@legalfirm.com' },
  { label: 'Compliance Officer', email: 'sarah.johnson@legalfirm.com' },
  { label: 'Legal Practitioner', email: 'michael.chen@legalfirm.com' },
  { label: 'Manager', email: 'emily.rodriguez@legalfirm.com' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const isLocked = lockedUntil && new Date() < lockedUntil;
  const remainingLockSeconds = isLocked
    ? Math.ceil((lockedUntil!.getTime() - Date.now()) / 1000)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setError(`Account temporarily locked. Try again in ${remainingLockSeconds} seconds.`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (rememberMe) {
        localStorage.setItem('licp_remember_email', email);
      } else {
        localStorage.removeItem('licp_remember_email');
      }
      if (result.requiresMfa) {
        navigate('/verify-mfa');
      } else if (result.requiresEmailVerification) {
        navigate('/verify-email-pending');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          setError(err.message);
        } else if (err.status === 401) {
          setLoginAttempts((n) => n + 1);
          setError(err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const remembered = localStorage.getItem('licp_remember_email');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your organisation credentials to continue."
      footer={
        <>
          Accounts are provisioned by your administrator.
          <br />
          Contact IT if you need access.
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-[13px]">{error}</AlertDescription>
          </Alert>
        )}

        {isLocked && (
          <Alert className="border-border bg-muted py-2.5">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-[13px] text-muted-foreground">
              Account locked. Wait {remainingLockSeconds}s before retrying.
            </AlertDescription>
          </Alert>
        )}

        {loginAttempts > 0 && !isLocked && (
          <p className="text-[12px] text-muted-foreground">
            Failed attempt {loginAttempts} of {MAX_LOGIN_ATTEMPTS}
          </p>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@organisation.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || !!isLocked}
              autoComplete="email"
              className="auth-input"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-medium text-muted-foreground">
                Password
              </Label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || !!isLocked}
                autoComplete="current-password"
                className="auth-input pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(!!checked)}
            disabled={loading}
          />
          <Label htmlFor="rememberMe" className="text-[13px] font-normal cursor-pointer text-muted-foreground">
            Remember email
          </Label>
        </div>

        <Button type="submit" className="h-10 w-full" disabled={loading || !!isLocked}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Signing in…
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </form>

      {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') && (
        <div className="mt-8 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
            className="flex w-full items-center justify-between text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Demo accounts</span>
            {showDemoAccounts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showDemoAccounts && (
            <div className="mt-3 space-y-1">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account.email)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-muted transition-colors"
                >
                  <span className="text-foreground">{account.label}</span>
                  <span className="truncate text-muted-foreground ml-3">{account.email}</span>
                </button>
              ))}
              <p className="px-2 pt-2 text-[11px] text-muted-foreground">
                Password <code className="font-mono">demo123</code> · MFA required — add secret{' '}
                <code className="font-mono">JBSWY3DPEHPK3PXP</code> in Google Authenticator (or use the live code on the MFA screen)
              </p>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
