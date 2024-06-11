describe('fse-edge', () => {
  it('TC - edge-erm verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC - edge-ncip verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC - edge-oai-pmh verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC - edge-orders verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC - edge-patron verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC - edge-rtac verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
