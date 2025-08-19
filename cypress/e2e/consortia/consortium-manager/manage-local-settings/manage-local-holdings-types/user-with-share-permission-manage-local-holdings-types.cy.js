import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
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
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Holdings types', () => {
        let user;
        const testData = {
          holdingsTypeName: `AT_C411488_HoldingsType_${getRandomPostfix()}`,
          editedHoldingsTypeName: `AT_C411488_HoldingsType_${getRandomPostfix()}_edited`,
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.inventoryCRUDHoldingsTypes.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Assign affiliation to College (member-1)
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.inventoryCRUDHoldingsTypes.gui,
            ]);

            // Assign affiliation to University (member-2)
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.inventoryCRUDHoldingsTypes.gui,
            ]);

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);

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
              HoldingsTypes.getViaApi({ query: `name="${testData.editedHoldingsTypeName}"` }).then(
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
          'C411488 User with "Consortium manager: Can share settings to all members" permission is able to manage local holdings types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411488'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Holdings types settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Create new holdings type
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 4: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsTypeName,
            });

            // Step 5: Leave Share checkbox unchecked (local holdings type)
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 6: Save and verify confirmation modal
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.holdingsTypeName);

            // Step 7: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.holdingsTypeName,
                `${[tenantNames.central, tenantNames.college, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Steps 8-10: Verify three rows created (one for each tenant)
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
              tenantNames.college,
              [
                testData.holdingsTypeName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.college,
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

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 11: Edit central tenant holdings type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.holdingsTypeName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 12: Edit name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedHoldingsTypeName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 13: Cancel editing
            ConsortiaControlledVocabularyPaneset.clickCancel();
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
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 14: Edit again and save
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.holdingsTypeName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedHoldingsTypeName,
            });
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
            // Verify other tenants unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.holdingsTypeName,
              tenantNames.college,
              [
                testData.holdingsTypeName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.college,
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

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Steps 15-16: Delete holdings type from College tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.holdingsTypeName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('holdings type', testData.holdingsTypeName);
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('holdings type', testData.holdingsTypeName),
            );

            // Verify College tenant row was deleted, others remain
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.holdingsTypeName,
              tenantNames.college,
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

            // Step 17: Verify in Settings app - Central tenant
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

            // Step 18: Switch to College tenant and verify deletion
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyHoldingsTypesAbsentInTheList({ name: testData.holdingsTypeName });

            // Step 19: Switch to University tenant and verify presence
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
