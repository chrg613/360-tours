import { useState } from 'react';
import {
  Globe,
  Check,
  AlertCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Badge,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { copyToClipboard } from '@/utils/copyToClipboard';

interface CustomDomainSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDomain?: string;
  verificationStatus?: 'pending' | 'verifying' | 'verified' | 'failed';
  sslStatus?: 'pending' | 'provisioning' | 'active' | 'failed';
  onAddDomain: (domain: string) => Promise<void>;
  onVerifyDomain: () => Promise<void>;
  onRemoveDomain: () => Promise<void>;
  isLoading?: boolean;
}

// DNS record info for verification
const DNS_RECORDS = {
  cname: {
    type: 'CNAME',
    name: 'tours',
    value: 'custom.360viewer.app',
  },
  verification: {
    type: 'TXT',
    name: '_360viewer-verification',
    value: '', // Will be filled with user-specific value
  },
};

export function CustomDomainSetup({
  open,
  onOpenChange,
  currentDomain,
  verificationStatus = 'pending',
  sslStatus = 'pending',
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
  isLoading = false,
}: CustomDomainSetupProps) {
  const [domain, setDomain] = useState(currentDomain || '');
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isLoading || isAdding || isVerifying || isRemoving;

  // Generate verification code based on domain.
  // SECURITY: The current implementation is deterministic and reversible.
  // TODO: Move verification code generation to the server-side API endpoint
  // (POST /domains/verify) so the code is cryptographically random and
  // cannot be forged by an attacker who knows the domain.
  const verificationCode = domain
    ? `360viewer-verify-${btoa(domain).slice(0, 16)}`
    : '';

  const handleAddDomain = async () => {
    if (!domain) return;

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      setError('Please enter a valid domain name (e.g., tours.yourcompany.com)');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await onAddDomain(domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      await onVerifyDomain();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setError(null);

    try {
      await onRemoveDomain();
      setDomain('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove domain');
    } finally {
      setIsRemoving(false);
    }
  };



  const getVerificationStatusBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'verifying':
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            Verifying
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getSSLStatusBadge = () => {
    switch (sslStatus) {
      case 'active':
        return (
          <Badge variant="success">
            <Shield className="h-3 w-3 mr-1" />
            SSL Active
          </Badge>
        );
      case 'provisioning':
        return (
          <Badge variant="warning">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Provisioning SSL
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            SSL Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Awaiting Verification
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domain Setup
          </DialogTitle>
          <DialogDescription>
            Connect your own domain to serve tours from your branded URL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Domain input */}
          {!currentDomain ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Your Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toLowerCase())}
                    placeholder="tours.yourcompany.com"
                    className="flex-1"
                    disabled={isBusy}
                  />
                  <Button onClick={handleAddDomain} isLoading={isAdding || isLoading} disabled={isBusy}>
                    Add Domain
                  </Button>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  We recommend using a subdomain like "tours" or "virtual-tours"
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Benefits */}
              <div className="rounded-lg bg-[var(--color-surface-elevated)] p-4">
                <h4 className="font-medium mb-3">Benefits of Custom Domain</h4>
                <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--color-success-500)]" />
                    Brand recognition with your own URL
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--color-success-500)]" />
                    Free SSL certificate included
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--color-success-500)]" />
                    Professional appearance for clients
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--color-success-500)]" />
                    SEO benefits for your domain
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Domain status */}
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">{currentDomain}</p>
                    <a
                      href={`https://${currentDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--color-primary-500)] hover:underline flex items-center gap-1"
                    >
                      Visit site <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {getVerificationStatusBadge()}
                    {getSSLStatusBadge()}
                  </div>
                </div>

                {verificationStatus !== 'verified' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerify}
                      isLoading={isVerifying || isLoading}
                      disabled={isBusy}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Check Verification
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemove}
                      isLoading={isRemoving || isLoading}
                      disabled={isBusy}
                      className="text-[var(--color-error-500)]"
                    >
                      Remove Domain
                    </Button>
                  </div>
                )}

                {verificationStatus === 'verified' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemove}
                    isLoading={isRemoving || isLoading}
                    disabled={isBusy}
                    className="text-[var(--color-error-500)]"
                  >
                    Remove Domain
                  </Button>
                )}
              </div>

              {/* DNS Configuration Instructions */}
              {verificationStatus !== 'verified' && (
                <div className="space-y-4">
                  <h4 className="font-medium">DNS Configuration Required</h4>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Add the following DNS records to your domain registrar to verify ownership and
                    point your domain to our servers.
                  </p>

                  {/* CNAME Record */}
                  <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
                    <div className="bg-[var(--color-surface-elevated)] px-4 py-2 border-b border-[var(--color-border)]">
                      <span className="font-medium text-sm">1. CNAME Record</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-[var(--color-text-muted)]">Type</Label>
                          <p className="font-mono">{DNS_RECORDS.cname.type}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-[var(--color-text-muted)]">
                            Name/Host
                          </Label>
                          <p className="font-mono">{currentDomain.split('.')[0]}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-[var(--color-text-muted)]">Value</Label>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm truncate">{DNS_RECORDS.cname.value}</p>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyToClipboard(DNS_RECORDS.cname.value)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TXT Record */}
                  <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
                    <div className="bg-[var(--color-surface-elevated)] px-4 py-2 border-b border-[var(--color-border)]">
                      <span className="font-medium text-sm">2. TXT Record (Verification)</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-[var(--color-text-muted)]">Type</Label>
                          <p className="font-mono">{DNS_RECORDS.verification.type}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-[var(--color-text-muted)]">
                            Name/Host
                          </Label>
                          <p className="font-mono">{DNS_RECORDS.verification.name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-[var(--color-text-muted)]">Value</Label>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm truncate">{verificationCode}</p>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyToClipboard(verificationCode)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      DNS changes can take up to 48 hours to propagate. We'll automatically check
                      for verification periodically.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Verified success message */}
              {verificationStatus === 'verified' && sslStatus === 'active' && (
                <Alert variant="success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Your custom domain is fully configured and active. All your tours are now
                    accessible at{' '}
                    <a
                      href={`https://${currentDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline"
                    >
                      {currentDomain}
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
