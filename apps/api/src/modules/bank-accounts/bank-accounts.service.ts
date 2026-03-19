import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/providers/firebase.service';

export interface BankAccount {
  id?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountType: 'savings' | 'current';
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

@Injectable()
export class BankAccountsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll() {
    const snapshot = await this.firebase.firestore
      .collection('bankAccounts')
      .where('isDeleted', '!=', true)
      .orderBy('isDeleted')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async create(data: Omit<BankAccount, 'id'>) {
    const docRef = await this.firebase.firestore.collection('bankAccounts').add({
      ...data,
      isDeleted: false,
      createdAt: this.firebase.fieldValue.serverTimestamp(),
      updatedAt: this.firebase.fieldValue.serverTimestamp(),
    });
    return { id: docRef.id, ...data };
  }

  async update(id: string, data: Partial<BankAccount>) {
    const docRef = this.firebase.firestore.collection('bankAccounts').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Bank account not found');

    await docRef.update({
      ...data,
      updatedAt: this.firebase.fieldValue.serverTimestamp(),
    });
    return { id, ...doc.data(), ...data };
  }

  async softDelete(id: string) {
    const docRef = this.firebase.firestore.collection('bankAccounts').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Bank account not found');

    await docRef.update({
      isDeleted: true,
      updatedAt: this.firebase.fieldValue.serverTimestamp(),
    });
    return { success: true };
  }
}
