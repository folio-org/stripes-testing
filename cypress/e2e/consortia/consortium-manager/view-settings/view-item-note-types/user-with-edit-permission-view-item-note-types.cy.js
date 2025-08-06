import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
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
              name: getTestEntityValue('C411437_centralSharedItemNoteType'),
            },
          },
          centralLocalItemNoteType: {
            name: getTestEntityValue('C411437_centralLocalItemNoteType'),
            source: 'local',
          },
          collegeLocalItemNoteType: {
            name: getTestEntityValue('C411437_collegeLocalItemNoteType'),
            source: 'local',
          },
          universityLocalItemNoteType: {
            name: getTestEntityValue('C411437_universityLocalItemNoteType'),
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
              cy.setTenant(Affiliations.University);
              ItemNoteTypes.createItemNoteTypeViaApi(
                testData.universityLocalItemNoteType.name,
              ).then((id) => {
                testData.universityLocalItemNoteType.id = id;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser([Permissions.inventoryCRUDItemNoteTypes.gui]).then(
                (userProperties) => {
                  testData.user = userProperties;

                  cy.resetTenant();
                  // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
                  cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                    Permissions.inventoryCRUDItemNoteTypes.gui,
                  ]);

                  // Set up permissions in University (member-2) tenant
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.inventoryCRUDItemNoteTypes.gui,
                  ]);
                },
              );
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ItemNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedItemNoteType);
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.centralLocalItemNoteType.id);
          cy.setTenant(Affiliations.College);
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.collegeLocalItemNoteType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.University);
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.universityLocalItemNoteType.id);
        });

        it(
          'C411437 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of item note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411437'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password);
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: User opens "Consortium manager" app and selects all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Click "Select members" button to verify modal functionality
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 3: Uncheck member-2 (University) tenant
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 4: Save selection and verify 2 members selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: Navigate to Inventory > Item note types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();
            // New button SHOULD be displayed since user has create/edit/remove permission
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: Verify central tenant shared item note type appears
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

            // Step 7: Verify central tenant local item note type appears with edit/delete actions
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

            // Step 8: Verify College local item note type appears with edit/delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalItemNoteType.name,
              tenantNames.college,
              [
                testData.collegeLocalItemNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify University local item note type does NOT appear (unselected)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalItemNoteType.name,
            );

            // Step 10: Click "Select members" button again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Uncheck member-1 (College) tenant - only central should remain
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 12: Save selection and verify only 1 member selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify central tenant shared item note type still appears
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

            // Step 14: Verify central tenant local item note type still appears
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

            // Step 15: Verify College local item note type does NOT appear (unselected)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalItemNoteType.name,
            );

            // Step 16: Verify University local item note type does NOT appear (unselected)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalItemNoteType.name,
            );
          },
        );
      });
    });
  });
});
