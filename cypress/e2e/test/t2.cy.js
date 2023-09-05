describe('test2', () => {
  it('test2 nonParallel', { tags: ['testSmoke', 'nonParallel'] }, () => {
    cy.wait(1000);
  });
});
