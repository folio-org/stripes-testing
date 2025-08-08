import moment from 'moment';
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
import AlternativeTitleTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Alternative title types', () => {
        const testData = {
          centralSharedAlternativeTitleType: {
            payload: {
              name: getTestEntityValue('C410857_centralSharedAlternativeTitleType'),
            },
          },
          centralLocalAlternativeTitleType: {
            name: getTestEntityValue('C410857_centralLocalAlternativeTitleType'),
          },
          collegeLocalAlternativeTitleType: {
            name: getTestEntityValue('C410857_collegeLocalAlternativeTitleType'),
          },
          universityLocalAlternativeTitleType: {
            name: getTestEntityValue('C410857_universityLocalAlternativeTitleType'),
          },
        };

        const constants = {
          source: {
            consortium: 'consortium',
            local: 'local',
          },
          memberLibraries: {
            all: 'All',
          },
        };
        let tempUserC410857;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          AlternativeTitleTypesConsortiumManager.createViaApi(
            testData.centralSharedAlternativeTitleType,
          ).then((newType) => {
            testData.centralSharedAlternativeTitleType.id = newType.id;
          });
          InventoryInstance.createAlternativeTitleTypeViaAPI(
            testData.centralLocalAlternativeTitleType.name,
          ).then((alternativeTitleTypeID) => {
            testData.centralLocalAlternativeTitleType.id = alternativeTitleTypeID;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudAlternativeTitleTypes.gui,
          ]).then((userProperties) => {
            tempUserC410857 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC410857.userId);

            // Set up College (member-1) tenant with Orders permissions (no alternative title types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC410857.userId, [
              Permissions.uiOrdersView.gui,
            ]);
            InventoryInstance.createAlternativeTitleTypeViaAPI(
              testData.collegeLocalAlternativeTitleType.name,
            ).then((alternativeTitleTypeID) => {
              testData.collegeLocalAlternativeTitleType.id = alternativeTitleTypeID;
            });

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            InventoryInstance.createAlternativeTitleTypeViaAPI(
              testData.universityLocalAlternativeTitleType.name,
            ).then((alternativeTitleTypeID) => {
              testData.universityLocalAlternativeTitleType.id = alternativeTitleTypeID;
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.deleteAlternativeTitleTypes(testData.centralLocalAlternativeTitleType.id);
          AlternativeTitleTypesConsortiumManager.deleteViaApi(
            testData.centralSharedAlternativeTitleType,
          );
          Users.deleteViaApi(tempUserC410857.userId);

          cy.withinTenant(Affiliations.College, () => {
            cy.deleteAlternativeTitleTypes(testData.collegeLocalAlternativeTitleType.id);
          });
          cy.withinTenant(Affiliations.University, () => {
            cy.deleteAlternativeTitleTypes(testData.universityLocalAlternativeTitleType.id);
          });
        });

        it(
          'C410857 User without "inventory-storage.alternative-title-types.collection.get" permission is NOT able to view the list of alternative title types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410857'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC410857.username, tempUserC410857.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to alternative title types and expect permission error
            AlternativeTitleTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 4: Verify shared alternative title type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedAlternativeTitleType.payload.name,
              constants.memberLibraries.all,
              [
                testData.centralSharedAlternativeTitleType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 5: Verify central local alternative title type is visible with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalAlternativeTitleType.name,
              tenantNames.central,
              [
                testData.centralLocalAlternativeTitleType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 6: Verify college (member-1) local alternative title type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalAlternativeTitleType.name,
            // );

            // Step 7: Verify university (member-2) local alternative title type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalAlternativeTitleType.name,
            );

            // Step 8: Click Select members to verify modal state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 9: Uncheck all members
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 10: Save with 0 members selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);

            // Verify "The list contains no items" message and disabled New button
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);
          },
        );
      });
    });
  });
});
