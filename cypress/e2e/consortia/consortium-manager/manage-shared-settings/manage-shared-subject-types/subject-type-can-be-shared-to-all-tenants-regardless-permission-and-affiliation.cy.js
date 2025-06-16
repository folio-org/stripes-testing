import { calloutTypes } from '../../../../../../interactors';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SubjectTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
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
        const subjectTypeNames = [
          `autotestSubjectTypeName${getRandomPostfix()}`,
          `autotestSubjectTypeName${getRandomPostfix()}`,
        ];
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

        after('Delete users data', () => {
          SubjectTypesConsortiumManager.deleteSubjectType(subjectTypeNames[0], userB, 'consortium');
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
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp('Consortium manager');
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectTypesConsortiumManager.choose();
            InteractorsTools.checkCalloutMessage(calloutMessage, calloutTypes.error);
            SubjectTypesConsortiumManager.clickNewButton();
            [
              { name: '', isUnique: true },
              { name: 'Chronological term', isUnique: false },
              { name: subjectTypeNames[0], isUnique: true },
            ].forEach((value) => {
              SubjectTypesConsortiumManager.validateNameFieldConditions(value.name, value.isUnique);
            });
            SubjectTypesConsortiumManager.confirmSharing(subjectTypeNames[0]);
            SubjectTypesConsortiumManager.verifyCreatedSubjectType({
              name: subjectTypeNames[0],
              actions: ['edit', 'trash'],
            });
            SubjectTypesConsortiumManager.createAndCancelRecord(subjectTypeNames[1]);

            cy.login(userB.username, userB.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              subjectTypeNames[0],
              'consortium',
            );

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              subjectTypeNames[0],
              'consortium',
            );

            cy.resetTenant();
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypesConsortiumManager.verifySubjectTypeExists(
              subjectTypeNames[0],
              'consortium',
            );
          },
        );
      });
    });
  });
});
