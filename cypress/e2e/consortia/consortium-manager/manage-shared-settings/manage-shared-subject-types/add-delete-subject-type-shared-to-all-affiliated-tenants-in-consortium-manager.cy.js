import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectTypes from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import ConfirmShareModal from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject types', () => {
        let user;
        const firstSubjectType = {
          name: `C594404 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak',
          memberLbrares: 'All',
        };
        const secondSubjectType = {
          name: `C594404 autotestSubjectTypeName${getRandomPostfix()}`,
        };

        before('Create userand login', () => {
          cy.clearCookies({ domain: null });
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
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

            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
            ]);
            cy.resetTenant();

            cy.login(user.username, user.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C594404 User with "Consortium manager: Can share settings to all members" permission is able to add/delete subject type shared to all affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594404'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManager.waitLoading();
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(3);
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectTypes.choose();

            ConsortiumSubjectTypes.createSubjectTypeSharedWithAllMembers(firstSubjectType.name);
            ConsortiumSubjectTypes.confirmShareWithAllMembers(firstSubjectType.name);
            ConsortiumSubjectTypes.verifySharedToAllMembersSubjectTypeExists(
              firstSubjectType.name,
              firstSubjectType.source,
              firstSubjectType.consortiaUser,
              firstSubjectType.memberLbrares,
              { actions: ['edit', 'trash'] },
            );

            ConsortiumSubjectTypes.createSubjectTypeSharedWithAllMembers(secondSubjectType.name);
            ConfirmShareModal.waitLoadingConfirmShareToAll(secondSubjectType.name);
            ConfirmShareModal.clickKeepEditing();
            ConsortiumSubjectTypes.verifyNewSubjectTypeRowIsInEditMode(secondSubjectType.name);
            ConsortiumSubjectTypes.cancel();
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(secondSubjectType.name);
            ConsortiumSubjectTypes.verifyNewAndSelectMembersButtonsState();

            const isUniqueSubjectTypeName = false;
            ConsortiumSubjectTypes.createSharedWithAllMembersSubjectTypeAndCancel(
              firstSubjectType.name,
              isUniqueSubjectTypeName,
            );
            ConsortiumSubjectTypes.verifyNewAndSelectMembersButtonsState();

            ConsortiumSubjectTypes.clickDeleteByName(firstSubjectType.name);
            DeleteCancelReason.waitLoadingDeleteModal('subject type', firstSubjectType.name);
            DeleteCancelReason.clickCancel();
            ConsortiumSubjectTypes.verifySharedToAllMembersSubjectTypeExists(
              firstSubjectType.name,
              firstSubjectType.source,
              firstSubjectType.consortiaUser,
              firstSubjectType.memberLbrares,
              { actions: ['edit', 'trash'] },
            );

            ConsortiumSubjectTypes.deleteBySubjectTypeName(firstSubjectType.name);
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(firstSubjectType.name);

            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifySubjectTypeAbsent(firstSubjectType.name);

            cy.resetTenant();
            ConsortiumManagerSettings.switchActiveAffiliation(
              tenantNames.central,
              tenantNames.college,
            );
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifySubjectTypeAbsent(firstSubjectType.name);

            cy.resetTenant();
            ConsortiumManagerSettings.switchActiveAffiliation(
              tenantNames.college,
              tenantNames.university,
            );
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.university);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifySubjectTypeAbsent(firstSubjectType.name);
          },
        );
      });
    });
  });
});
