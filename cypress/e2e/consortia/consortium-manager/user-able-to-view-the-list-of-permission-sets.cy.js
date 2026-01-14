import { APPLICATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManager from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    let userData;

    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.consortiaSettingsConsortiumManagerView.gui,
        Permissions.uiUsersViewPermissionSets.gui,
      ])
        .then((userProperties) => {
          userData = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(userData.userId, [
            Permissions.uiUsersViewPermissionSets.gui,
          ]);
          cy.setTenant(Affiliations.Consortia);
          cy.assignAffiliationToUser(Affiliations.University, userData.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(userData.userId, [
            Permissions.uiUsersViewPermissionSets.gui,
          ]);
          cy.resetTenant();
          cy.login(userData.username, userData.password);
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    // not applicable
    it(
      'C398014 User created in central tenant is able to view the list of permission sets of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C398014'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.central, false);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, true);
        SelectMembers.saveAndClose();
        ConsortiumManager.openListInSettings('Users');
        ConsortiumManager.openListInOpenedPane('Users', 'Permission sets');
        ConsortiumManager.openListInOpenedPane('Permission sets', 'folio_admin');
        ConsortiumManager.collapseAll('folio_admin');
        ConsortiumManager.expandAll('folio_admin');
        ConsortiumManager.closeThirdPane('folio_admin');
        ConsortiumManager.clickActionsInPermissionSets();
        SelectMembers.selectMember(tenantNames.university);
        ConsortiumManager.openListInOpenedPane('Permission sets', 'folio_migration');
        ConsortiumManager.collapseAll('folio_migration');
        ConsortiumManager.expandAll('folio_migration');
        ConsortiumManager.closeThirdPane('folio_migration');
        ConsortiumManager.clickActionsInPermissionSets();
      },
    );
  });
});
