import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../support/fragments/topMenu';
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
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsEdit.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiUsersViewLoans.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [
              Permissions.inventoryAll.gui,
              Permissions.uiOrdersView.gui,
              Permissions.uiOrganizationsViewEditCreate.gui,
              Permissions.uiUsersViewLoans.gui,
            ],
          });
        })
        .then(() => {
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
      'C523641 No lists app permission in the member tenant - Consortium (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C523641'] },
      () => {
        // Step 1: Switch affiliation to member tenant
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        Login.verifyWelcomeTextExists();
        TopMenuNavigation.verifyNavigationItemAbsentOnTheBar(APPLICATION_NAMES.LISTS);

        // Step 2: Open the Lists app using the URL directly
        cy.visit(TopMenu.listsPath);
        Lists.verifyNoPermissionWarning();
      },
    );
  });
});
