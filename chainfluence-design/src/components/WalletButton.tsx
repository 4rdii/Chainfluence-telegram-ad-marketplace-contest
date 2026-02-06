import { useTonConnectUI, useTonWallet, toUserFriendlyAddress } from '@tonconnect/ui-react';
import { Wallet, LogOut, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface WalletButtonProps {
  variant?: 'full' | 'compact';
}

export function WalletButton({ variant = 'full' }: WalletButtonProps) {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [copied, setCopied] = useState(false);

  const handleConnect = () => {
    tonConnectUI.openModal();
  };

  const handleDisconnect = () => {
    tonConnectUI.disconnect();
  };

  // Convert raw address to user-friendly format
  const getFriendlyAddress = (rawAddress: string): string => {
    try {
      return toUserFriendlyAddress(rawAddress);
    } catch {
      return rawAddress;
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopy = () => {
    if (wallet?.account?.address) {
      const friendlyAddress = getFriendlyAddress(wallet.account.address);
      navigator.clipboard.writeText(friendlyAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Connected state
  if (wallet) {
    const rawAddress = wallet.account?.address || '';
    const address = getFriendlyAddress(rawAddress);

    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[var(--success-green)]/10 text-[var(--success-green)] px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-[var(--success-green)]" />
            <span className="text-xs font-medium">Connected</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="Disconnect"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--ton-blue)]/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[var(--ton-blue)]" />
            </div>
            <div>
              <p className="text-sm font-medium">TON Wallet</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--success-green)]" />
                <span className="text-xs text-[var(--success-green)]">Connected</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
          <span className="text-sm font-mono text-muted-foreground">
            {truncateAddress(address)}
          </span>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--success-green)]" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Disconnected state
  if (variant === 'compact') {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Wallet className="w-4 h-4" />
        Connect
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="w-full bg-[var(--ton-blue)] text-white rounded-xl py-4 font-semibold text-base flex items-center justify-center gap-2 hover:bg-[var(--ton-blue)]/90 transition-colors"
    >
      <Wallet className="w-5 h-5" />
      Connect TON Wallet
    </button>
  );
}
