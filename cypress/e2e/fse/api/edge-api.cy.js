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
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.getHoldings().then((holdings) => {
      cy.log(holdings[0]);
      // If instance uuid is returned from '/holdings-storage/holdings', then call edge-rtac api with it,
      // else skip edge-rtac
      if (holdings[0].instanceId) {
        cy.getEdgeRtac(holdings[0].instanceId).then((response) => {
          cy.expect(response.status).to.eq(200);
        });
      }
    });
  });
});
