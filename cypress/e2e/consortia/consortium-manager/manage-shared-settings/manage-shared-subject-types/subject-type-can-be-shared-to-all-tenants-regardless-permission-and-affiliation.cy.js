import { calloutTypes } from '../../../../../../interactors';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectTypes from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
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
      describe('Manage shared Subject types', () => {
        let userA;
        let userB;
        const firstSubjectType = {
          name: `C594406 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak ',
          memberLbrares: 'All',
        };
        const secondSubjectType = {
          name: `C594406 autotestSubjectTypeName${getRandomPostfix()}`,
        };
        const calloutMessage = `You do not have permissions at one or more members: ${tenantNames.college}`;

        before('Create users data', () => {
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(userA.userId, [Permissions.uiOrganizationsView.gui]);
          });

          cy.resetTenant();
          cy.createTempUser([Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui]).then(
            (userProperties) => {
              userB = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, userB.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(userB.userId, [
                Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
              ]);

              cy.resetTenant();
              cy.getAdminToken();
              cy.assignAffiliationToUser(Affiliations.University, userB.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(userB.userId, [
                Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
              ]);
            },
          );
          cy.resetTenant();
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);
        });

        it(
          'C594406 Subject type can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594406'] },
          () => {
            cy.login(userA.username, userA.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManager.waitLoading();
            SelectMembersModal.selectAllMembers();
            ConsortiumManager.verifyStatusOfConsortiumManager(2);
            ConsortiumManager.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectTypes.choose();
            InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);
            ConsortiumSubjectTypes.clickNewButton();
            ConsortiumSubjectTypes.verifyNewRecordRowBeforeFilling();
            ConsortiumSubjectTypes.createSharedWithAllMembersSubjectTypeWithValidationNameField(
              '',
              'empty',
            );
            ConsortiumSubjectTypes.createSharedWithAllMembersSubjectTypeWithValidationNameField(
              'Chronological term',
              'duplicate',
            );
            ConsortiumSubjectTypes.createSharedWithAllMembersSubjectTypeWithValidationNameField(
              firstSubjectType.name,
              'valid',
            );
            ConsortiumSubjectTypes.confirmShareWithAllMembers(firstSubjectType.name);
            InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);
            ConsortiumSubjectTypes.verifySharedToAllMembersSubjectTypeExists(
              firstSubjectType.name,
              firstSubjectType.source,
              firstSubjectType.consortiaUser,
              firstSubjectType.memberLbrares,
              { actions: ['edit', 'trash'] },
            );

            ConsortiumSubjectTypes.createSharedWithAllMembersSubjectTypeAndCancel(
              secondSubjectType.name,
            );
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(secondSubjectType.name);

            cy.login(userB.username, userB.password);
            ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.verifySubjectTypeExists({
              name: firstSubjectType.name,
              source: firstSubjectType.source,
              user: firstSubjectType.consortiaUser,
            });

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
            SubjectTypes.verifySubjectTypeExists({
              name: firstSubjectType.name,
              source: firstSubjectType.source,
              user: firstSubjectType.consortiaUser,
            });

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
            SubjectTypes.verifySubjectTypeExists({
              name: firstSubjectType.name,
              source: firstSubjectType.source,
              user: firstSubjectType.consortiaUser,
            });
          },
        );
      });
    });
  });
});
