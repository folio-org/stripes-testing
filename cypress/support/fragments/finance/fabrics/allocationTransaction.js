export default class AllocationTransaction {
  constructor(amount, from, to, source, tags) {
    const allocation = 'Allocation';

    this.type = allocation;
    this.amount = amount;
    this.from = from;
    this.to = to;
    this.source = source;
    this.tags = tags;
  }
}
