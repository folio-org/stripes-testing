import { calloutTypes } from '../../../../../../interactors';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectSources from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectSources from '../../../../../support/fragments/settings/inventory/instances/subjectSources';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import InteractorsTools from '../../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject sources', () => {
        let userA;
        let userB;
        const subjectSource = {
          name: `C594429 autotestSubjectSourceName${getRandomPostfix()}`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak',
        };
        const calloutMessage = `You do not have permissions at one or more members: ${tenantNames.college}`;

        before('Create users data', () => {
          cy.clearCookies({ domain: null });
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(userA.userId, [Permissions.uiOrganizationsView.gui]);
          });

          cy.resetTenant();
          cy.createTempUser([Permissions.uiSettingsSubjectSourceCreateEditDelete.gui]).then(
            (userProperties) => {
              userB = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, userB.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(userB.userId, [
                Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
              ]);

              cy.resetTenant();
              cy.getAdminToken();
              cy.assignAffiliationToUser(Affiliations.University, userB.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(userB.userId, [
                Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
              ]);
            },
          );
          cy.resetTenant();
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.getConsortiaId().then((consortiaId) => {
            Users.deleteViaApi(userA.userId);
            Users.deleteViaApi(userB.userId);
            ConsortiumSubjectSources.getSubjectSourceIdViaApi(subjectSource.name, consortiaId).then(
              (id) => {
                ConsortiumSubjectSources.deleteViaApi(id, subjectSource.name, consortiaId);
              },
            );
          });
        });

        it(
          'C594429 Subject source can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594429'] },
          () => {
            cy.login(userA.username, userA.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManager.waitLoading();
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(2);
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectSources.choose();
            InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);
            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSourceWithValidationNameField(
              '',
              'empty',
            );
            ConsortiumSubjectSources.clickCancelButton();
            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSourceWithValidationNameField(
              'Medical Subject Headings',
              'duplicate',
            );
            ConsortiumSubjectSources.clickCancelButton();
            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSourceWithValidationNameField(
              subjectSource.name,
              'unique',
            );
            ConsortiumSubjectSources.confirmShareWithAllMembers(subjectSource.name);
            InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);
            ConsortiumSubjectSources.verifySharedSubjectSourceExists({
              name: subjectSource.name,
              actions: ['edit', 'trash'],
            });
            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSourceAndCancel(
              subjectSource.name,
            );

            cy.login(userB.username, userB.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifySubjectSourceExists(
              subjectSource.name,
              subjectSource.source,
              subjectSource.consortiaUser,
            );

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
            SubjectSources.verifySubjectSourceExists(
              subjectSource.name,
              subjectSource.source,
              subjectSource.consortiaUser,
            );

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
            SubjectSources.verifySubjectSourceExists(
              subjectSource.name,
              subjectSource.source,
              subjectSource.consortiaUser,
            );
          },
        );
      });
    });
  });
});
