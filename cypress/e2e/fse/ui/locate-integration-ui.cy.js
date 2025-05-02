import LocateSearch from '../../../support/fragments/locate/locate-search';
import LocateSearchResults from '../../../support/fragments/locate/locate-search-results';

describe('fse-locate-integration - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report - get api token for folio
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195869 - Verify LOCATE catalog home page ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['locate', 'fse', 'UI'] },
    () => {
      cy.openLocateUiPage();
      // click on catalog home link
      LocateSearch.clickOnHomeButton();
      LocateSearch.verifyHomePageDisplayed();
    },
  );

  it(
    `TC195870 - Verify LOCATE search via instance received from related folio tenant for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['locate', 'fse', 'UI'] },
    () => {
      cy.getItems({ limit: 1, expandAll: true, query: 'status.name=Available' }).then((item) => {
        cy.log('Folio item title got from API: ' + item.title);
        cy.openLocateUiPage();
        // search by title got from folio response
        LocateSearch.searchBy('Title', item.title);
        LocateSearchResults.verifySearchResults(item.title);
      });
    },
  );
});
