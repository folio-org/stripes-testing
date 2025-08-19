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
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Instance status types', () => {
        let userA;
        let userB;
        const testData = {
          initialStatusTypeName: `AT_C411545_InstanceStatusType_${getRandomPostfix()}`,
          initialStatusTypeCode: `AT_C411545_${getRandomPostfix()}`,
          finalStatusTypeCode: `AT_C411545_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'instance status type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A in College (member-1) tenant as per TestRail preconditions
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((userProperties) => {
            userA = userProperties;

            // Assign User A permissions in Central tenant
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            ]);

            // Assign User A affiliation to University (member-2) with Instance status types permission
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            ]);

            // Create User B in Central tenant
            cy.resetTenant();
            cy.createTempUser([Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui]).then(
              (userBProperties) => {
                userB = userBProperties;

                // Assign User B affiliations and permissions
                cy.resetTenant();
                cy.assignAffiliationToUser(Affiliations.College, userB.userId);
                cy.assignAffiliationToUser(Affiliations.University, userB.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
                ]);

                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
                ]);

                // User A is logged in and switch affiliation to central tenant
                cy.resetTenant();
                cy.login(userA.username, userA.password);
                ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Delete User B from Central tenant (where it was created)
          Users.deleteViaApi(userB.userId);
          // Delete User A from College tenant (where it was created)
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
          // Clean up any remaining instance status types
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              InstanceStatusTypes.getViaApi({
                query: `name="${testData.initialStatusTypeName}"`,
              }).then((instanceStatusTypes) => {
                instanceStatusTypes.forEach((statusType) => {
                  InstanceStatusTypes.deleteViaApi(statusType.id);
                });
              });
            },
          );
        });

        it(
          'C411545 User with "Consortium manager: Can share settings to all members" permission can manage local instance status types via "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411545'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to Instance status types and verify permission error
            InstanceStatusTypeConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears for member-1
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 4: Create new instance status type with permissions issue
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
              name: testData.initialStatusTypeName,
            });

            // Step 6: Fill in code field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.initialStatusTypeCode,
            });

            // Step 7: Leave Share checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 8: Try to save and verify error
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.clickSave();
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));
            // ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            //   name: 'Error on saving data',
            // });
            // ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 9: Cancel creation
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.initialStatusTypeName,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 10: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 11: Unselect member-1 tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 12: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 13: Create new instance status type successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.initialStatusTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.initialStatusTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.initialStatusTypeName);

            // Step 14: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.initialStatusTypeName,
                `${[tenantNames.central, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Verify two rows created (Central and University)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialStatusTypeName,
              tenantNames.central,
              [
                testData.initialStatusTypeName,
                testData.initialStatusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialStatusTypeName,
              tenantNames.university,
              [
                testData.initialStatusTypeName,
                testData.initialStatusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Edit central tenant instance status type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.initialStatusTypeName,
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

            // Step 16: Clear code field (test validation)
            ConsortiaControlledVocabularyPaneset.clearTextField('code');

            // Step 17: Try to save with empty code and verify validation error
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              code: 'Please fill this in to continue',
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 18: Fill in new code
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.finalStatusTypeCode,
            });

            // Step 19: Save changes
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.initialStatusTypeName, tenantNames.central),
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialStatusTypeName,
              tenantNames.central,
              [
                testData.initialStatusTypeName,
                testData.finalStatusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify university tenant unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialStatusTypeName,
              tenantNames.university,
              [
                testData.initialStatusTypeName,
                testData.initialStatusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 20: Delete instance status type from University tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.initialStatusTypeName,
              tenantNames.university,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.initialStatusTypeName,
            );

            // Step 21: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.initialStatusTypeName),
            );

            // Verify University tenant row was deleted, Central remains
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.initialStatusTypeName,
              tenantNames.university,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialStatusTypeName,
              tenantNames.central,
              [
                testData.initialStatusTypeName,
                testData.finalStatusTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 22: Login as User B
            cy.login(userB.username, userB.password);

            // Step 23: Verify instance status type in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPES);
            InstanceStatusTypes.waitLoading();
            InstanceStatusTypes.verifyLocalInstanceStatusTypesInTheList({
              name: testData.initialStatusTypeName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 24: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPES);
            InstanceStatusTypes.waitLoading();
            InstanceStatusTypes.verifyInstanceStatusTypesAbsentInTheList({
              name: testData.initialStatusTypeName,
            });

            // Step 25: Switch to University tenant and verify deleted instance status type NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPES);
            InstanceStatusTypes.waitLoading();
            InstanceStatusTypes.verifyInstanceStatusTypesAbsentInTheList({
              name: testData.initialStatusTypeName,
            });
          },
        );
      });
    });
  });
});
