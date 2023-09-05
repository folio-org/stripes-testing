describe('test3', () => {
  it('test31 nonParallel', { tags: ['testSmoke', 'nonParallel'] }, () => {
    cy.wait(1000);
  });

  it('test32 parallel', { tags: ['testSmoke'] }, () => {
    cy.wait(1000);
  });
});
