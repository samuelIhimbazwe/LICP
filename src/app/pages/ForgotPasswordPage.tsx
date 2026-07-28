import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { KeyRound, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';

type Step = 'email' | 'reset' | 'success';

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score += 20;
  if (pwd.length >= 12) score += 10;
  if (/[A-Z]/.test(pwd)) score += 20;
  if (/[0-9]/.test(pwd)) score += 20;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 30;

  if (score < 30) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score < 50) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score < 80) return { score, label: 'Good', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const startResendCountdown = () => {
    setResendCountdown(60);
    const timer = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (result) {
        setStep('reset');
        startResendCountdown();
      } else {
        setError('No account found with this email address.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    startResendCountdown();
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (strength.score < 50) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }
    if (!passwordRequirements.every(r => r.met)) {
      setError('Password does not meet all requirements.');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setStep('success');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#faf9f7] via-[#ffffff] to-[#f3ede6] p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-slate-200">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-md">
              <KeyRound className="w-9 h-9 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {step === 'email' && 'Reset Password'}
                {step === 'reset' && 'Set New Password'}
                {step === 'success' && 'Password Updated'}
              </CardTitle>
              <CardDescription className="mt-1">
                {step === 'email' && "Enter your email and we'll send you reset instructions"}
                {step === 'reset' && `Create a strong new password for ${email}`}
                {step === 'success' && 'Your password has been successfully changed'}
              </CardDescription>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {(['email', 'reset', 'success'] as Step[]).map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step === s ? 'bg-brand text-brand-foreground' :
                    (['email', 'reset', 'success'] as Step[]).indexOf(step) > i ? 'bg-green-500 text-white' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {(['email', 'reset', 'success'] as Step[]).indexOf(step) > i
                      ? <CheckCircle2 className="h-3 w-3" />
                      : i + 1}
                  </div>
                  {i < 2 && <div className={`h-px w-8 ${(['email', 'reset', 'success'] as Step[]).indexOf(step) > i ? 'bg-green-500' : 'bg-slate-200'}`} />}
                </React.Fragment>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : 'Send Reset Instructions'}
                </Button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700 hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </button>
              </form>
            )}

            {/* Step 2: New Password */}
            {step === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Alert className="border-brand/20 bg-brand/5">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  <AlertDescription className="text-brand text-xs">
                    Reset link sent to <strong>{email}</strong>.
                    {resendCountdown > 0
                      ? ` Resend available in ${resendCountdown}s.`
                      : <button type="button" onClick={handleResend} className="ml-1 text-brand underline">Resend email</button>}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength */}
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Strength</span>
                        <span className={`font-medium ${strength.label === 'Strong' ? 'text-green-600' : strength.label === 'Good' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.score}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                {newPassword && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
                    <p className="text-xs font-medium text-slate-600 mb-1">Password requirements:</p>
                    {passwordRequirements.map((req) => (
                      <div key={req.label} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${req.met ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className={req.met ? 'text-green-700' : 'text-slate-500'}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className={`pr-10 ${confirmPassword && !passwordsMatch ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                  {confirmPassword && passwordsMatch && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading || !passwordsMatch || strength.score < 30}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                  ) : 'Update Password'}
                </Button>
              </form>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div className="space-y-5">
                <div className="text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <ShieldCheck className="h-9 w-9 text-green-600" />
                  </div>
                  <p className="text-slate-600 text-sm">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm">
                    For security, you've been signed out from all other devices.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => navigate('/login')} className="w-full">
                  Sign In with New Password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
