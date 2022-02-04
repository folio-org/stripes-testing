
export default class Transaction {
  constructor(type, amount, from, to, source, tags) {
    this.type = type;
    this.amount = amount;
    this.from = from;
    this.to = to;
    this.source = source;
    this.tags = tags;
  }
}
