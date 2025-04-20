// import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations from // { tenantNames }
  '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
// import ConsortiumManagerApp, {
//   settingsItems,
// } from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
// import SubjectTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
// import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
// import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
// import SettingsInventory, {
//   INVENTORY_SETTINGS_TABS,
// } from '../../../../../support/fragments/settings/inventory/settingsInventory';
// import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
// import Users from '../../../../../support/fragments/users/users';
// import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Subject types', () => {
        let user;
        // const subjectType = {
        //   name: `autotestSubjectTypeName${getRandomPostfix()}`,
        //   nameForEdit: `autotestSubjectTypeName${getRandomPostfix()}`,
        //   newName: `autotestSubjectTypeName${getRandomPostfix()}`,
        //   nameForKeepEdit: `autotestSubjectTypeName${getRandomPostfix()}`,
        //   nameForCancel: `autotestSubjectTypeName${getRandomPostfix()}`,
        // };

        before('Create users data', () => {
          cy.clearCookies({ domain: null });
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
            ]);

            cy.resetTenant();
            cy.getAdminToken();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
            ]);
            cy.resetTenant();

            cy.login(user.username, user.password);
            // ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        // after('Delete users data', () => {
        //   cy.resetTenant();
        //   ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
        //   TopMenuNavigation.navigateToApp('Consortium manager');
        //   ConsortiumManagerApp.waitLoading();
        //   ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
        //   SubjectTypesConsortiumManager.choose();
        //   SubjectTypesConsortiumManager.deleteSubjectType(
        //     subjectType.name,
        //     user,
        //     tenantNames.central,
        //   );
        //   SubjectTypesConsortiumManager.deleteSubjectType(
        //     subjectType.nameForEdit,
        //     user,
        //     tenantNames.university,
        //   );
        //   cy.getAdminToken();
        //   Users.deleteViaApi(user.userId);
        // });

        it(
          'C594434 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local subject types of selected affiliated tenants in "Consortium manager" app (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594434'] },
          () => {},
        );
      });
    });
  });
});
