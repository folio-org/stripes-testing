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
import InstanceNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceNoteTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Instance note types', () => {
        const testData = {
          centralSharedInstanceNoteType: {
            payload: {
              name: getTestEntityValue('C410911_centralSharedInstanceNoteType'),
            },
          },
          centralLocalInstanceNoteType: {
            name: getTestEntityValue('C410911_centralLocalInstanceNoteType'),
          },
          collegeLocalInstanceNoteType: {
            name: getTestEntityValue('C410911_collegeLocalInstanceNoteType'),
          },
          universityLocalInstanceNoteType: {
            name: getTestEntityValue('C410911_universityLocalInstanceNoteType'),
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
        let tempUserC410911;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          InstanceNoteTypesConsortiumManager.createViaApi(
            testData.centralSharedInstanceNoteType,
          ).then((newType) => {
            testData.centralSharedInstanceNoteType.id = newType.id;
          });
          InventoryInstance.createInstanceNoteTypeViaApi(
            testData.centralLocalInstanceNoteType.name,
          ).then((noteTypeId) => {
            testData.centralLocalInstanceNoteType.id = noteTypeId;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudInstanceNoteTypes.gui,
          ]).then((userProperties) => {
            tempUserC410911 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC410911.userId);

            // Set up College (member-1) tenant with Orders permissions (no instance note types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC410911.userId, [
              Permissions.uiOrdersView.gui,
            ]);
            InventoryInstance.createInstanceNoteTypeViaApi(
              testData.collegeLocalInstanceNoteType.name,
            ).then((noteTypeId) => {
              testData.collegeLocalInstanceNoteType.id = noteTypeId;
            });

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            InventoryInstance.createInstanceNoteTypeViaApi(
              testData.universityLocalInstanceNoteType.name,
            ).then((noteTypeId) => {
              testData.universityLocalInstanceNoteType.id = noteTypeId;
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.deleteInstanceNoteTypes(testData.centralLocalInstanceNoteType.id);
          InstanceNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedInstanceNoteType);
          Users.deleteViaApi(tempUserC410911.userId);

          cy.withinTenant(Affiliations.College, () => {
            cy.deleteInstanceNoteTypes(testData.collegeLocalInstanceNoteType.id);
          });
          cy.withinTenant(Affiliations.University, () => {
            cy.deleteInstanceNoteTypes(testData.universityLocalInstanceNoteType.id);
          });
        });

        it(
          'C410911 User without "inventory-storage.instance-note-types.collection.get" permission is NOT able to view the list of instance note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410911'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC410911.username, tempUserC410911.password);
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

            // Step 3: Navigate to instance note types and expect permission error
            InstanceNoteTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 4: Verify shared instance note type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedInstanceNoteType.payload.name,
              constants.memberLibraries.all,
              [
                testData.centralSharedInstanceNoteType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 5: Verify central local instance note type is visible with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalInstanceNoteType.name,
              tenantNames.central,
              [
                testData.centralLocalInstanceNoteType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 6: Verify college (member-1) local instance note type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalInstanceNoteType.name,
            // );

            // Step 7: Verify university (member-2) local instance note type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalInstanceNoteType.name,
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
