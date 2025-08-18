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
import FormatsConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/formatsConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Formats from '../../../../../support/fragments/settings/inventory/instances/formats';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Formats', () => {
        let user;
        const testData = {
          formatName: `AT_C410727_Format_${getRandomPostfix()}`,
          formatCode: `AT_C410727_Code_${getRandomPostfix()}`,
          editedFormatName: `AT_C410727_Format_${getRandomPostfix()}_edited`,
          editedFormatCode: `AT_C410727_Code_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'format',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create user in Central tenant as specified in TestRail preconditions
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudFormats.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Assign affiliation to College (member-1) with Formats permission
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.crudFormats.gui]);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.crudFormats.gui]);

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);

          // Clean up formats from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              Formats.getViaApi({ query: `name="${testData.formatName}"` }).then((formats) => {
                formats.forEach((format) => {
                  Formats.deleteViaApi(format.id);
                });
              });
              Formats.getViaApi({ query: `name="${testData.editedFormatName}"` }).then(
                (formats) => {
                  formats.forEach((format) => {
                    Formats.deleteViaApi(format.id);
                  });
                },
              );
            },
          );
        });

        it(
          'C410727 User with "Consortium manager: Can share settings to all members" permission is able to manage local formats of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410727'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Formats
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            FormatsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Step 3: Create new format
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is enabled due to share permission
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Steps 4-5: Fill in name and code fields
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.formatName });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: testData.formatCode });

            // Step 6: Leave Share checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 7: Save and verify confirmation modal
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.formatName);

            // Step 8: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.formatName,
                `${[tenantNames.central, tenantNames.college, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Steps 9-11: Verify three rows created (one for each tenant)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.formatName,
              tenantNames.central,
              [
                testData.formatName,
                testData.formatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.formatName,
              tenantNames.college,
              [
                testData.formatName,
                testData.formatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.formatName,
              tenantNames.university,
              [
                testData.formatName,
                testData.formatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 12: Edit central tenant format
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.formatName,
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

            // Step 13: Edit name and code fields
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedFormatName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedFormatCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 14: Cancel editing
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.formatName,
              tenantNames.central,
              [
                testData.formatName,
                testData.formatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 15: Edit again and save
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.formatName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedFormatName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedFormatCode,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedFormatName, tenantNames.central),
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedFormatName,
              tenantNames.central,
              [
                testData.editedFormatName,
                testData.editedFormatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify other tenants unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.formatName,
              tenantNames.college,
              [
                testData.formatName,
                testData.formatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.formatName,
              tenantNames.university,
              [
                testData.formatName,
                testData.formatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 16: Delete format from College tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.formatName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.formatName,
            );

            // Step 17: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.formatName),
            );

            // Verify College tenant row was deleted, others remain
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.formatName,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedFormatName,
              tenantNames.central,
              [
                testData.editedFormatName,
                testData.editedFormatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.formatName,
              tenantNames.university,
              [
                testData.formatName,
                testData.formatCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 18: Verify in Settings app - Central tenant
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyLocalFormatsInTheList({
              name: testData.editedFormatName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 19: Switch to College tenant and verify deletion
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyFormatsAbsentInTheList({ name: testData.formatName });

            // Step 20: Switch to University tenant and verify presence
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyLocalFormatsInTheList({
              name: testData.formatName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
