import { useState } from 'react';
import { ArrowLeft, Shield, Loader2, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';
import { useTonConnectUI, useTonWallet, toUserFriendlyAddress } from '@tonconnect/ui-react';
import { dlog } from '../../lib/debug-log';

// Convert TON to nanoTON (1 TON = 10^9 nanoTON)
const toNano = (amount: string | number): string => {
  const ton = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.floor(ton * 1_000_000_000).toString();
};

interface PaymentModalProps {
  amount: number;
  escrowAddress: string;
  dealLabel: string;
  dealId: number;
  /** Called after the TON transaction has been sent (not yet confirmed on-chain) */
  onPaymentSent: (dealId: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

type PaymentState = 'connect' | 'confirm' | 'processing' | 'success' | 'error';

export function PaymentModal({
  amount,
  escrowAddress,
  dealLabel,
  dealId,
  onPaymentSent,
  onConfirm,
  onClose,
}: PaymentModalProps) {
  dlog.info('PaymentScreen rendered', { amount, escrowAddress, dealId });
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [state, setState] = useState<PaymentState>(wallet ? 'confirm' : 'connect');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConnect = () => {
    tonConnectUI.openModal();
  };

  const handleConfirm = async () => {
    if (!wallet) {
      setState('connect');
      return;
    }

    setState('processing');
    setErrorMessage('');

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        network: '-3' as const, // testnet
        messages: [
          {
            address: escrowAddress,
            amount: toNano(amount.toString()).toString(),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      setState('success');
      onPaymentSent(dealId);
    } catch (error) {
      dlog.error('Transaction error:', error);
      setState('error');
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    }
  };

  const handleContinue = () => {
    onConfirm();
  };

  const handleRetry = () => {
    setState(wallet ? 'confirm' : 'connect');
    setErrorMessage('');
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Update state when wallet connects
  if (wallet && state === 'connect') {
    setState('confirm');
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-semibold">
          {state === 'connect' ? 'Connect Wallet' : state === 'confirm' ? 'Confirm Payment' : state === 'processing' ? 'Processing...' : state === 'success' ? 'Payment Sent' : 'Error'}
        </h1>
      </div>

      {/* Connect wallet state */}
      {state === 'connect' && (
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--ton-blue)]/15 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-[var(--ton-blue)]" />
            </div>
            <p className="text-lg font-semibold mb-2">Wallet Required</p>
            <p className="text-sm text-muted-foreground">
              Connect your TON wallet to complete this payment
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-semibold">{amount.toFixed(2)} TON</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">For</span>
              <span className="text-sm">{dealLabel}</span>
            </div>
          </div>

          <button
            onClick={handleConnect}
            className="w-full bg-[var(--ton-blue)] text-white rounded-xl py-4 font-semibold text-base flex items-center justify-center gap-2 hover:bg-[var(--ton-blue)]/90 transition-colors"
          >
            <Wallet className="w-5 h-5" />
            Connect TON Wallet
          </button>
          <button
            onClick={onClose}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Confirm state */}
      {state === 'confirm' && (
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--ton-blue)]/15 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[var(--ton-blue)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="text-3xl font-bold mb-1">{amount.toFixed(2)} TON</p>
            <p className="text-sm text-muted-foreground">{dealLabel}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">To (Escrow)</span>
              <span className="text-sm font-mono">
                {truncateAddress(escrowAddress)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-sm font-mono">
                {wallet?.account?.address
                  ? truncateAddress(toUserFriendlyAddress(wallet.account.address))
                  : 'Not connected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm font-medium">TON Testnet</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-[var(--success-green)]/10 rounded-lg mb-6">
            <Shield className="w-4 h-4 text-[var(--success-green)] flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Funds held in trustless TEE-managed escrow until conditions are met
            </p>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base hover:bg-primary/90 transition-colors"
          >
            Confirm & Sign Transaction
          </button>
          <button
            onClick={onClose}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Processing state */}
      {state === 'processing' && (
        <div className="p-6 text-center">
          <div className="py-8">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold mb-2">
              Waiting for transaction...
            </h2>
            <p className="text-sm text-muted-foreground">
              Confirm the transaction in your TON wallet
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[var(--success-green)]" />
              <span className="text-sm">Payment initiated</span>
            </div>
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                Confirming on blockchain...
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
              <span className="text-sm text-muted-foreground">
                Escrow deposit verified
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Success state */}
      {state === 'success' && (
        <div className="p-6 text-center">
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-[var(--success-green)]/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-[var(--success-green)]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Payment Confirmed!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              {amount.toFixed(2)} TON deposited to escrow
            </p>
            <p className="text-xs text-muted-foreground">
              Deal has been created successfully
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base hover:bg-primary/90 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="p-6 text-center">
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-[var(--error-red)]/15 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-[var(--error-red)]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Transaction Failed</h2>
            <p className="text-sm text-muted-foreground">
              {errorMessage || 'The transaction was rejected or timed out. Please try again.'}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
