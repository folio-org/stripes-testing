import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';

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
          cy.login(userData.username, userData.password);
        });
    });

    after('Delete users data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C398014 User created in central tenant is able to view the list of permission sets of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet'] },
      () => {
        TopMenuNavigation.navigateToApp('Consortium manager');
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyStatusOfSelectMembersModal();
        SelectMembers.checkMember(tenantNames.central);
        SelectMembers.checkMember(tenantNames.college);
        SelectMembers.checkMember(tenantNames.university);
        SelectMembers.saveAndClose();
      },
    );
  });
});
