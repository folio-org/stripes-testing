describe('fse-edge', () => {
  it('TC - edge-erm verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
