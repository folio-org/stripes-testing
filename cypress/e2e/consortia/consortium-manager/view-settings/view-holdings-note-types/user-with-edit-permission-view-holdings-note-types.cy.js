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
import HoldingsNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import HoldingsNoteTypes from '../../../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Holdings note types', () => {
        const testData = {
          centralSharedHoldingsNoteType: {
            payload: {
              name: getTestEntityValue('C411458_centralSharedHoldingsNoteType'),
            },
          },
          centralLocalHoldingsNoteType: {
            name: getTestEntityValue('C411458_centralLocalHoldingsNoteType'),
            source: 'local',
          },
          collegeLocalHoldingsNoteType: {
            name: getTestEntityValue('C411458_collegeLocalHoldingsNoteType'),
            source: 'local',
          },
          universityLocalHoldingsNoteType: {
            name: getTestEntityValue('C411458_universityLocalHoldingsNoteType'),
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
              HoldingsNoteTypesConsortiumManager.createViaApi(
                testData.centralSharedHoldingsNoteType,
              ).then((newHoldingsNoteType) => {
                testData.centralSharedHoldingsNoteType = newHoldingsNoteType;
              });
            })
            .then(() => {
              cy.resetTenant();
              HoldingsNoteTypes.createViaApi(testData.centralLocalHoldingsNoteType).then(
                (response) => {
                  testData.centralLocalHoldingsNoteType.id = response.body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              HoldingsNoteTypes.createViaApi(testData.collegeLocalHoldingsNoteType).then(
                (response) => {
                  testData.collegeLocalHoldingsNoteType.id = response.body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              HoldingsNoteTypes.createViaApi(testData.universityLocalHoldingsNoteType).then(
                (response) => {
                  testData.universityLocalHoldingsNoteType.id = response.body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser([Permissions.inventoryCRUDHoldingsNoteTypes.gui]).then(
                (userProperties) => {
                  testData.user = userProperties;

                  cy.resetTenant();
                  cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                    Permissions.inventoryCRUDHoldingsNoteTypes.gui,
                  ]);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.inventoryCRUDHoldingsNoteTypes.gui,
                  ]);
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password);
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                cy.reload();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              }, 20_000);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          HoldingsNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedHoldingsNoteType);
          HoldingsNoteTypes.deleteViaApi(testData.centralLocalHoldingsNoteType.id);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(testData.user.userId);
          HoldingsNoteTypes.deleteViaApi(testData.collegeLocalHoldingsNoteType.id);
          cy.setTenant(Affiliations.University);
          HoldingsNoteTypes.deleteViaApi(testData.universityLocalHoldingsNoteType.id);
        });

        it(
          'C411458 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of holdings note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411458'] },
          () => {
            // Step 1: Click "Consortium manager" app and set up members selection
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Click "Select members" button to verify modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 3: Uncheck University tenant (member-2)
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 4: Save selection with 2 members
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: Navigate to Holdings note types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsNoteTypesConsortiumManager.choose();
            // New button should be displayed (edit permissions)
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: Verify central shared holdings note type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedHoldingsNoteType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedHoldingsNoteType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 7: Verify central local holdings note type with edit actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalHoldingsNoteType.name,
              tenantNames.central,
              [
                testData.centralLocalHoldingsNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify College local holdings note type with edit actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalHoldingsNoteType.name,
              tenantNames.college,
              [
                testData.collegeLocalHoldingsNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify University local holdings note type is NOT present
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalHoldingsNoteType.name,
            );

            // Step 10: Click "Select members" button again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Uncheck College tenant (member-1)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 12: Save selection with only central tenant
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify central shared holdings note type still present
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedHoldingsNoteType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedHoldingsNoteType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 14: Verify central local holdings note type still present with edit actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalHoldingsNoteType.name,
              tenantNames.central,
              [
                testData.centralLocalHoldingsNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify College local holdings note type is NOT present
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalHoldingsNoteType.name,
            );

            // Step 16: Verify University local holdings note type is NOT present
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalHoldingsNoteType.name,
            );
          },
        );
      });
    });
  });
});
