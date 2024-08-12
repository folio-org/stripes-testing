import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import ConsortiumManagerApp from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumMgr from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../support/dictionary/affiliations';

describe('fse-consortia - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195511 - verify that consortium manager and user affiliations ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['consortia-sanity', 'central', 'fse', 'ui'] },
    () => {
      TopMenuNavigation.navigateToApp('Consortium manager');
      ConsortiumMgr.checkCurrentTenantInTopMenu(tenantNames.central);
      cy.getUserAffiliationsCount().then((count) => {
        ConsortiumManagerApp.verifyStatusOfConsortiumManager(count);
        if (count > 1) {
          ConsortiumMgr.switchActiveAffiliationExists();
        } else {
          ConsortiumMgr.switchActiveAffiliationIsAbsent();
        }
      });
    },
  );
});
