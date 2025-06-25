import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectTypes from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import SettingsConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
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
            SettingsConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          SettingsConsortiumManager.switchActiveAffiliation(
            tenantNames.university,
            tenantNames.central,
          );
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManager.waitLoading();
          ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
          ConsortiumSubjectTypes.choose();
          ConsortiumSubjectTypes.deleteByUserName(subjectType.name, user, tenantNames.central);
          ConsortiumSubjectTypes.deleteByUserName(
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
            ConsortiumManager.waitLoading();
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(3);
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectTypes.choose();

            ConsortiumSubjectTypes.createNewWithValidationOfNameField(subjectType.name, true, true);
            ConsortiumSubjectTypes.clickConfirmInConfirmMemberLibraries(subjectType.name, [
              tenantNames.central,
              tenantNames.college,
              tenantNames.university,
            ]);
            ConsortiumSubjectTypes.verifyCreatedInList(subjectType, user);
            ConsortiumSubjectTypes.edit(
              subjectType.name,
              subjectType.nameForEdit,
              user.lastName,
              tenantNames.university,
            );
            ConsortiumSubjectTypes.verifyEditedInList(subjectType.name, subjectType.nameForEdit);
            ConsortiumSubjectTypes.deleteByUserName(subjectType.name, user, tenantNames.college);
            ConsortiumSubjectTypes.verifySubjectTypeExists(
              subjectType.nameForEdit,
              tenantNames.university,
              'local',
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectTypes.verifySubjectTypeExists(
              subjectType.name,
              tenantNames.central,
              'local',
              { actions: ['edit', 'trash'] },
            );

            ConsortiumSubjectTypes.createNewWithValidationOfNameField(
              subjectType.nameForKeepEdit,
              true,
              true,
            );
            ConsortiumSubjectTypes.clickKeepEditingInConfirmMemberLibrariesModal();
            ConsortiumSubjectTypes.cancel();
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(subjectType.nameForKeepEdit);

            ConsortiumSubjectTypes.createNewWithValidationOfNameField(subjectType.name, true, true);
            ConsortiumSubjectTypes.cancel();

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

            SettingsConsortiumManager.switchActiveAffiliation(
              tenantNames.central,
              tenantNames.college,
            );
            SettingsConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifySubjectTypeAbsent(subjectType.name);

            SettingsConsortiumManager.switchActiveAffiliation(
              tenantNames.college,
              tenantNames.university,
            );
            SettingsConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
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
