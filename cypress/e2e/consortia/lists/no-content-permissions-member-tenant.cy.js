import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const testData = {
  user: {},
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      // Create user in central tenant with full permissions
      cy.createTempUser([Permissions.listsEdit.gui, Permissions.inventoryAll.gui])
        .then((userProperties) => {
          testData.user = userProperties;

          // Affiliate user to College tenant with ONLY Lists permission (NO content permissions)
          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.listsEdit.gui],
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
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
      'C523640 User has a tenant affiliation for member tenant, list app permission in member tenant, but no content permissions - Consortium (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C523640'] },
      () => {
        // Step 1: Switch affiliation to member tenant
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        Lists.verifyNoEntityTypePermissionsWarning();
      },
    );
  });
});
