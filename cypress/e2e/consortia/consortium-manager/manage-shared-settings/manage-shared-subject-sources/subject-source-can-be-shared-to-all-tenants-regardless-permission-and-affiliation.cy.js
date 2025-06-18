import { calloutTypes } from '../../../../../../interactors';
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
import InteractorsTools from '../../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject sources', () => {
        let userA;
        let userB;
        const subjectSourceNames = [
          `autotestSubjectSourceName${getRandomPostfix()}`,
          `autotestSubjectSourceName${getRandomPostfix()}`,
        ];
        const calloutMessage = `You do not have permissions at one or more members: ${tenantNames.college}`;

        before('Create users data', () => {
          cy.clearCookies({ domain: null });
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
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
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);
          SubjectSourcesConsortiumManager.getSourceSubjectIdViaApi(subjectSourceNames[0]).then(
            (id) => {
              SubjectSourcesConsortiumManager.deleteViaApi(id, subjectSourceNames[0]);
            },
          );
        });

        it(
          'C594429 Subject source can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594429'] },
          () => {
            cy.login(userA.username, userA.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectSourcesConsortiumManager.choose();
            InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);
            SubjectSourcesConsortiumManager.clickNewButton();
            [
              { name: '', isUnique: true },
              { name: 'Canadian Subject Headings', isUnique: false },
              { name: subjectSourceNames[0], isUnique: true },
            ].forEach((value) => {
              SubjectSourcesConsortiumManager.validateNameFieldConditions(
                value.name,
                value.isUnique,
              );
            });
            SubjectSourcesConsortiumManager.confirmSharing(subjectSourceNames[0]);
            SubjectSourcesConsortiumManager.verifyCreatedSubjectSource({
              name: subjectSourceNames[0],
              actions: ['edit', 'trash'],
            });
            SubjectSourcesConsortiumManager.createAndCancelRecord(subjectSourceNames[1]);

            cy.login(userB.username, userB.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifyCreatedSubjectSource({ name: subjectSourceNames[0] });

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifyCreatedSubjectSource({ name: subjectSourceNames[0] });

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.verifyCreatedSubjectSource({ name: subjectSourceNames[0] });
          },
        );
      });
    });
  });
});
