describe('fse-locate-integration - API', () => {
  // all test steps are hidden from report in order to hide sensitive edge related data (api key). TODO: update to hide only api key

  before(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getLocateGuestToken();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195871 - edge-rtac verification for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate', 'locate-edge-rtac', 'TC195871'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
      // get any valid instance for the folio tenant
      cy.getInstance({ limit: 1, expandAll: true, query: 'id=*' }).then((instance) => {
        // check locate rtac call with related instance id
        cy.getLocateRtac(instance.id).then((response) => {
          cy.expect(response.status).to.eq(200);
        });
      });
    },
  );

  it(
    `TC195872 - edge-patron verification for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate', 'locate-edge-patron', 'TC195872'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
      // get any valid user with external system id for the folio tenant
      cy.getUsers({ limit: 1, query: 'externalSystemId==*' }).then((users) => {
        // check locate patron call with related user external system id
        cy.getLocatePatron(users[0].externalSystemId).then((response) => {
          cy.expect(response.status).to.eq(200);
        });
      });
    },
  );

  it(
    `TC195873 - check IDP url for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locateSso', 'TC195873'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.checkIdpUrl().then((response) => {
        cy.expect(response.status).to.eq(200);
        // Verify the Content-Type response header
        cy.expect(response.headers['content-type']).to.include('xml');
        // Verify the response body contains valid XML
        const responseBody = response.body;
        // Ensure response body starts with XML declaration
        expect(responseBody).to.match(/<\?xml/);
      });
    },
  );

  it(
    `TC195921 - check locate source type mappings for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate', 'TC195921'] },
    () => {
      const mappingsType = ['PRIMARY', 'SECONDARY'];
      // check source mappings for both types
      mappingsType.forEach((type) => {
        cy.checkLocateSourceTypeMapping(type).then((response) => {
          cy.expect(response.status).to.eq(200);
          cy.expect(response.body).to.have.property('mappings');
          cy.expect(response.body).to.have.property('order');
        });
      });
    },
  );

  it(
    `TC195922 - check locate note types mappings for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate', 'TC195922'] },
    () => {
      cy.checkLocateNoteTypesMappings().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('noteTypesForDisplay');
      });
    },
  );

  it(
    `TC195923 - check locate availability-mappings for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate', 'TC195923'] },
    () => {
      cy.checkLocateAvailabilityMappings().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195924 - check locate configuration features for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate', 'TC195924'] },
    () => {
      cy.checkLocateConfigurationFeatures().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('features');
      });
    },
  );

  it(
    `TC195975 - check Locate - DCB configuration ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate', 'dcb', 'TC195975'] },
    () => {
      const dcbVars = [
        Cypress.env('KEYCLOAK_SECRET'),
        Cypress.env('KEYCLOAK_ADMIN_PASSWORD'),
        Cypress.env('OPENRS_SERVICE_HOST'),
        Cypress.env('OPENRS_AUTH_HOST'),
        Cypress.env('OPENRS_LOCATE_SERVICE_HOST'),
      ];
      // check that all env variables for Locate-DCB integration are there
      dcbVars.forEach((val) => {
        assert.isNotNull(val);
        assert.isDefined(val);
        assert.isNotEmpty(val);
      });
    },
  );
});
