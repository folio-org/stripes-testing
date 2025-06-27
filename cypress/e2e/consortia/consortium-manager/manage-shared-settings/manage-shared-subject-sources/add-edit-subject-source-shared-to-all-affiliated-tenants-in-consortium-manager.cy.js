import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SubjectSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
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

        const subjectSource = {
          name: `C594428 autotestSubjectSourceName${getRandomPostfix()}`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak',
        };
        const editedSubjectSource = {
          name: `C594428 autotestSubjectSourceName${getRandomPostfix()} edited`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak',
        };

        before('Create user and login', () => {
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

            cy.login(user.username, user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C594428 User with "Consortium manager: Can share settings to all members" permission is able to add/edit subject source shared to all affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594428'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);
            SelectMembers.saveAndClose();

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectSourcesConsortiumManager.choose();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSourcesConsortiumManager.createNewSubjectSource(subjectSource.name);
            SubjectSourcesConsortiumManager.confirmShareWithAllMembers(subjectSource.name);
            SubjectSourcesConsortiumManager.verifySharedSubjectSourceExists({
              name: subjectSource.name,
              actions: ['edit', 'trash'],
            });

            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceExists({
              name: subjectSource.name,
              source: subjectSource.source,
              user: subjectSource.consortiaUser,
            });

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceExists({
              name: subjectSource.name,
              source: subjectSource.source,
              user: subjectSource.consortiaUser,
            });

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectSourcesConsortiumManager.choose();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSourcesConsortiumManager.editSubjectSource(
              subjectSource.name,
              editedSubjectSource.name,
              user,
              tenantNames.central,
            );
            SubjectSources.verifySubjectSourceExists({
              name: editedSubjectSource.name,
              source: subjectSource.source,
              user: subjectSource.consortiaUser,
            });

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifySelectedSettingIsDisplayed(settingsItems.inventory);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            SubjectSourcesConsortiumManager.verifySubjectSourcesListIsEmpty();

            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceExists({
              name: editedSubjectSource.name,
              source: subjectSource.source,
              user: subjectSource.consortiaUser,
            });

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceExists({
              name: editedSubjectSource.name,
              source: subjectSource.source,
              user: subjectSource.consortiaUser,
            });
          },
        );
      });
    });
  });
});
