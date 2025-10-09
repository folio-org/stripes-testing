import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectTypes from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import ConfirmCreateModal from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
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
          name: `C594411 autotestSubjectTypeName${getRandomPostfix()}`,
          editedName: `C594411 autotestSubjectTypeName${getRandomPostfix()} edited`,
          source: 'local',
        };
        const subjectTypeNameForKeepEdit = `C594411 autotestSubjectTypeName${getRandomPostfix()}`;

        before('Create users data', () => {
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

            ConsortiumSubjectTypes.createLocalSubjectTypeSavedForMemberLibraries(subjectType.name);
            ConsortiumSubjectTypes.confirmSaveForMemberLibraries(
              subjectType.name,
              tenantNames.central,
              tenantNames.college,
              tenantNames.university,
            );
            ConsortiumSubjectTypes.verifyNewAndSelectMembersButtonsState();
            ConsortiumSubjectTypes.verifyThreeLocalSubjectTypesExist(
              subjectType.name,
              user.lastName,
            );

            ConsortiumSubjectTypes.editSubjectTypeByTenantName(
              subjectType.name,
              subjectType.editedName,
              user.lastName,
              tenantNames.university,
            );
            ConsortiumSubjectTypes.verifyEditedLocalSubjectTypeExists(subjectType.editedName);
            ConsortiumSubjectTypes.verifyLocalSubjectTypeNotEdited(subjectType.name, 2);
            ConsortiumSubjectTypes.verifyNewAndSelectMembersButtonsState();

            ConsortiumSubjectTypes.deleteSubjectTypeByUserAndTenantNames(
              subjectType.name,
              user.lastName,
              tenantNames.college,
            );
            ConsortiumSubjectTypes.verifyLocalSubjectTypeExists(
              subjectType.editedName,
              tenantNames.university,
              subjectType.source,
              { actions: ['edit', 'trash'] },
            );
            ConsortiumSubjectTypes.verifyLocalSubjectTypeExists(
              subjectType.name,
              tenantNames.central,
              subjectType.source,
              { actions: ['edit', 'trash'] },
            );

            ConsortiumSubjectTypes.createLocalSubjectTypeSavedForMemberLibraries(
              subjectTypeNameForKeepEdit,
            );
            ConfirmCreateModal.waitLoadingConfirmCreate(subjectTypeNameForKeepEdit);
            ConfirmCreateModal.clickKeepEditing();
            ConsortiumSubjectTypes.verifyNewSubjectTypeRowIsInEditMode(
              subjectTypeNameForKeepEdit,
              false,
              true,
            );
            ConsortiumSubjectTypes.cancel();
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(subjectTypeNameForKeepEdit);
            ConsortiumSubjectTypes.verifyNewAndSelectMembersButtonsState();

            const isUniqueSubjectTypeName = false;
            ConsortiumSubjectTypes.createLocalSubjectTypeSavedForMemberLibraries(
              subjectType.name,
              isUniqueSubjectTypeName,
            );
            ConsortiumSubjectTypes.cancel();
            ConsortiumSubjectTypes.verifyNewAndSelectMembersButtonsState();

            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifySubjectTypeExists({
              name: subjectType.name,
              source: subjectType.source,
              user: user.lastName,
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
            SubjectTypes.verifySubjectTypeExists({
              name: subjectType.editedName,
              source: subjectType.source,
              user: user.lastName,
              actions: ['edit', 'trash'],
            });
          },
        );
      });
    });
  });
});
