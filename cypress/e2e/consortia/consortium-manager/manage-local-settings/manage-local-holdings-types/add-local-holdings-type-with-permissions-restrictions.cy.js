import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
  messages,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import HoldingsTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsTypesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsTypes from '../../../../../support/fragments/settings/inventory/holdings/holdingsTypes';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Holdings types', () => {
        let userA;
        let userB;
        const testData = {
          holdingsTypeName: `AT_C411489_HoldingsType_${getRandomPostfix()}`,
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A in Central with consortium manager permissions and holdings types permissions
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.inventoryCRUDHoldingsTypes.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            // Assign User A affiliations and permissions
            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.College);
            // Assign Organizations view permission in College for User A (limited permission, not holdings types)
            cy.assignPermissionsToExistingUser(userA.userId, [Permissions.uiOrganizationsView.gui]);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.inventoryCRUDHoldingsTypes.gui,
            ]);

            // Create User B in Central
            cy.resetTenant();
            cy.createTempUser([Permissions.inventoryCRUDHoldingsTypes.gui]).then(
              (userBProperties) => {
                userB = userBProperties;

                // Assign User B affiliations and permissions
                cy.assignAffiliationToUser(Affiliations.College, userB.userId);
                cy.assignAffiliationToUser(Affiliations.University, userB.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.inventoryCRUDHoldingsTypes.gui,
                ]);

                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.inventoryCRUDHoldingsTypes.gui,
                ]);

                cy.resetTenant();
                cy.login(userA.username, userA.password);
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);

          // Clean up holdings types from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              HoldingsTypes.getViaApi({ query: `name="${testData.holdingsTypeName}"` }).then(
                (holdingsTypes) => {
                  holdingsTypes.forEach((holdingsType) => {
                    HoldingsTypes.deleteViaApi(holdingsType.id);
                  });
                },
              );
            },
          );
        });

        it(
          'C411489 Add local holdings type via "Consortium manager" app with permissions and affiliations restrictions (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411489'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Holdings types and verify permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears for member-1
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Create new holdings type with permissions issue
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is disabled due to permission restrictions
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });

            // Step 4: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsTypeName,
            });

            // Step 5: Try to save and verify error
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.clickSave();
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));
            // ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            //   name: 'Error on saving data',
            // });
            // ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 6: Cancel creation
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.holdingsTypeName,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 7: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Unselect member-1 tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 9: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: Create new holdings type successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsTypeName,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.holdingsTypeName);

            // Step 11: Click "Keep editing"
            ConfirmCreate.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 12: Save again and confirm
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.holdingsTypeName);
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.holdingsTypeName,
                `${[tenantNames.central, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Verify two rows created (Central and University)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.holdingsTypeName,
              tenantNames.central,
              [
                testData.holdingsTypeName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.holdingsTypeName,
              tenantNames.university,
              [
                testData.holdingsTypeName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 13: Login as User B
            cy.login(userB.username, userB.password);

            // Step 14: Verify holdings type in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyLocalHoldingsTypeInTheList({
              name: testData.holdingsTypeName,
              source: 'local',
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 15: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyHoldingsTypesAbsentInTheList({ name: testData.holdingsTypeName });

            // Step 16: Switch to University tenant and verify present
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyLocalHoldingsTypeInTheList({
              name: testData.holdingsTypeName,
              source: 'local',
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
