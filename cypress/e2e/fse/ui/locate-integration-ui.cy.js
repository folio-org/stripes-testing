import LocateSearch from '../../../support/fragments/locate/locate-search';

describe('fse-locate-integration - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report - get api token for folio
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TCxxxx - Verify LOCATE search via instance received from related folio tenant for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['locate', 'fse', 'UI'] },
    () => {
      cy.getItems({ limit: 1, expandAll: true, query: 'status.name=Available' }).then((item) => {
        cy.log('Folio item title got from API: ' + item.title);
        cy.openLocateUiPage();
        // search by title got from folio response
        LocateSearch.searchBy('Title', item.title);
        LocateSearch.verifySearchResults(item.title);
      });
    },
  );
});
