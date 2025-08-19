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

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Holdings types', () => {
        let user;
        const testData = {
          holdingsTypeName: `AT_C411487_HoldingsType_${getRandomPostfix()}`,
          editedHoldingsTypeName: `AT_C411487_HoldingsType_${getRandomPostfix()}_edited`,
        };
        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'holdings type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.inventoryCRUDHoldingsTypes.gui]).then((userProperties) => {
            user = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.inventoryCRUDHoldingsTypes.gui,
            ]);

            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            }, 20_000);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);

          // Cleanup holdings types from both tenants
          [Affiliations.Consortia, Affiliations.College].forEach((tenant) => {
            cy.setTenant(tenant);
            [testData.holdingsTypeName, testData.editedHoldingsTypeName].forEach((name) => {
              HoldingsTypes.getViaApi({ query: `name="${name}"` }).then((holdingsTypes) => {
                holdingsTypes.forEach((holdingsType) => {
                  HoldingsTypes.deleteViaApi(holdingsType.id);
                });
              });
            });
          });
        });

        it(
          'C411487 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local holdings types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411487'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 3: Uncheck central tenant
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);

            // Step 4: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 5: Navigate to Holdings types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Step 6: Create new holdings type
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is disabled for edit permissions
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });

            // Step 7: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsTypeName,
            });

            // Step 8: Save and verify confirmation modal
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.holdingsTypeName);

            // Step 9: Click "Keep editing"
            ConfirmCreate.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 10: Save again and confirm creation
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.holdingsTypeName);
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.holdingsTypeName, tenantNames.college),
            );

            // Step 11: Verify holdings type is created and displayed in list
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.holdingsTypeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 12: Edit the holdings type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.holdingsTypeName,
              tenantNames.college,
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

            // Step 13: Edit name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedHoldingsTypeName,
            });

            // Step 14: Save the edited holdings type
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedHoldingsTypeName, tenantNames.college),
            );

            // Verify edited holdings type is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedHoldingsTypeName,
              tenantNames.college,
              [
                testData.editedHoldingsTypeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 15: Try to delete holdings type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedHoldingsTypeName,
              tenantNames.college,
              actionIcons.trash,
            );

            // Step 16: Cancel deletion first
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.editedHoldingsTypeName,
            );
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedHoldingsTypeName,
              tenantNames.college,
              [
                testData.editedHoldingsTypeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 17: Delete holdings type with confirmation
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedHoldingsTypeName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.editedHoldingsTypeName),
            );
            // Verify holdings type is no longer in the list
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.editedHoldingsTypeName,
              tenantNames.college,
            );

            // Step 18: Open Select members modal again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);

            // Step 19: Uncheck member tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 20: Save member selection and verify empty list
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiumManagerApp.verifyListIsEmpty();
          },
        );
      });
    });
  });
});
