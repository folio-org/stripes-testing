import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectSources from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';
import confirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectSources from '../../../../../support/fragments/settings/inventory/instances/subjectSources';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject sources', () => {
        let user;
        const subjectSourceNames = {
          name1: `C594427 autotestSubjectSourceName${getRandomPostfix()}`,
          name2: `C594427 autotestSubjectSourceName${getRandomPostfix()}`,
          name3: `C594427 autotestSubjectSourceName${getRandomPostfix()}`,
        };

        before('Create users data', () => {
          cy.clearCookies({ domain: null });
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
            ]);
            cy.resetTenant();

            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
            ]);
            cy.resetTenant();

            cy.login(user.username, user.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManager.waitLoading();
          });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C594427 User with "Consortium manager: Can share settings to all members" permission is able to add/delete subject source shared to all affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594427'] },
          () => {
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(3);
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectSources.choose();
            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSource(
              subjectSourceNames.name1,
            );
            ConsortiumSubjectSources.confirmShareWithAllMembers(subjectSourceNames.name1);
            ConsortiumSubjectSources.verifySharedSubjectSourceExists({
              name: subjectSourceNames.name1,
              user: 'System, System user - mod-consortia-keycloak ',
              actions: ['edit', 'trash'],
            });

            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSource(
              subjectSourceNames.name2,
            );
            confirmShare.waitLoadingConfirmShareToAll(subjectSourceNames.name2);
            confirmShare.clickKeepEditing();
            ConsortiumSubjectSources.verifyNewSubjectSourceRowIsInEditMode(
              subjectSourceNames.name2,
              'local',
              'No value set-',
              true,
              false,
            );
            ConsortiumSubjectSources.clickCancelButton();
            ConsortiumSubjectSources.verifySubjectSourceAbsent(subjectSourceNames.name2);
            ConsortiumSubjectSources.verifyNewAndSelectMembersButtonsState();

            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSourceAndCancel(
              subjectSourceNames.name3,
            );
            ConsortiumSubjectSources.verifySubjectSourceAbsent(subjectSourceNames.name3);
            ConsortiumSubjectSources.verifyNewAndSelectMembersButtonsState();

            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSourceWithValidationNameField(
              subjectSourceNames.name1,
              'duplicate',
            );
            ConsortiumSubjectSources.clickCancelButton();
            ConsortiumSubjectSources.verifyNewAndSelectMembersButtonsState();

            ConsortiumSubjectSources.deleteSubjectSourceByName(subjectSourceNames.name1);
            ConsortiumSubjectSources.cancelDelitionOfSubjectSource(subjectSourceNames.name1);
            cy.wait(3000);
            ConsortiumSubjectSources.verifySharedSubjectSourceExists({
              name: subjectSourceNames.name1,
              user: 'No value set-',
              actions: ['edit', 'trash'],
            });
            ConsortiumSubjectSources.deleteSubjectSourceByName(subjectSourceNames.name1);
            ConsortiumSubjectSources.confirmDeletionOfSubjectSource(subjectSourceNames.name1);
            ConsortiumSubjectSources.verifySubjectSourceAbsent(subjectSourceNames.name1);

            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceAbsent(subjectSourceNames.name1);

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
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceAbsent(subjectSourceNames.name1);

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
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceAbsent(subjectSourceNames.name1);
          },
        );
      });
    });
  });
});
