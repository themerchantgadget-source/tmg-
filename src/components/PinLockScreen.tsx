import React from 'react';
import { Delete, Lock } from 'lucide-react';
import { verifyPinSecret } from '../utils/vaultUtils';

interface PinLockScreenProps {
  pinHash: string;
  pinSalt: string;
  onUnlock: () => void;
}

export function PinLockScreen({
  pinHash,
  pinSalt,
  onUnlock,
}: PinLockScreenProps) {
  const [digits, setDigits] = React.useState('');
  const [shake, setShake] = React.useState(false);
  const [fails, setFails] = React.useState(0);
  const [lockedUntil, setLockedUntil] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [lockedUntil]);

  const waitSeconds = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const handleDigit = async (d: string) => {
    if (waitSeconds > 0 || digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      let ok = false;
      try {
        ok = await verifyPinSecret(next, pinHash, pinSalt);
      } catch {
        ok = false;
      }
      if (ok) {
        setDigits('');
        setFails(0);
        onUnlock();
      } else {
        const nextFails = fails + 1;
        setFails(nextFails);
        setShake(true);
        window.setTimeout(() => {
          setShake(false);
          setDigits('');
        }, 380);
        if (nextFails >= 3) {
          const delayMs = Math.min(30000, 2000 * 2 ** (nextFails - 3));
          setLockedUntil(Date.now() + delayMs);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[var(--page)] text-[var(--text)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[320px] text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--accent)]">
          <Lock size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Workspace Locked</h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            {waitSeconds > 0
              ? `Try again in ${waitSeconds}s`
              : 'Enter your 4-digit vault PIN'}
          </p>
        </div>

        <div
          className={`flex items-center justify-center gap-3 ${
            shake ? 'anim-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                i < digits.length
                  ? 'bg-[var(--accent)] border-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              type="button"
              disabled={waitSeconds > 0}
              onClick={() => void handleDigit(n)}
              className="h-14 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-lg font-semibold hover:bg-[var(--hover)] active:scale-95 transition-all"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={waitSeconds > 0}
            onClick={() => void handleDigit('0')}
            className="h-14 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-lg font-semibold hover:bg-[var(--hover)] active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            aria-label="Backspace"
            onClick={() => setDigits((d) => d.slice(0, -1))}
            className="h-14 rounded-2xl bg-[var(--card-alt)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--hover)]"
          >
            <Delete size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
