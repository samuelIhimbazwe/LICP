import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { Mail, UserPlus, CheckCircle, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth, ApiError } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { UserRole } from '../../types';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

export function InviteUserDialog({ open, onOpenChange, onInvited }: InviteUserDialogProps) {
  const navigate = useNavigate();
  const { createInvitation } = useAuth();
  const [step, setStep] = useState<'details' | 'permissions' | 'confirmation' | 'sent'>('details');
  const [invitationLink, setInvitationLink] = useState('');
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [emailReady, setEmailReady] = useState<boolean | null>(null);
  const [emailSetupError, setEmailSetupError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    organization: '',
    department: '',
    requireMFA: true,
    sendWelcomeEmail: true,
    customMessage: '',
    expirationDays: '7'
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 'details') {
      if (!formData.fullName || !formData.email || !formData.role) {
        toast.error('Please fill in all required fields');
        return;
      }
      setStep('permissions');
    } else if (step === 'permissions') {
      setStep('confirmation');
    }
  };

  const handleBack = () => {
    if (step === 'permissions') {
      setStep('details');
    } else if (step === 'confirmation') {
      setStep('permissions');
    }
  };

  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const status = await apiRequest<{ configured: boolean; error?: string; mode?: string }>(
          '/org/email/status?fresh=1'
        );
        setEmailReady(status.configured);
        setEmailSetupError(status.configured ? null : status.error ?? 'SMTP is not configured.');
      } catch {
        setEmailReady(null);
        setEmailSetupError(null);
      }
    })();
  }, [open]);

  const handleSendInvitation = async () => {
    if (emailReady === false) {
      toast.error('Email is not configured yet.', {
        description: 'Set up Gmail SMTP first, then send the invitation.',
      });
      return;
    }
    setSending(true);
    try {
      const result = await createInvitation({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role as UserRole,
        organization: formData.organization || undefined,
        department: formData.department || undefined,
        requireMFA: true,
        expirationDays: parseInt(formData.expirationDays),
      });
      const link = `${window.location.origin}/accept-invitation/${result.token}`;
      setInvitationLink(link);
      setEmailPreviewUrl(result.previewUrl ?? null);
      setEmailDelivered(result.emailSent !== false);
      setStep('sent');
      onInvited?.();
      toast.success(`Invitation email sent to ${formData.email}`, {
        description: `${formData.fullName} will receive a secure link to set up their account.`,
        icon: <Mail className="h-4 w-4" />,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, {
          description:
            err.status === 503
              ? 'Run npm run setup:email with your Gmail app password, or save SMTP in System Settings → Email.'
              : undefined,
        });
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: '',
      organization: '',
      department: '',
      requireMFA: true,
      sendWelcomeEmail: true,
      customMessage: '',
      expirationDays: '7'
    });
    setStep('details');
    setInvitationLink('');
    setEmailPreviewUrl(null);
    setEmailDelivered(false);
    onOpenChange(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(invitationLink).catch(() => {});
    toast.success('Invitation link copied!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            {step === 'details' && 'Enter the user details and contact information'}
            {step === 'permissions' && 'Configure role and permissions for the new user'}
            {step === 'confirmation' && 'Review and send the invitation'}
            {step === 'sent' && 'Invitation email delivered'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {emailReady === false && step !== 'sent' && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[13px]">
                Outbound email is not configured. Invitations cannot be sent until you set up Gmail SMTP in{' '}
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/system-settings');
                  }}
                >
                  System Settings → Email
                </button>
                {emailSetupError ? ` (${emailSetupError})` : ''}
              </AlertDescription>
            </Alert>
          )}

          {/* Success step */}
          {step === 'sent' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1">Invitation email sent</h3>
                <p className="text-slate-500 text-sm">
                  We sent an invitation to <strong>{formData.email}</strong>. They should check their inbox
                  (and spam folder) for a message from LICP with a link to create their account.
                </p>
              </div>

              {emailPreviewUrl && (
                <Button variant="secondary" className="w-full" onClick={() => window.open(emailPreviewUrl, '_blank')}>
                  <Mail className="mr-2 h-4 w-4" />
                  Open email preview (dev)
                </Button>
              )}

              <details className="border rounded-lg p-3 text-sm text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700">Admin: copy invitation link</summary>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    readOnly
                    value={invitationLink}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded px-3 py-2 text-slate-700 font-mono truncate"
                  />
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(invitationLink, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Expires in {formData.expirationDays} days.</p>
              </details>

              <div className="border rounded-lg p-4 bg-brand/5">
                <p className="text-sm font-medium text-brand mb-2">What the user will experience:</p>
                <div className="space-y-1.5 text-sm text-brand">
                  {['Accept invitation & review account details', 'Set a secure password', ...(formData.requireMFA ? ['Configure multi-factor authentication'] : []), 'Access the role-based dashboard'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {step !== 'sent' && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${step === 'details' ? 'bg-brand text-brand-foreground' : 'bg-brand/10 text-brand'}`}>
                  1
                </div>
                <span className="text-sm font-medium">Details</span>
              </div>
              <div className="flex-1 h-px bg-slate-200 mx-2" />
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${step === 'permissions' ? 'bg-brand text-brand-foreground' : step === 'confirmation' ? 'bg-brand/10 text-brand' : 'bg-slate-200 text-slate-600'}`}>
                  2
                </div>
                <span className="text-sm font-medium">Permissions</span>
              </div>
              <div className="flex-1 h-px bg-slate-200 mx-2" />
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${step === 'confirmation' ? 'bg-brand text-brand-foreground' : 'bg-slate-200 text-slate-600'}`}>
                  3
                </div>
                <span className="text-sm font-medium">Confirm</span>
              </div>
            </div>
          )}

          {/* Step 1: User Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invite-fullname">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="invite-fullname"
                    placeholder="Enter full name"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invite-email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invite-phone">Phone</Label>
                  <Input
                    id="invite-phone"
                    placeholder="+250788000000"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invite-role">
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                    <SelectTrigger id="invite-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                      <SelectItem value="legal_practitioner">Legal Practitioner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invite-org">Organization</Label>
                  <Input
                    id="invite-org"
                    placeholder="Organization name"
                    value={formData.organization}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invite-dept">Department</Label>
                  <Input
                    id="invite-dept"
                    placeholder="Department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Permissions & Security */}
          {step === 'permissions' && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Security Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Multi-Factor Authentication</Label>
                        <p className="text-sm text-slate-600">Required for all invited users — cannot be disabled</p>
                      </div>
                      <Checkbox checked={true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Send Welcome Email</Label>
                        <p className="text-sm text-slate-600">Send onboarding email with platform guide</p>
                      </div>
                      <Checkbox
                        checked={formData.sendWelcomeEmail}
                        onCheckedChange={(checked) => handleInputChange('sendWelcomeEmail', checked as boolean)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="expiration">Invitation Expiration</Label>
                  <Select value={formData.expirationDays} onValueChange={(value) => handleInputChange('expirationDays', value)}>
                    <SelectTrigger id="expiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days (recommended)</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                  <Textarea
                    id="custom-message"
                    placeholder="Add a personalized message to the invitation email..."
                    value={formData.customMessage}
                    onChange={(e) => handleInputChange('customMessage', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirmation' && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-brand/5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-brand mt-1" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">Review Invitation Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-slate-600">Name:</span>
                        <span className="font-medium">{formData.fullName}</span>
                        <span className="text-slate-600">Email:</span>
                        <span className="font-medium">{formData.email}</span>
                        {formData.phone && (
                          <>
                            <span className="text-slate-600">Phone:</span>
                            <span className="font-medium">{formData.phone}</span>
                          </>
                        )}
                        <span className="text-slate-600">Role:</span>
                        <span className="font-medium capitalize">{formData.role.replace('_', ' ')}</span>
                        {formData.organization && (
                          <>
                            <span className="text-slate-600">Organization:</span>
                            <span className="font-medium">{formData.organization}</span>
                          </>
                        )}
                        {formData.department && (
                          <>
                            <span className="text-slate-600">Department:</span>
                            <span className="font-medium">{formData.department}</span>
                          </>
                        )}
                        <span className="text-slate-600">MFA Required:</span>
                        <span className="font-medium">Yes (mandatory)</span>
                        <span className="text-slate-600">Welcome Email:</span>
                        <span className="font-medium">{formData.sendWelcomeEmail ? 'Yes' : 'No'}</span>
                        <span className="text-slate-600">Expires in:</span>
                        <span className="font-medium">{formData.expirationDays} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <h4 className="font-medium mb-2">What happens next?</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-brand mt-1">1.</span>
                    <span>An invitation email will be sent to {formData.email}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand mt-1">2.</span>
                    <span>The user will receive a secure link to create their account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand mt-1">3.</span>
                    <span>They'll set their password and configure MFA (required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand mt-1">4.</span>
                    <span>The invitation will expire after {formData.expirationDays} days</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            {step === 'sent' ? (
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            ) : (
              <>
                <div>
                  {step !== 'details' && (
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  {step !== 'confirmation' ? (
                    <Button onClick={handleNext}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handleSendInvitation} disabled={sending || emailReady === false}>
                      <Mail className="mr-2 h-4 w-4" />
                      {sending ? 'Sending…' : 'Send Invitation'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
