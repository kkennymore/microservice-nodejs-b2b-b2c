// Interfaces for transactions service
export interface Transaction {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'paypal' | 'wallet' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  shippingMethod?: string;
  shippingCost?: number;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productSnapshot: Record<string, unknown>;
  createdAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  orderId: string;
  sellerId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// DTOs for transaction operations
export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  shippingMethod?: string;
}

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export interface ProcessPaymentDto {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'paypal' | 'wallet' | 'bank_transfer';
  billingAddress: Address;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface WalletDepositDto {
  amount: number;
  paymentMethod: string;
  description?: string;
}

export interface WalletWithdrawalDto {
  amount: number;
  bankAccount?: BankAccountDetails;
  description?: string;
}

export interface BankAccountDetails {
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  swiftCode?: string;
}