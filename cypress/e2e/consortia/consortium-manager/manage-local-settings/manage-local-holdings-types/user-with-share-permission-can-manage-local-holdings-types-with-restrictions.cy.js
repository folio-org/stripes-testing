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
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
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
          holdingsTypeName: `AT_C411490_HoldingsType_${getRandomPostfix()}`,
          editedHoldingsTypeName: `AT_C411490_HoldingsType_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          SETTINGS_OPTION: 'holdings type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A in member-1 tenant (College) as specified in preconditions
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((userProperties) => {
            userA = userProperties;

            // Assign User A affiliations and permissions in Central tenant
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.inventoryCRUDHoldingsTypes.gui,
            ]);

            // Assign User A affiliation and permissions in University (member-2)
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.inventoryCRUDHoldingsTypes.gui,
            ]);

            // Create User B in Central tenant
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
                cy.waitForAuthRefresh(() => {
                  cy.login(userA.username, userA.password);
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                  cy.reload();
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                  ConsortiumManager.switchActiveAffiliation(
                    tenantNames.college,
                    tenantNames.central,
                  );
                }, 20_000);
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userB.userId);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);

          // Clean up holdings types from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              [testData.holdingsTypeName, testData.editedHoldingsTypeName].forEach((name) => {
                HoldingsTypes.getViaApi({ query: `name="${name}"` }).then((holdingsTypes) => {
                  holdingsTypes.forEach((holdingsType) => {
                    HoldingsTypes.deleteViaApi(holdingsType.id);
                  });
                });
              });
            },
          );
        });

        it(
          'C411490 User with "Consortium manager: Can share settings to all members" permission can manage local holdings types via "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411490'] },
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
            // Verify Share checkbox is enabled (since user has share permissions)
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 4: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsTypeName,
            });

            // Step 5: Leave Share checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 6: Try to save and verify error
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.clickSave();
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));
            // ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            //   name: 'Error on saving data',
            // });
            // ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 7: Cancel creation
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.holdingsTypeName,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 8: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 9: Unselect member-1 tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 10: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 11: Create new holdings type successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsTypeName,
            });
            // Leave Share checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.holdingsTypeName);

            // Step 12: Confirm creation
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

            // Step 13: Edit central tenant holdings type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.holdingsTypeName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is disabled in edit mode
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });

            // Step 14: Clear name field
            ConsortiaControlledVocabularyPaneset.clearTextField('name');

            // Step 15: Try to save with empty name and verify validation error
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: 'Please fill this in to continue',
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 16: Fill in edited name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedHoldingsTypeName,
            });

            // Step 17: Save changes
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              `${testData.editedHoldingsTypeName} was successfully updated for ${tenantNames.central} library.`,
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedHoldingsTypeName,
              tenantNames.central,
              [
                testData.editedHoldingsTypeName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 18: Delete holdings type from University tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.holdingsTypeName,
              tenantNames.university,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.holdingsTypeName,
            );

            // Step 19: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.holdingsTypeName),
            );

            // Verify University tenant row was deleted, Central remains with edited name
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.holdingsTypeName,
              tenantNames.university,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedHoldingsTypeName,
              tenantNames.central,
              [
                testData.editedHoldingsTypeName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 20: Login as User B
            cy.login(userB.username, userB.password);

            // Step 21: Verify holdings type in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyLocalHoldingsTypeInTheList({
              name: testData.editedHoldingsTypeName,
              source: 'local',
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 22: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyHoldingsTypesAbsentInTheList({ name: testData.holdingsTypeName });

            // Step 23: Switch to University tenant and verify deleted holdings type NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyHoldingsTypesAbsentInTheList({ name: testData.holdingsTypeName });
          },
        );
      });
    });
  });
});
