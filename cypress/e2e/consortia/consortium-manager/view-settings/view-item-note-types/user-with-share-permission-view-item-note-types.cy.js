import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ItemNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ItemNoteTypes from '../../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Item note types', () => {
        const testData = {
          centralSharedItemNoteType: {
            payload: {
              name: getTestEntityValue('C411439_centralSharedItemNoteType'),
            },
          },
          centralLocalItemNoteType: {
            name: getTestEntityValue('C411439_centralLocalItemNoteType'),
            source: 'local',
          },
          collegeLocalItemNoteType: {
            name: getTestEntityValue('C411439_collegeLocalItemNoteType'),
            source: 'local',
          },
          universityLocalItemNoteType: {
            name: getTestEntityValue('C411439_universityLocalItemNoteType'),
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

        let tempUserC411439;

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
              cy.createTempUser([Permissions.inventoryCRUDItemNoteTypes.gui]).then(
                (userProperties) => {
                  tempUserC411439 = userProperties;
                  ItemNoteTypes.createItemNoteTypeViaApi(
                    testData.collegeLocalItemNoteType.name,
                  ).then((id) => {
                    testData.collegeLocalItemNoteType.id = id;
                  });

                  cy.resetTenant();
                  // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
                  cy.assignAffiliationToUser(Affiliations.University, tempUserC411439.userId);
                  cy.assignPermissionsToExistingUser(tempUserC411439.userId, [
                    Permissions.consortiaSettingsConsortiumManagerShare.gui,
                    Permissions.inventoryCRUDItemNoteTypes.gui,
                  ]);

                  // Set up permissions in University (member-2) tenant
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(tempUserC411439.userId, [
                    Permissions.inventoryCRUDItemNoteTypes.gui,
                  ]);
                  ItemNoteTypes.createItemNoteTypeViaApi(
                    testData.universityLocalItemNoteType.name,
                  ).then((id) => {
                    testData.universityLocalItemNoteType.id = id;
                  });
                },
              );
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.centralLocalItemNoteType.id);
          ItemNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedItemNoteType);
          Users.deleteViaApi(tempUserC411439.userId);

          cy.withinTenant(Affiliations.College, () => {
            ItemNoteTypes.deleteItemNoteTypeViaApi(testData.collegeLocalItemNoteType.id);
            Users.deleteViaApi(tempUserC411439.userId);
          });

          cy.withinTenant(Affiliations.University, () => {
            ItemNoteTypes.deleteItemNoteTypeViaApi(testData.universityLocalItemNoteType.id);
          });
        });

        it(
          'C411439 User with "Consortium manager: Can share settings to all members" permission is able to view the list of item note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411439'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(tempUserC411439.username, tempUserC411439.password);
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Inventory > Item note types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();
            // New button should NOT be displayed since Trillium (user has share permission)
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify central tenant shared item note type appears (no action icons since Trillium)
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

            // Step 4: Verify central tenant local item note type appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalItemNoteType.name,
              tenantNames.central,
              [
                testData.centralLocalItemNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify College (member-1) local item note type appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalItemNoteType.name,
              tenantNames.college,
              [
                testData.collegeLocalItemNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify University (member-2) local item note type appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalItemNoteType.name,
              tenantNames.university,
              [
                testData.universityLocalItemNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Step 7: Click "Select members" button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Uncheck member-1 and member-2 tenants, leaving only central
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 9: Save selection with only central tenant selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 10: Verify central tenant shared item note type still appears (no action icons since Trillium)
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

            // Step 11: Verify central tenant local item note type still appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalItemNoteType.name,
              tenantNames.central,
              [
                testData.centralLocalItemNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 12: Verify College (member-1) local item note type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalItemNoteType.name,
            );

            // Step 13: Verify University (member-2) local item note type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalItemNoteType.name,
            );
          },
        );
      });
    });
  });
});
