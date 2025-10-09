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
import SubjectTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Subject types', () => {
        let user;
        const testData = {
          typeName: `AT_C594413_SubjectType_${getRandomPostfix()}`,
          editedTypeName: `AT_C594413_SubjectType_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'subject type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create user with share permission in central tenant
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Assign affiliation to College and assign permissions
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
            ]);

            // Assign affiliation to University and assign permissions
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiSettingsCreateEditDeleteSubjectTypes.gui,
            ]);

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          // Clean up subject types from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              SubjectTypes.getSubjectTypesViaApi({
                query: `name="${testData.typeName}"`,
              }).then((subjectTypes) => {
                subjectTypes.forEach((subjectType) => {
                  SubjectTypes.deleteViaApi(subjectType.id);
                });
              });
              SubjectTypes.getSubjectTypesViaApi({
                query: `name="${testData.editedTypeName}"`,
              }).then((subjectTypes) => {
                subjectTypes.forEach((subjectType) => {
                  SubjectTypes.deleteViaApi(subjectType.id);
                });
              });
            },
          );
        });

        it(
          'C594413 User with "Consortium manager: Can share settings to all members" permission is able to manage local subject types of selected affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['extendedPathECS', 'folijet', 'C594413'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to Subject types
            SubjectTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Step 4: Create new subject type
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
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.typeName });

            // Step 6: Leave Share checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 7: Save and verify confirmation modal
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.typeName);

            // Step 8: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.typeName,
                `${[tenantNames.central, tenantNames.college, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Steps 9-11: Verify three rows created (one for each tenant)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.typeName,
              tenantNames.central,
              [
                testData.typeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.typeName,
              tenantNames.college,
              [
                testData.typeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.typeName,
              tenantNames.university,
              [
                testData.typeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 12: Edit central tenant subject type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.typeName,
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

            // Step 13: Edit name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedTypeName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 14: Cancel editing
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.typeName,
              tenantNames.central,
              [
                testData.typeName,
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
              testData.typeName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedTypeName,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedTypeName, tenantNames.central),
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedTypeName,
              tenantNames.central,
              [
                testData.editedTypeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify other tenants unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.typeName,
              tenantNames.college,
              [
                testData.typeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.typeName,
              tenantNames.university,
              [
                testData.typeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 16: Delete subject type from College tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.typeName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(CONSTANTS.SETTINGS_OPTION, testData.typeName);

            // Step 17: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.typeName),
            );

            // Verify College tenant row was deleted, others remain
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.typeName,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedTypeName,
              tenantNames.central,
              [
                testData.editedTypeName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.typeName,
              tenantNames.university,
              [
                testData.typeName,
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
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.waitLoading();
            SubjectTypes.verifySubjectTypeExists({
              name: testData.editedTypeName,
              source: CONSTANTS.LOCAL_SOURCE,
              user: user.lastName,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 19: Switch to College tenant and verify deletion
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.waitLoading();
            SubjectTypes.verifySubjectTypeAbsent(testData.typeName);

            // Step 20: Switch to University tenant and verify presence
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
            SubjectTypes.waitLoading();
            SubjectTypes.verifySubjectTypeExists({
              name: testData.typeName,
              source: CONSTANTS.LOCAL_SOURCE,
              user: user.lastName,
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
