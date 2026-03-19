export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: "ออมทรัพย์" | "กระแสรายวัน";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
