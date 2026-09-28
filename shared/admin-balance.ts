export type BalanceTransactionType = "Added" | "Removed";

export interface BalanceTransaction {
  id: string;
  userId: string;
  amount: number;
  type: BalanceTransactionType;
  previousBalance: number;
  newBalance: number;
  adminId: string;
  adminNote: string | null;
  createdAt: string;
}

export interface AdjustBalanceInput {
  amount: number;
  note?: string;
}

export interface UserBalance {
  availableBalance: number;
}
