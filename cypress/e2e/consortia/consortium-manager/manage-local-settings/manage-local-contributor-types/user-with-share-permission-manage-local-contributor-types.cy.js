import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ContributorTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/contributorTypesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ContributorTypes from '../../../../../support/fragments/settings/inventory/instances/contributorTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Contributor types', () => {
        let user;
        const testData = {
          contributorTypeName: `AT_C411522_ContributorType_${getRandomPostfix()}`,
          contributorTypeCode: `AT_C411522_${getRandomPostfix()}`,
          editedContributorTypeName: `AT_C411522_ContributorType_${getRandomPostfix()}_edited`,
          editedContributorTypeCode: `AT_C411522_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'contributor type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create user with share permission in Central tenant per TestRail preconditions
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudContributorTypes.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Assign affiliation to College (member-1) and assign permissions
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.crudContributorTypes.gui]);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.crudContributorTypes.gui]);

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          // Clean up contributor types from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              [testData.contributorTypeName, testData.editedContributorTypeName].forEach(
                (typeName) => {
                  ContributorTypes.getViaApi({
                    query: `name="${typeName}"`,
                  }).then((contributorTypes) => {
                    contributorTypes.forEach((contributorType) => {
                      ContributorTypes.deleteViaApi(contributorType.id);
                    });
                  });
                },
              );
            },
          );
        });

        it(
          'C411522 User with "Consortium manager: Can share settings to all members" permission is able to manage local contributor types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411522'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to Contributor types
            ContributorTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Step 4: Create new contributor type
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
              name: testData.contributorTypeName,
            });

            // Step 6: Fill in code field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.contributorTypeCode,
            });

            // Step 7: Leave Share checkbox unchecked and save
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.contributorTypeName);

            // Step 8: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.contributorTypeName,
                `${[tenantNames.central, tenantNames.college, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Steps 9-11: Verify three rows created (one for each tenant)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.contributorTypeName,
              tenantNames.central,
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.contributorTypeName,
              tenantNames.college,
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.contributorTypeName,
              tenantNames.university,
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 12: Edit central tenant contributor type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.contributorTypeName,
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
              name: testData.editedContributorTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedContributorTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 14: Cancel editing
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.contributorTypeName,
              tenantNames.central,
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
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
              testData.contributorTypeName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedContributorTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedContributorTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedContributorTypeName, tenantNames.central),
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedContributorTypeName,
              tenantNames.central,
              [
                testData.editedContributorTypeName,
                testData.editedContributorTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify other tenants unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.contributorTypeName,
              tenantNames.college,
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.contributorTypeName,
              tenantNames.university,
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 16: Delete contributor type from College tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.contributorTypeName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.contributorTypeName,
            );

            // Step 17: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.contributorTypeName),
            );

            // Verify College tenant row was deleted, others remain
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.contributorTypeName,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedContributorTypeName,
              tenantNames.central,
              [
                testData.editedContributorTypeName,
                testData.editedContributorTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.contributorTypeName,
              tenantNames.university,
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
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
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
            ContributorTypes.waitLoading();
            ContributorTypes.verifyLocalContributorTypesInTheList({
              name: testData.editedContributorTypeName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 19: Switch to College tenant and verify deletion
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
            ContributorTypes.waitLoading();
            ContributorTypes.verifyContributorTypesAbsentInTheList({
              name: testData.contributorTypeName,
            });

            // Step 20: Switch to University tenant and verify presence
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
            ContributorTypes.waitLoading();
            ContributorTypes.verifyLocalContributorTypesInTheList({
              name: testData.contributorTypeName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
