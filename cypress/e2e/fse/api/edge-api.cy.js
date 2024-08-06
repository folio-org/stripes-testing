describe('fse-edge', () => {
  // all test steps are hidden from report in order to hide sensitive edge related data (api key). TODO: update to hide only api key

  it('TC195410 - edge-erm verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.allure().logCommandSteps(false);
    cy.postEdgeErm().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC195411 - edge-ncip verification', { tags: ['fse', 'api', 'edge'] }, () => {
    // Request body taken from https://github.com/folio-org/mod-ncip/tree/master/docs/sampleNcipMessages
    // UserIdentifierValue is specified as 'EBSCOSupport' in the requestBody

    const requestBody = `<?xml version="1.0" encoding="UTF-8"?>
    <NCIPMessage version="http://www.niso.org/schemas/ncip/v2_0/ncip_v2_0.xsd"
      xmlns="http://www.niso.org/2008/ncip">
      <LookupUser>
        <InitiationHeader>
          <FromAgencyId>
            <AgencyId>ReShare</AgencyId>
          </FromAgencyId>
          <ToAgencyId>
            <AgencyId>ReShare</AgencyId>
          </ToAgencyId>
        </InitiationHeader>
        <UserId>
          <AgencyId>Relais</AgencyId>
          <UserIdentifierValue>EBSCOSupport</UserIdentifierValue>
        </UserId>
        <UserElementType>Name Information</UserElementType>
        <UserElementType>User Address Information</UserElementType>
        <UserElementType>User Privilege</UserElementType>
        <UserElementType>User Id</UserElementType>
      </LookupUser>
    </NCIPMessage>`;
    cy.allure().logCommandSteps(false);
    cy.postEdgeNcip(requestBody).then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC195412 - edge-oai-pmh verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.allure().logCommandSteps(false);
    cy.getEdgeOai().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC195413 - edge-patron verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.allure().logCommandSteps(false);
    cy.getEdgePatron().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it('TC195414 - edge-orders verification', { tags: ['fse', 'api', 'edge'] }, () => {
    cy.allure().logCommandSteps(false);
    cy.postEdgeOrders().then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });

  it(
    `TC195415 - edge-rtac verification for ${Cypress.env('EDGE_HOST')}`,
    { tags: ['fse', 'api', 'edge'] },
    () => {
      cy.allure().logCommandSteps(false);
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
    },
  );
});
