describe('describe0', () => {
  it('test01', { tags: ['testtg', 'parallel', 'nonParallel'] }, () => {
    cy.task('log', '\t' + new Date().toLocaleTimeString());
    expect(true).to.equal(true);
  });
});
