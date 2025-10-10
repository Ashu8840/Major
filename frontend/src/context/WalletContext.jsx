import { createContext, useContext, useEffect, useMemo, useState } from "react";

const MAX_BALANCE = 5000;
const TOP_UP_AMOUNT = 1000;

const WalletContext = createContext(null);

const parseStoredBalance = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem("walletBalance");
    const parsed = Number.parseInt(raw ?? "0", 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, MAX_BALANCE);
  } catch {
    return 0;
  }
};

export function WalletProvider({ children }) {
  const [balance, setBalance] = useState(() => parseStoredBalance());

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem("walletBalance", String(balance));
  }, [balance]);

  const canTopUp = balance + TOP_UP_AMOUNT <= MAX_BALANCE;

  const topUp = () => {
    if (!canTopUp) {
      return { success: false, reason: "limit" };
    }

    const next = Math.min(balance + TOP_UP_AMOUNT, MAX_BALANCE);
    const delta = next - balance;
    setBalance(next);
    return { success: true, amount: delta };
  };

  const addFunds = (amount) => {
    const value = Number(amount) || 0;
    if (value <= 0) return { success: true, amount: 0 };
    const next = Math.min(balance + value, MAX_BALANCE);
    const delta = next - balance;
    setBalance(next);
    return { success: true, amount: delta };
  };

  const hasEnough = (amount) => {
    const value = Number(amount) || 0;
    if (value <= 0) return true;
    return balance >= value;
  };

  const deduct = (amount) => {
    const value = Number(amount) || 0;
    if (value <= 0) {
      return { success: true, remaining: balance };
    }
    if (value > balance) {
      return { success: false, remaining: balance };
    }

    setBalance((prev) => Math.max(prev - value, 0));
    return { success: true, remaining: balance - value };
  };

  const value = useMemo(
    () => ({
      balance,
      maxBalance: MAX_BALANCE,
      topUpAmount: TOP_UP_AMOUNT,
      canTopUp,
      topUp,
      addFunds,
      deduct,
      hasEnough,
    }),
    [balance, canTopUp]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
