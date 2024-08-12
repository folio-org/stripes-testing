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
    `TC195511 - verify that consortium manager is displayed correctly for ${Cypress.env('OKAPI_HOST')}`,
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

  it(
    `TC195512 - switch active affiliation ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['consortia-sanity', 'central', 'fse', 'ui'] },
    () => {
      TopMenuNavigation.navigateToApp('Consortium manager');
      cy.getUserAffiliationsCount().then((count) => {
        if (count > 1) {
          // switch affiliation and verify that it was switched
          ConsortiumMgr.switchActiveAffiliation(tenantNames.college);
        } else {
          cy.log(
            `Can't switch affiliation since there's only one assigned to the user ${Cypress.env('diku_login')}`,
          );
        }
      });
    },
  );
});
