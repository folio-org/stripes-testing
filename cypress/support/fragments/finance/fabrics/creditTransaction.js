export default class CreditTransaction {
  constructor(amount, from, to, source, tags) {
    const credit = 'Credit';

    this.type = credit;
    this.amount = amount;
    this.from = from;
    this.to = to;
    this.source = source;
    this.tags = tags;
  }
}
