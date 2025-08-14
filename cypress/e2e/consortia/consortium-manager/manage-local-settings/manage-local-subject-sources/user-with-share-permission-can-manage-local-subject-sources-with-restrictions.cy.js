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
import SubjectSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectSources from '../../../../../support/fragments/settings/inventory/instances/subjectSources';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Subject sources', () => {
        let userA;
        let userB;
        const testData = {
          initialSourceName: `AT_C594438_SubjectSource_${getRandomPostfix()}`,
          finalSourceName: `AT_C594438_SubjectSource_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'subject source',
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
              Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
            ]);

            // Assign User A affiliation to University (member-2) with Subject sources permission
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
            ]);

            // Create User B in Central tenant
            cy.resetTenant();
            cy.createTempUser([Permissions.uiSettingsSubjectSourceCreateEditDelete.gui]).then(
              (userBProperties) => {
                userB = userBProperties;

                // Assign User B affiliations and permissions
                cy.resetTenant();
                cy.assignAffiliationToUser(Affiliations.College, userB.userId);
                cy.assignAffiliationToUser(Affiliations.University, userB.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
                ]);

                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
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
          cy.resetTenant();
          Users.deleteViaApi(userB.userId);
          // Delete User A from College tenant (where it was created)
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
          // Clean up any remaining subject sources
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              [testData.initialSourceName, testData.finalSourceName].forEach((sourceName) => {
                SubjectSources.getSubjectSourcesViaApi({
                  query: `name="${sourceName}"`,
                }).then((subjectSources) => {
                  subjectSources.forEach((subjectSource) => {
                    SubjectSources.deleteViaApi(subjectSource.id);
                  });
                });
              });
            },
          );
        });

        it(
          'C594438 User with "Consortium manager: Can share settings to all members" permission can manage local subject sources via "Consortium manager" app (consortia) (folijet)',
          { tags: ['extendedPathECS', 'folijet', 'C594438'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to Subject sources and verify permission error
            SubjectSourcesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears for member-1
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 4: Create new subject source with permissions issue
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
              name: testData.initialSourceName,
            });

            // Step 6: Leave Share checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 7: Try to save and verify error
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.clickSave();
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));
            // ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            //   name: 'Error on saving data',
            // });
            // ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 8: Cancel creation
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.initialSourceName,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 9: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 10: Unselect member-1 tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 12: Create new subject source successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.initialSourceName,
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.initialSourceName);

            // Step 13: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.initialSourceName,
                `${[tenantNames.central, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Verify two rows created (Central and University)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialSourceName,
              tenantNames.central,
              [
                testData.initialSourceName,
                '',
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialSourceName,
              tenantNames.university,
              [
                testData.initialSourceName,
                '',
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 14: Edit central tenant subject source
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.initialSourceName,
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

            // Step 15: Clear name field (test validation)
            ConsortiaControlledVocabularyPaneset.clearTextField('name');

            // Step 16: Try to save with empty name and verify validation error
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: 'Please fill this in to continue',
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 17: Fill in new name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.finalSourceName,
            });

            // Step 18: Save changes
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              `${testData.finalSourceName} was successfully updated for ${tenantNames.central} library.`,
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.finalSourceName,
              tenantNames.central,
              [
                testData.finalSourceName,
                '',
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify university tenant unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.initialSourceName,
              tenantNames.university,
              [
                testData.initialSourceName,
                '',
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 19: Delete subject source from University tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.initialSourceName,
              tenantNames.university,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.initialSourceName,
            );

            // Step 20: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.initialSourceName),
            );

            // Verify University tenant row was deleted, Central remains
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.initialSourceName,
              tenantNames.university,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.finalSourceName,
              tenantNames.central,
              [
                testData.finalSourceName,
                '',
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 21: Login as User B
            cy.login(userB.username, userB.password);

            // Step 22: Verify subject source in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.waitLoading();
            SubjectSources.verifySubjectSourceExists(
              testData.finalSourceName,
              CONSTANTS.LOCAL_SOURCE,
              userA.lastName,
              { actions: [actionIcons.edit, actionIcons.trash] },
            );

            // Step 23: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.waitLoading();
            SubjectSources.verifySubjectSourceAbsent(testData.finalSourceName);

            // Step 24: Switch to University tenant and verify deleted source NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
            SubjectSources.waitLoading();
            SubjectSources.verifySubjectSourceAbsent(testData.initialSourceName);
          },
        );
      });
    });
  });
});
