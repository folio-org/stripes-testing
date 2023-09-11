import PendingTransaction from './pendingTransaction';
import CreditTransaction from './creditTransaction';
import AllocationTransaction from './allocationTransaction';

export default class Transaction {
  create(type, amount, from, to, source, tags) {
    let transaction;
    if (type.toLowerCase() === 'pending') {
      transaction = new PendingTransaction(amount, from, to, source, tags);
    } else if (type.toLowerCase() === 'credit') {
      transaction = new CreditTransaction(amount, from, to, source, tags);
    } else if (type.toLowerCase() === 'allocation') {
      transaction = new AllocationTransaction(amount, from, to, source, tags);
    }
    return transaction;
  }
}
