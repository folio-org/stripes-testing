export default class PendingTransaction {
  constructor(amount, from, to, source, tags) {
    const pending = 'Pending payment';

    this.type = pending;
    this.amount = amount;
    this.from = from;
    this.to = to;
    this.source = source;
    this.tags = tags;
  }
}
