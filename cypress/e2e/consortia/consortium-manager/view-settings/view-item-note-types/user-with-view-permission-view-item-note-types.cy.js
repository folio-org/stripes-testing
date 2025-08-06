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
              name: getTestEntityValue('C411436_centralSharedItemNoteType'),
            },
          },
          centralLocalItemNoteType: {
            name: getTestEntityValue('C411436_centralLocalItemNoteType'),
            source: 'local',
          },
          collegeLocalItemNoteType: {
            name: getTestEntityValue('C411436_collegeLocalItemNoteType'),
            source: 'local',
          },
          universityLocalItemNoteType: {
            name: getTestEntityValue('C411436_universityLocalItemNoteType'),
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
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.inventoryCRUDItemNoteTypes.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.inventoryCRUDItemNoteTypes.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.inventoryCRUDItemNoteTypes.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ItemNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedItemNoteType);
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.centralLocalItemNoteType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.collegeLocalItemNoteType.id);
          cy.setTenant(Affiliations.University);
          ItemNoteTypes.deleteItemNoteTypeViaApi(testData.universityLocalItemNoteType.id);
        });

        it(
          'C411436 User with "Consortium manager: Can view existing settings" permission is able to view the list of item note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411436'] },
          () => {
            // Step 1: User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: User clicks on "Inventory" settings and "Item note types"
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();
            // New button should NOT be displayed since Trillium (view permission only)
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: User sees central tenant shared item note type
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

            // Step 4: User sees central tenant local item note type
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

            // Step 5: Verify College local item note type appears
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

            // Step 6: Verify University local item note type appears
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

            // Step 8: Uncheck central tenant
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 9: Save selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: User sees central tenant shared item note type
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

            // Step 11: Verify central tenant local item note type does not appear
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalItemNoteType.name,
            );

            // Step 12: Verify College local item note type appears
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

            // Step 13: Verify University local item note type appears
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
          },
        );
      });
    });
  });
});
