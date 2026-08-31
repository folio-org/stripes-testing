import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import { APPLICATION_NAMES } from '../../../support/constants';
import Login from '../../../support/fragments/login/login';

const testData = {
  user: {},
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      // Create user in central tenant with NO Lists permission
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiUsersViewLoans.gui,
        // NOTE: NO Lists permission in central tenant
      ]).then((userProperties) => {
        testData.user = userProperties;

        // Affiliate user to College member tenant WITH Lists permission
        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: testData.user.userId,
          permissions: [
            Permissions.listsEdit.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiOrdersView.gui,
            Permissions.uiOrganizationsViewEditCreate.gui,
            Permissions.uiUsersViewLoans.gui,
          ],
        });

        // Affiliate user to University member tenant WITH Lists permission
        cy.affiliateUserToTenant({
          tenantId: Affiliations.University,
          userId: testData.user.userId,
          permissions: [
            Permissions.listsEdit.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiOrdersView.gui,
            Permissions.uiOrganizationsViewEditCreate.gui,
            Permissions.uiUsersViewLoans.gui,
          ],
        });

        cy.login(testData.user.username, testData.user.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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
      'C526776 No cross tenant queries are supported, when "List" app permissions are missing in the Central tenant - Consortium (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C526776'] },
      () => {
        Login.verifyWelcomeTextExists();

        // Step 1: Find the "Lists" app in the apps navbar
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.INVENTORY, true);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.LISTS, false);
      },
    );
  });
});
