import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SubjectTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Subject types', () => {
        let user;
        const subjectType = {
          name: `autotestSubjectTypeName${getRandomPostfix()}`,
          nameForEdit: `autotestSubjectTypeName${getRandomPostfix()}`,
          newName: `autotestSubjectTypeName${getRandomPostfix()}`,
          nameForKeepEdit: `autotestSubjectTypeName${getRandomPostfix()}`,
          nameForCancel: `autotestSubjectTypeName${getRandomPostfix()}`,
        };

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
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.waitLoading();
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          SubjectTypesConsortiumManager.choose();
          SubjectTypesConsortiumManager.deleteSubjectType(
            subjectType.name,
            user,
            tenantNames.central,
          );
          SubjectTypesConsortiumManager.deleteSubjectType(
            subjectType.nameForEdit,
            user,
            tenantNames.university,
          );
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C594411 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local subject types of selected affiliated tenants in "Consortium manager" app (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594411'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectTypesConsortiumManager.choose();
            SubjectTypesConsortiumManager.createNewSubjectType(subjectType.name);
            SubjectTypesConsortiumManager.confirmConfirmMemberLibraries(subjectType.name, [
              tenantNames.central,
              tenantNames.college,
              tenantNames.university,
            ]);
            SubjectTypesConsortiumManager.verifyCreatedSubjectTypes(subjectType, user);
            SubjectTypesConsortiumManager.editSubjectType(
              subjectType.name,
              subjectType.nameForEdit,
              user,
              tenantNames.university,
            );
            SubjectTypesConsortiumManager.verifyEditedSubjectTypes(
              subjectType.name,
              subjectType.nameForEdit,
            );
            SubjectTypesConsortiumManager.deleteSubjectType(
              subjectType.name,
              user,
              tenantNames.college,
            );
            [
              {
                typeName: subjectType.nameForEdit,
                tenantName: tenantNames.university,
              },
              {
                typeName: subjectType.name,
                tenantName: tenantNames.central,
              },
            ].forEach((elements) => {
              SubjectTypesConsortiumManager.verifySourceTypeExists(
                elements.typeName,
                elements.tenantName,
              );
            });

            SubjectTypesConsortiumManager.createNewSubjectType(subjectType.nameForKeepEdit);
            SubjectTypesConsortiumManager.clickKeepEditingInConfirmModal();
            SubjectTypesConsortiumManager.clickCancelInActionsColumn();
            SubjectTypesConsortiumManager.verifySubjectTypeAbsent(subjectType.nameForKeepEdit);

            SubjectTypesConsortiumManager.createNewSubjectType(subjectType.name, false);
            SubjectTypesConsortiumManager.clickCancelInActionsColumn();

            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifyCreatedSubjectType({
              name: subjectType.name,
              user,
              actions: ['edit', 'trash'],
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifySubjectTypeAbsent(subjectType.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifyCreatedSubjectType({
              name: subjectType.nameForEdit,
              user,
              actions: ['edit', 'trash'],
            });
          },
        );
      });
    });
  });
});
