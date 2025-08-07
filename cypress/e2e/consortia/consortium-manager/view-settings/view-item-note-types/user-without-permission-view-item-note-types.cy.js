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
import ItemNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ItemNoteTypes from '../../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Item note types', () => {
        const testData = {
          centralSharedItemNoteType: {
            payload: {
              name: getTestEntityValue('C411438_centralSharedItemNoteType'),
            },
          },
          centralLocalItemNoteType: {
            name: getTestEntityValue('C411438_centralLocalItemNoteType'),
            source: 'local',
          },
          collegeLocalItemNoteType: {
            name: getTestEntityValue('C411438_collegeLocalItemNoteType'),
            source: 'local',
          },
          universityLocalItemNoteType: {
            name: getTestEntityValue('C411438_universityLocalItemNoteType'),
            source: 'local',
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

        let tempUserC411438;

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              ItemNoteTypesConsortiumManager.createViaApi(testData.centralSharedItemNoteType).then(
                (newItemNoteType) => {
                  testData.centralSharedItemNoteType = newItemNoteType;
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              ItemNoteTypes.createItemNoteTypeViaApi(testData.centralLocalItemNoteType.name).then(
                (id) => {
                  testData.centralLocalItemNoteType.id = id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              ItemNoteTypes.createItemNoteTypeViaApi(testData.collegeLocalItemNoteType.name).then(
                (id) => {
                  testData.collegeLocalItemNoteType.id = id;
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.inventoryCRUDItemNoteTypes.gui,
              ]).then((userProperties) => {
                tempUserC411438 = userProperties;

                // Assign affiliation to member-1 (College) tenant only
                cy.assignAffiliationToUser(Affiliations.College, tempUserC411438.userId);

                // Set up permissions in College (member-1) tenant - only Finance: View fiscal year
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(tempUserC411438.userId, [
                  Permissions.uiFinanceViewFiscalYear.gui,
                ]);

                // Set up University (member-2) tenant - user has no affiliation here
                cy.setTenant(Affiliations.University);
                ItemNoteTypes.createItemNoteTypeViaApi(
                  testData.universityLocalItemNoteType.name,
                ).then((id) => {
                  testData.universityLocalItemNoteType.id = id;
                });
              });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.centralLocalItemNoteType.id);
          ItemNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedItemNoteType);
          Users.deleteViaApi(tempUserC411438.userId);

          cy.withinTenant(Affiliations.College, () => {
            ItemNoteTypes.deleteItemNoteTypeViaApi(testData.collegeLocalItemNoteType.id);
          });

          cy.withinTenant(Affiliations.University, () => {
            ItemNoteTypes.deleteItemNoteTypeViaApi(testData.universityLocalItemNoteType.id);
          });
        });

        it(
          'C411438 User without "inventory-storage.item-note-types.collection.get" permission is NOT able to view the list of item note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411438'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411438.username, tempUserC411438.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Item note types and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared item note type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedItemNoteType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedItemNoteType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: Verify central local item note type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalItemNoteType.name,
              tenantNames.central,
              [
                testData.centralLocalItemNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local item note type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalItemNoteType.name,
            // );

            // Step 6: Verify university (member-2) local item note type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalItemNoteType.name,
            );

            // Step 7: Click Select members to verify modal state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all members
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 9: Save with 0 members selected
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
