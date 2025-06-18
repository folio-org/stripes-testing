// import { calloutTypes } from '../../../../../../interactors';
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
// import Users from '../../../../../support/fragments/users/users';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject sources', () => {
        let user;

        const subjectSourceNames = {
          newSubjectSourseName: `autotestSubjectSourceName${getRandomPostfix()}`,
          editedSubjectSourseName: `autotestSubjectSourceNameEdited${getRandomPostfix()}`,
        };
        // const calloutMessage = `You do not have permissions at one or more members: ${tenantNames.college}`;

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

            cy.login(user.username, user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        // after('Delete users data', () => {
        //   cy.resetTenant();
        //   cy.getAdminToken();
        //   Users.deleteViaApi(userA.userId);
        //   Users.deleteViaApi(userB.userId);
        //   SubjectSourcesConsortiumManager.getSourceSubjectIdViaApi(subjectSourceNames[0]).then(
        //     (id) => {
        //       SubjectSourcesConsortiumManager.deleteViaApi(id, subjectSourceNames[0]);
        //     },
        //   );
        // });

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
            SelectMembers.selectMember(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(1, 2, false);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectSourcesConsortiumManager.choose();
            SettingsInventory.selectTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSourcesConsortiumManager.verifySubjectSourcesList();
            SubjectSourcesConsortiumManager.clickNewSubjectSourceButton();
            SubjectSourcesConsortiumManager.fillNameField(subjectSourceNames.newSubjectSourseName);
            SubjectSourcesConsortiumManager.clickShareWithAllAffiliatedTenantsCheckbox();
            SubjectSourcesConsortiumManager.clickSaveAndCloseButton();
            SubjectSourcesConsortiumManager.confirmSharing(subjectSourceNames.newSubjectSourseName);
            SubjectSourcesConsortiumManager.verifyCreatedSubjectSource({
              name: subjectSourceNames.newSubjectSourseName,
              actions: ['edit', 'trash'],
            });
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifyCreatedSubjectSource({
              name: subjectSourceNames.newSubjectSourseName,
            });

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifyCreatedSubjectSource({
              name: subjectSourceNames.newSubjectSourseName,
            });

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectSourcesConsortiumManager.choose();
            SettingsInventory.selectTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSourcesConsortiumManager.editSubjectSource(
              subjectSourceNames.newSubjectSourseName,
              subjectSourceNames.editedSubjectSourseName,
              user.username,
              tenantNames.central,
            );
            SubjectSourcesConsortiumManager.confirmSharing(
              subjectSourceNames.editedSubjectSourseName,
            );
            SubjectSources.verifyCreatedSubjectSource({
              name: subjectSourceNames.editedSubjectSourseName,
            });

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(1, 2, false);
            SelectMembers.selectMember(tenantNames.central);
            SelectMembers.verifyStatusOfSelectMembersModal(0, 2, false);

            // step 19 checks
          },
        );
      });
    });
  });
});
