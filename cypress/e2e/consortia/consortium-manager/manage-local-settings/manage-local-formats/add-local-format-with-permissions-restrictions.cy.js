import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import FormatsConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/formatsConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Formats from '../../../../../support/fragments/settings/inventory/instances/formats';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Formats', () => {
        let userA;
        let userB;
        const testData = {
          formatName: `AT_C410728_Format_${getRandomPostfix()}`,
          formatCode: `AT_C410728_Code_${getRandomPostfix()}`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A in Central tenant as specified in TestRail preconditions
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.crudFormats.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            // Assign User A affiliation to College (member-1) with Organizations view permission
            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(userA.userId, [Permissions.uiOrganizationsView.gui]);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userA.userId, [Permissions.crudFormats.gui]);

            // Create User B in Central tenant
            cy.resetTenant();
            cy.createTempUser([Permissions.crudFormats.gui]).then((userBProperties) => {
              userB = userBProperties;

              // Assign User B affiliations
              cy.assignAffiliationToUser(Affiliations.College, userB.userId);
              cy.assignAffiliationToUser(Affiliations.University, userB.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(userB.userId, [Permissions.crudFormats.gui]);

              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(userB.userId, [Permissions.crudFormats.gui]);

              cy.resetTenant();
              cy.login(userA.username, userA.password);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);

          // Clean up formats from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              Formats.getViaApi({ query: `name="${testData.formatName}"` }).then((formats) => {
                formats.forEach((format) => {
                  Formats.deleteViaApi(format.id);
                });
              });
            },
          );
        });

        it(
          'C410728 Add local format via "Consortium manager" app with permissions and affiliations restrictions (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410728'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Formats and verify permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            FormatsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears for member-1
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Create new format with permissions issue
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is disabled due to permission restrictions
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });

            // Steps 4-5: Fill in name and code fields
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.formatName });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: testData.formatCode });

            // Step 6: Verify Share checkbox unchecked and disabled
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
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
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(testData.formatName);
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

            // Step 12: Create new format successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.formatName });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: testData.formatCode });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.formatName);

            // Step 13: Click "Keep editing"
            ConfirmCreate.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 14: Save again
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.formatName);

            // Step 15: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.formatName,
                `${[tenantNames.central, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Verify two rows created (Central and University)
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

            // Step 16: Login as User B
            cy.login(userB.username, userB.password);

            // Step 17: Verify format in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyLocalFormatsInTheList({
              name: testData.formatName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 18: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyFormatsAbsentInTheList({ name: testData.formatName });

            // Step 19: Switch to University tenant and verify present
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
