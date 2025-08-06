import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
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
              name: getTestEntityValue('C411457_centralSharedHoldingsNoteType'),
            },
          },
          centralLocalHoldingsNoteType: {
            name: getTestEntityValue('C411457_centralLocalHoldingsNoteType'),
            source: 'local',
          },
          collegeLocalHoldingsNoteType: {
            name: getTestEntityValue('C411457_collegeLocalHoldingsNoteType'),
            source: 'local',
          },
          universityLocalHoldingsNoteType: {
            name: getTestEntityValue('C411457_universityLocalHoldingsNoteType'),
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
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.inventoryCRUDHoldingsNoteTypes.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.inventoryCRUDHoldingsNoteTypes.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.inventoryCRUDHoldingsNoteTypes.gui,
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
          HoldingsNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedHoldingsNoteType);
          HoldingsNoteTypes.deleteViaApi(testData.centralLocalHoldingsNoteType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          HoldingsNoteTypes.deleteViaApi(testData.collegeLocalHoldingsNoteType.id);
          cy.setTenant(Affiliations.University);
          HoldingsNoteTypes.deleteViaApi(testData.universityLocalHoldingsNoteType.id);
        });

        it(
          'C411457 User with "Consortium manager: Can view existing settings" permission is able to view the list of holdings note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411457'] },
          () => {
            // Step 1: User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: User clicks on "Inventory" settings and "Holdings note types"
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsNoteTypesConsortiumManager.choose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // New button should NOT be displayed since Trillium (view permission only)
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: User sees central tenant shared holdings note type
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

            // Step 4: User sees central tenant local holdings note type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalHoldingsNoteType.name,
              tenantNames.central,
              [
                testData.centralLocalHoldingsNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify College local holdings note type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalHoldingsNoteType.name,
              tenantNames.college,
              [
                testData.collegeLocalHoldingsNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify University local holdings note type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalHoldingsNoteType.name,
              tenantNames.university,
              [
                testData.universityLocalHoldingsNoteType.name,
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

            // Step 10: User sees central tenant shared holdings note type
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

            // Step 11: Verify central tenant local holdings note type does not appear
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalHoldingsNoteType.name,
            );

            // Step 12: Verify College local holdings note type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalHoldingsNoteType.name,
              tenantNames.college,
              [
                testData.collegeLocalHoldingsNoteType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 13: Verify University local holdings note type appears
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalHoldingsNoteType.name,
              tenantNames.university,
              [
                testData.universityLocalHoldingsNoteType.name,
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
