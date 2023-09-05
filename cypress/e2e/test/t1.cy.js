describe('test1', () => {
  it('test1 nonParallel', { tags: ['testSmoke', 'nonParallel'] }, () => {
    cy.wait(1000);
  });
});
