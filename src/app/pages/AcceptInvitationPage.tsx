import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth, Invitation } from '../context/AuthContext';
import { Shield, Mail, User, Briefcase, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  compliance_officer: 'Compliance Officer',
  legal_practitioner: 'Legal Practitioner',
  manager: 'Manager',
  admin: 'Administrator',
};

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { getInvitation } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getInvitation(token)
      .then(setInvitation)
      .finally(() => setLoading(false));
  }, [token, getInvitation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation || invitation.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Invitation Invalid</h2>
          <p className="text-slate-600 mb-6">
            {!invitation
              ? 'This invitation link is not valid or does not exist.'
              : 'This invitation link has expired. Please contact your administrator to send a new invitation.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-brand text-brand-foreground py-3 rounded-lg hover:bg-brand/90 transition-colors font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Already Accepted</h2>
          <p className="text-slate-600 mb-6">This invitation has already been used to create an account. Please log in.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-brand text-brand-foreground py-3 rounded-lg hover:bg-brand/90 transition-colors font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d2a26] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2a26] px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-brand-foreground/70 text-sm">Legal Intelligence & Compliance Platform</p>
              <h1 className="font-bold text-lg">You're Invited!</h1>
            </div>
          </div>
          <p className="text-brand-foreground/80 text-sm">
            You have been invited to join the LICP platform. Accept the invitation below to create your account.
          </p>
        </div>

        {/* Invitation Details */}
        <div className="px-8 py-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-brand" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Full Name</p>
                <p className="font-semibold text-foreground">{invitation.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-brand" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Email Address</p>
                <p className="font-semibold text-foreground">{invitation.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 w-4 text-brand" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Assigned Role</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand">
                  {ROLE_LABELS[invitation.role] || invitation.role}
                </span>
              </div>
            </div>
            {invitation.organization && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Organization</p>
                  <p className="font-semibold text-foreground">{invitation.organization}</p>
                </div>
              </div>
            )}
          </div>

          {/* Expiry notice */}
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>
              This invitation expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>
            </span>
          </div>

          {/* MFA notice */}
          {invitation.requireMFA && (
            <div className="flex items-center gap-2 text-sm text-brand bg-brand/5 rounded-lg px-4 py-3">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span>Multi-factor authentication (MFA) will be required for your account.</span>
            </div>
          )}

          {/* Steps preview */}
          <div className="border rounded-xl p-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Account setup steps:</p>
            <div className="space-y-2">
              {['Set your password', ...(invitation.requireMFA ? ['Configure MFA'] : []), 'Access your dashboard'].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-6 h-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  {step}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate(`/set-password/${token}`)}
            className="w-full bg-brand text-brand-foreground py-3 rounded-lg hover:bg-brand/90 transition-colors font-medium flex items-center justify-center gap-2"
          >
            Accept Invitation & Set Password
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-brand hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
