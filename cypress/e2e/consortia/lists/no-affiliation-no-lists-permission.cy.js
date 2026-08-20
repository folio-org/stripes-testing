import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import Login from '../../../support/fragments/login/login';
import { APPLICATION_NAMES } from '../../../support/constants';

const testData = {
  user: {},
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      // Create user in central tenant with NO Lists permission and NO affiliations to member tenants
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiUsersViewLoans.gui,
        // NOTE: NO Lists permission in central tenant
        // NOTE: NO affiliations to member tenants
      ]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      if (testData.user.userId) {
        Users.deleteViaApi(testData.user.userId);
      }
    });

    it(
      "C523642 User does not have tenant affiliation in member tenant, and doesn't have a list app and content permission - Consortium (consortia) (athena)",
      { tags: ['criticalPathECS', 'athena', 'C523642'] },
      () => {
        // Step 1: Login
        cy.login(testData.user.username, testData.user.password);
        Login.verifyWelcomeTextExists();

        // Step 2: Try to switch affiliation by clicking on user avatar
        // Verify there is NO way to switch affiliation (no member tenant access)
        ConsortiumManager.switchActiveAffiliationIsAbsent();
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.LISTS, false);
      },
    );
  });
});
