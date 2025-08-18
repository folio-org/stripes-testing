import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
  // messages,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ModesOfIssuanceConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/modesOfIssuanceConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Modes of issuance', () => {
        const testData = {
          centralSharedModes: {
            payload: {
              name: getTestEntityValue('C410941_centralSharedModes'),
            },
          },
          centralLocalModes: {
            id: uuid(),
            name: getTestEntityValue('C410941_centralLocalModes'),
          },
          collegeLocalModes: {
            id: uuid(),
            name: getTestEntityValue('C410941_collegeLocalModes'),
          },
          universityLocalModes: {
            id: uuid(),
            name: getTestEntityValue('C410941_universityLocalModes'),
          },
        };

        const constants = {
          source: {
            consortium: 'consortium',
          },
          memberLibraries: {
            all: 'All',
          },
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Create shared mode of issuance
          ModesOfIssuanceConsortiumManager.createViaApi(testData.centralSharedModes).then(
            (newModes) => {
              testData.centralSharedModes = newModes;
            },
          );
          // Create local mode of issuance in central tenant
          InventoryInstance.createModesOfIssuanceViaApi(testData.centralLocalModes.name).then(
            (modesId) => {
              testData.centralLocalModes.id = modesId;
            },
          );
          // Create local mode of issuance in college tenant
          cy.setTenant(Affiliations.College);
          InventoryInstance.createModesOfIssuanceViaApi(testData.collegeLocalModes.name).then(
            (modesId) => {
              testData.collegeLocalModes.id = modesId;
            },
          );
          // Create local mode of issuance in university tenant
          cy.setTenant(Affiliations.University);
          InventoryInstance.createModesOfIssuanceViaApi(testData.universityLocalModes.name).then(
            (modesId) => {
              testData.universityLocalModes.id = modesId;
            },
          );

          // Create user without the required permission
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            // Assign affiliation to college tenant only
            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            // Assign a different permission (Finance: View fiscal year) instead of modes of issuance permission
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);

            cy.resetTenant();
            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.deleteModesOfIssuance(testData.centralLocalModes.id);
          ModesOfIssuanceConsortiumManager.deleteViaApi(testData.centralSharedModes);
          Users.deleteViaApi(testData.user.userId);

          cy.setTenant(Affiliations.College);
          cy.deleteModesOfIssuance(testData.collegeLocalModes.id);

          cy.setTenant(Affiliations.University);
          cy.deleteModesOfIssuance(testData.universityLocalModes.id);
        });

        it(
          'C410941 User without "inventory-storage.modes-of-issuance.collection.get" permission is NOT able to view the list of modes of issuance of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410941'] },
          () => {
            // Step 1: Navigate to Consortium manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Modes of issuance settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ModesOfIssuanceConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Toast message should appear
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared mode of issuance is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedModes.payload.name,
              constants.source.consortium,
              '',
              constants.memberLibraries.all,
            ]);

            // Step 4: Verify central local mode of issuance is displayed with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.centralLocalModes.name, 'local', '', tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college local mode of issuance is NOT displayed
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalModes.name,
            // );

            // Step 6: Verify university local mode of issuance is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalModes.name,
            );

            // Step 7: Open Select members modal and verify its state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all members
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 9: Save and verify empty list
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);
          },
        );
      });
    });
  });
});
