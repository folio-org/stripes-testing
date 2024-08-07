import TopMenu from '../../../support/fragments/topMenu';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthorities';

describe('fse-marc-authority - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195332 - verify that marc authority page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'marc-auth'] },
    () => {
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthority.waitLoading();
    },
  );
});
