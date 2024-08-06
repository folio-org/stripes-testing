import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../support/fragments/consortium-manager/consortiumManagerApp';

describe('fse-consortia - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TCxxxxx - verify that consortium manager is displayed for the central tenant for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['consortia', 'fse', 'ui'] },
    () => {
      TopMenuNavigation.navigateToApp('Consortium manager');
      ConsortiumManager.verifyStatusOfConsortiumManager();
      ConsortiumManager.verifyMembersSelected();
    },
  );
});
