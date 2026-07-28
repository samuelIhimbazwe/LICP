import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-slate-200'}`}
          />
        ))}
      </div>
      {password && <p className={`text-xs font-medium ${score < 3 ? 'text-red-600' : score === 3 ? 'text-yellow-600' : 'text-green-600'}`}>{labels[score]}</p>}
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
      <span className={met ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
    </div>
  );
}

export function SetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { getInvitation, acceptInvitation } = useAuth();
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getInvitation>>>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getInvitation(token)
      .then(setInvitation)
      .finally(() => setLoading(false));
  }, [token, getInvitation]);

  const requirements = [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { met: /[0-9]/.test(password), label: 'One number' },
    { met: /[^A-Za-z0-9]/.test(password), label: 'One special character' },
  ];
  const allMet = requirements.every(r => r.met);
  const passwordsMatch = password === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allMet) { setError('Password does not meet all requirements.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }
    if (!token) return;

    setError('');
    setSubmitting(true);
    const result = await acceptInvitation(token, password);
    setSubmitting(false);

    if (!result.success) {
      setError('Failed to set password. The invitation may have expired.');
      return;
    }

    if (result.requiresMFA) {
      navigate(`/setup-mfa/${token}`);
    } else {
      navigate('/login', { state: { message: 'Account created successfully! Please log in.' } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!invitation || invitation.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Link Invalid or Expired</h2>
          <p className="text-slate-600 mb-6">Please contact your administrator to resend the invitation.</p>
          <button onClick={() => navigate('/login')} className="w-full bg-brand text-brand-foreground py-3 rounded-lg hover:bg-brand/90 transition-colors font-medium">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2a26] px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-brand-foreground/70 text-sm">Step {invitation.requireMFA ? '1 of 2' : '1 of 1'}</p>
              <h1 className="font-bold text-lg">Set Your Password</h1>
            </div>
          </div>
          <p className="text-brand-foreground/80 text-sm">Welcome, {invitation.fullName}! Create a strong password for your account.</p>
        </div>

        {/* Progress */}
        <div className="px-8 pt-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold">1</div>
              <span className="text-sm font-medium text-brand">Set Password</span>
            </div>
            {invitation.requireMFA && (
              <>
                <div className="flex-1 h-px bg-slate-200" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-sm text-slate-400">Configure MFA</span>
                </div>
              </>
            )}
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                {invitation.requireMFA ? 3 : 2}
              </div>
              <span className="text-sm text-slate-400">Dashboard</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          {/* Account info reminder */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
            Setting password for: <span className="font-semibold text-foreground">{invitation.email}</span>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">New Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="Enter new password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && <StrengthBar password={password} />}
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="Confirm your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm && (
              <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                {passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          {/* Requirements */}
          <div className="border rounded-lg p-3 space-y-1.5 bg-slate-50">
            <p className="text-xs font-medium text-slate-600 mb-2">Password requirements:</p>
            {requirements.map((r, i) => <Requirement key={i} met={r.met} label={r.label} />)}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !allMet || !passwordsMatch}
            className="w-full bg-brand text-brand-foreground py-3 rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting password...</>
            ) : (
              <>{invitation.requireMFA ? 'Continue to MFA Setup' : 'Create Account'} <ArrowRight className="h-4 w-4" /></>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
            <Shield className="h-3 w-3" />
            <span>Your password is encrypted and stored securely</span>
          </div>
        </form>
      </div>
    </div>
  );
}
