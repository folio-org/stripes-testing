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
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Holdings sources', () => {
        let userA;
        let userB;
        const testData = {
          sourceName: `AT_C648484_HoldingsSource_${getRandomPostfix()}`,
        };

        // User A capability sets (edit/view consortium manager, view holdings sources in Central, Organizations view in College, Holdings sources view in University)
        const capabSetsUserACentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
          CapabilitySets.uiInventorySettingsHoldingsSourcesView,
        ];
        const capabSetsUserACollege = [CapabilitySets.uiOrganizationsView]; // Organizations view - using permission for now
        const capabSetsUserAUniversity = [CapabilitySets.uiInventorySettingsHoldingsSourcesView];

        // User B capability sets (holdings sources view in all tenants)
        const capabSetsUserB = [CapabilitySets.uiInventorySettingsHoldingsSourcesView];

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A
          cy.createTempUser([]).then((userProperties) => {
            userA = userProperties;
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserACentral);

            // Assign User A affiliations and capabilities
            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserACollege);
            // Assign Organizations view permission in College for User A
            cy.assignPermissionsToExistingUser(userA.userId, [Permissions.uiOrganizationsView.gui]);

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserAUniversity);

            // Create User B
            cy.resetTenant();
            cy.createTempUser([]).then((userBProperties) => {
              userB = userBProperties;
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              // Assign User B affiliations
              cy.assignAffiliationToUser(Affiliations.College, userB.userId);
              cy.setTenant(Affiliations.College);
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, userB.userId);
              cy.setTenant(Affiliations.University);
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

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

          // Clean up holdings sources from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              HoldingsSources.getHoldingsSourcesViaApi({
                query: `name="${testData.sourceName}"`,
              }).then((holdingsSources) => {
                holdingsSources.forEach((holdingsSource) => {
                  HoldingsSources.deleteViaApi(holdingsSource.id);
                });
              });
            },
          );
        });

        it(
          'C648484 Add local holdings source via "Consortium manager" app with permissions and affiliations restrictions (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C648484'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Holdings sources and verify permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears for member-1
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Create new holdings source with permissions issue
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is disabled due to permission restrictions
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });

            // Step 4: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sourceName });

            // Step 5: Try to save and verify error
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.clickSave();
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));
            // ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            //   name: 'Error on saving data',
            // });
            // ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 6: Cancel creation
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(testData.sourceName);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 7: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Unselect member-1 tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 9: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: Create new holdings source successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sourceName });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.sourceName);

            // Step 11: Click "Keep editing"
            ConfirmCreate.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 12: Save again and confirm
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.sourceName);
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.sourceName,
                `${[tenantNames.central, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Verify two rows created (Central and University)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.central,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.university,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.university],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 13: Login as User B
            cy.login(userB.username, userB.password);

            // Step 14: Verify holdings source in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyLocalHoldingsSourcesInTheList({
              name: testData.sourceName,
              source: 'local',
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 15: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyHoldingsSourcesAbsentInTheList({ name: testData.sourceName });

            // Step 16: Switch to University tenant and verify present
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyLocalHoldingsSourcesInTheList({
              name: testData.sourceName,
              source: 'local',
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
