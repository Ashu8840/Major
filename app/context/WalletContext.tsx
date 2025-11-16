import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_BALANCE = 5000;
const TOP_UP_AMOUNT = 1000;
const STORAGE_KEY = "walletBalance";

interface WalletContextType {
  balance: number;
  maxBalance: number;
  topUpAmount: number;
  canTopUp: boolean;
  topUp: () => { success: boolean; reason?: string; amount?: number };
  addFunds: (amount: number) => { success: boolean; amount: number };
  deduct: (amount: number) => { success: boolean; remaining: number };
  hasEnough: (amount: number) => boolean;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load balance from storage on mount
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const storedBalance = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedBalance !== null) {
          const parsed = Number.parseInt(storedBalance, 10);
          if (Number.isFinite(parsed) && parsed >= 0) {
            setBalance(Math.min(parsed, MAX_BALANCE));
          }
        }
      } catch (error) {
        console.warn("Failed to load wallet balance:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBalance();
  }, []);

  // Save balance to storage whenever it changes
  useEffect(() => {
    if (isLoading) return;
    const saveBalance = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, String(balance));
      } catch (error) {
        console.warn("Failed to save wallet balance:", error);
      }
    };
    saveBalance();
  }, [balance, isLoading]);

  const canTopUp = balance + TOP_UP_AMOUNT <= MAX_BALANCE;

  const topUp = useCallback(() => {
    if (!canTopUp) {
      return { success: false, reason: "limit" };
    }

    const next = Math.min(balance + TOP_UP_AMOUNT, MAX_BALANCE);
    const delta = next - balance;
    setBalance(next);
    return { success: true, amount: delta };
  }, [balance, canTopUp]);

  const addFunds = useCallback(
    (amount: number) => {
      const value = Number(amount) || 0;
      if (value <= 0) return { success: true, amount: 0 };
      const next = Math.min(balance + value, MAX_BALANCE);
      const delta = next - balance;
      setBalance(next);
      return { success: true, amount: delta };
    },
    [balance]
  );

  const hasEnough = useCallback(
    (amount: number) => {
      const value = Number(amount) || 0;
      if (value <= 0) return true;
      return balance >= value;
    },
    [balance]
  );

  const deduct = useCallback(
    (amount: number) => {
      const value = Number(amount) || 0;
      if (value <= 0) {
        return { success: true, remaining: balance };
      }
      if (value > balance) {
        return { success: false, remaining: balance };
      }

      const newBalance = Math.max(balance - value, 0);
      setBalance(newBalance);
      return { success: true, remaining: newBalance };
    },
    [balance]
  );

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
      isLoading,
    }),
    [balance, canTopUp, topUp, addFunds, deduct, hasEnough, isLoading]
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
