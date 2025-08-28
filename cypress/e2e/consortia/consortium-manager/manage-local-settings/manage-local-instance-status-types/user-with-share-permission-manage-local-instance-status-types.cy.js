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
import InstanceStatusTypeConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceStatusTypeConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceStatusTypes from '../../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Instance status types', () => {
        let user;
        const testData = {
          statusTypeName: `AT_C411543_InstanceStatusType_${getRandomPostfix()}`,
          statusTypeCode: `AT_C411543_${getRandomPostfix()}`,
          editedStatusTypeName: `AT_C411543_InstanceStatusType_${getRandomPostfix()}_edited`,
          editedStatusTypeCode: `AT_C411543_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'instance status type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create user with share permission in Central tenant per TestRail preconditions
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Assign affiliation to College (member-1) and assign permissions
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            ]);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            ]);

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          // Clean up instance status types from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              InstanceStatusTypes.getViaApi({
                query: `name="${testData.statusTypeName}"`,
              }).then((instanceStatusTypes) => {
                instanceStatusTypes.forEach((statusType) => {
                  InstanceStatusTypes.deleteViaApi(statusType.id);
                });
              });
              InstanceStatusTypes.getViaApi({
                query: `name="${testData.editedStatusTypeName}"`,
              }).then((instanceStatusTypes) => {
                instanceStatusTypes.forEach((statusType) => {
                  InstanceStatusTypes.deleteViaApi(statusType.id);
                });
              });
            },
          );
        });

        it(
          'C411543 User with "Consortium manager: Can share settings to all members" permission is able to manage local instance status types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411543'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to Instance status types
            InstanceStatusTypeConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Step 4: Create new instance status type
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is enabled
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 5: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.statusTypeName,
            });

            // Step 6: Fill in code field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.statusTypeCode,
            });

            // Step 7: Leave Share checkbox unchecked and save
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.statusTypeName);

            // Step 8: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.statusTypeName,
                `${[tenantNames.central, tenantNames.college, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Steps 9-11: Verify three rows created (one for each tenant)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.statusTypeName,
              tenantNames.central,
              [
                testData.statusTypeName,
                testData.statusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.statusTypeName,
              tenantNames.college,
              [
                testData.statusTypeName,
                testData.statusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.statusTypeName,
              tenantNames.university,
              [
                testData.statusTypeName,
                testData.statusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 12: Edit central tenant instance status type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.statusTypeName,
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
              name: testData.editedStatusTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedStatusTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 14: Cancel editing
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.statusTypeName,
              tenantNames.central,
              [
                testData.statusTypeName,
                testData.statusTypeCode,
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
              testData.statusTypeName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedStatusTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedStatusTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedStatusTypeName, tenantNames.central),
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedStatusTypeName,
              tenantNames.central,
              [
                testData.editedStatusTypeName,
                testData.editedStatusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify other tenants unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.statusTypeName,
              tenantNames.college,
              [
                testData.statusTypeName,
                testData.statusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.statusTypeName,
              tenantNames.university,
              [
                testData.statusTypeName,
                testData.statusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 16: Delete instance status type from College tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.statusTypeName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.statusTypeName,
            );

            // Step 17: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.statusTypeName),
            );

            // Verify College tenant row was deleted, others remain
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.statusTypeName,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedStatusTypeName,
              tenantNames.central,
              [
                testData.editedStatusTypeName,
                testData.editedStatusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.statusTypeName,
              tenantNames.university,
              [
                testData.statusTypeName,
                testData.statusTypeCode,
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
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPES);
            InstanceStatusTypes.waitLoading();
            InstanceStatusTypes.verifyLocalInstanceStatusTypesInTheList({
              name: testData.editedStatusTypeName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 19: Switch to College tenant and verify deletion
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPES);
            InstanceStatusTypes.waitLoading();
            InstanceStatusTypes.verifyInstanceStatusTypesAbsentInTheList({
              name: testData.statusTypeName,
            });

            // Step 20: Switch to University tenant and verify presence
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPES);
            InstanceStatusTypes.waitLoading();
            InstanceStatusTypes.verifyLocalInstanceStatusTypesInTheList({
              name: testData.statusTypeName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
