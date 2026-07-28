import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Shield, Smartphone, Key, CheckCircle, Copy, ArrowRight, RefreshCw } from 'lucide-react';

const DEFAULT_BACKUP_CODES = [
  '8F4K-2M9P', 'X7N3-QR5T', 'L6W8-YB2C', 'H9D1-VG4Z',
  'M2K7-FN6R', 'T5P3-WX8Q', 'B4J9-DH1S', 'G6R2-KL7A',
];

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.split('').concat(Array(6 - value.length).fill(''));

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !digits[idx]) {
      const el = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement;
      el?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    const newVal = next.join('').slice(0, 6);
    onChange(newVal);
    if (char && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement;
      el?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          className="w-11 h-12 text-center border-2 border-slate-300 rounded-lg focus:outline-none focus:border-brand text-lg font-bold transition-colors"
        />
      ))}
    </div>
  );
}

export function SetupMFAPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { completeAccountSetup, pendingToken, getInvitation } = useAuth();
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getInvitation>>>(null);

  useEffect(() => {
    if (!token) return;
    getInvitation(token).then(setInvitation).catch(() => setInvitation(null));
  }, [token, getInvitation]);

  const mfaSecret = sessionStorage.getItem('licp_mfa_setup_secret') ?? 'JBSWY3DPEHPK3PXP';
  const storedBackup = sessionStorage.getItem('licp_mfa_backup_codes')?.split(',').filter(Boolean);
  const displayBackupCodes = storedBackup?.length ? storedBackup : DEFAULT_BACKUP_CODES;

  const [tab, setTab] = useState<'app' | 'backup'>('app');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [backupSaved, setBackupSaved] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(mfaSecret).catch(() => {});
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(displayBackupCodes.join('\n')).catch(() => {});
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError('Please enter a 6-digit code.'); return; }
    if (!token) return;
    if (!token || !pendingToken) {
      setError('Setup session expired. Please restart invitation flow.');
      setSubmitting(false);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await completeAccountSetup(token, code, pendingToken);
      navigate('/login', { state: { message: 'Account setup complete. Verify your email, then log in.' } });
    } catch {
      setError('Invalid code. Enter the 6-digit code from your authenticator app.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2a26] px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-brand-foreground/70 text-sm">Step 2 of 2</p>
              <h1 className="font-bold text-lg">Configure Multi-Factor Authentication</h1>
            </div>
          </div>
          <p className="text-brand-foreground/80 text-sm">
            {invitation ? `Welcome, ${invitation.fullName}! ` : ''}Secure your account with an authenticator app.
          </p>
        </div>

        {/* Progress */}
        <div className="px-8 pt-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="text-sm text-slate-500">Password Set</span>
            </div>
            <div className="flex-1 h-px bg-brand" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <span className="text-sm font-medium text-brand">Configure MFA</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <span className="text-sm text-slate-400">Dashboard</span>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-4">
          {/* Tabs */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setTab('app')}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${tab === 'app' ? 'bg-brand text-brand-foreground' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Smartphone className="h-4 w-4" /> Authenticator App
            </button>
            <button
              onClick={() => setTab('backup')}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${tab === 'backup' ? 'bg-brand text-brand-foreground' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Key className="h-4 w-4" /> Backup Codes
            </button>
          </div>

          {tab === 'app' && (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="space-y-2 text-sm text-slate-600">
                <p className="font-medium text-slate-800">Set up your authenticator:</p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Install an authenticator app (Google Authenticator, Authy, Microsoft Authenticator)</li>
                  <li>Scan the QR code below, or enter the secret key manually</li>
                  <li>Enter the 6-digit code from your app to verify</li>
                </ol>
              </div>

              {/* QR code mockup */}
              <div className="flex justify-center">
                <div className="bg-white border-2 border-slate-200 rounded-xl p-4 inline-block">
                  {/* Stylized QR code placeholder */}
                  <div className="w-36 h-36 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Corner squares */}
                      <rect x="5" y="5" width="25" height="25" rx="2" fill="none" stroke="#1e40af" strokeWidth="3"/>
                      <rect x="10" y="10" width="15" height="15" rx="1" fill="#1e40af"/>
                      <rect x="70" y="5" width="25" height="25" rx="2" fill="none" stroke="#1e40af" strokeWidth="3"/>
                      <rect x="75" y="10" width="15" height="15" rx="1" fill="#1e40af"/>
                      <rect x="5" y="70" width="25" height="25" rx="2" fill="none" stroke="#1e40af" strokeWidth="3"/>
                      <rect x="10" y="75" width="15" height="15" rx="1" fill="#1e40af"/>
                      {/* Data pattern */}
                      {[35,40,45,50,55,60,65].map(x =>
                        [10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90].map(y =>
                          Math.random() > 0.5 ? <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#1e40af" opacity={0.7}/> : null
                        )
                      )}
                      {[10,15,20,25,30].map(x =>
                        [40,45,50,55,60,65].map(y =>
                          Math.random() > 0.5 ? <rect key={`r-${x}-${y}`} x={x} y={y} width="4" height="4" fill="#1e40af" opacity={0.7}/> : null
                        )
                      )}
                      {/* Center logo */}
                      <rect x="40" y="40" width="20" height="20" rx="2" fill="white"/>
                      <rect x="43" y="43" width="14" height="14" rx="1" fill="#1e40af"/>
                      <rect x="46" y="46" width="8" height="8" rx="1" fill="white"/>
                    </svg>
                  </div>
                  <p className="text-xs text-center text-slate-500 mt-2">Scan with your app</p>
                </div>
              </div>

              {/* Manual entry */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1.5">Or enter manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-800 tracking-wider">
                    {mfaSecret}
                  </code>
                  <button onClick={copySecret} className="text-brand hover:text-brand p-1.5">
                    {copiedSecret ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Code input */}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 text-center mb-3">
                    Enter 6-digit verification code
                  </label>
                  <OTPInput value={code} onChange={setCode} />
                  <p className="text-xs text-center text-slate-400 mt-2">Demo: enter any 6 digits</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || code.length !== 6}
                  className="w-full bg-brand text-brand-foreground py-3 rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</>
                  ) : (
                    <>Verify & Complete Setup <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </form>
            </div>
          )}

          {tab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <p className="font-medium mb-1">Save these backup codes!</p>
                <p>Each code can only be used once. Store them in a safe place in case you lose access to your authenticator app.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {displayBackupCodes.map((code, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center font-mono text-sm text-slate-800">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyBackupCodes}
                  className="flex-1 flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {copiedCodes ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copiedCodes ? 'Copied!' : 'Copy All'}
                </button>
                <button
                  onClick={() => setBackupSaved(true)}
                  className="flex-1 flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> Regenerate
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saved-codes"
                  checked={backupSaved}
                  onChange={e => setBackupSaved(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="saved-codes" className="text-sm text-slate-600">
                  I have saved my backup codes in a safe place
                </label>
              </div>

              <button
                disabled={!backupSaved}
                onClick={() => setTab('app')}
                className="w-full bg-brand text-brand-foreground py-3 rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                Continue to Authenticator Setup <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
