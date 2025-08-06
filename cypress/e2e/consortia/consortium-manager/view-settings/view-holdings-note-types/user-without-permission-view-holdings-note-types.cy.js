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
import HoldingsNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import HoldingsNoteTypes from '../../../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Holdings note types', () => {
        const testData = {
          centralSharedHoldingsNoteType: {
            payload: {
              name: getTestEntityValue('C411459_centralSharedHoldingsNoteType'),
            },
          },
          centralLocalHoldingsNoteType: {
            name: getTestEntityValue('C411459_centralLocalHoldingsNoteType'),
            source: 'local',
          },
          collegeLocalHoldingsNoteType: {
            name: getTestEntityValue('C411459_collegeLocalHoldingsNoteType'),
            source: 'local',
          },
          universityLocalHoldingsNoteType: {
            name: getTestEntityValue('C411459_universityLocalHoldingsNoteType'),
            source: 'local',
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

        let tempUserC411459;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          HoldingsNoteTypesConsortiumManager.createViaApi(
            testData.centralSharedHoldingsNoteType,
          ).then((newHoldingsNoteType) => {
            testData.centralSharedHoldingsNoteType = newHoldingsNoteType;
          });
          HoldingsNoteTypes.createViaApi(testData.centralLocalHoldingsNoteType).then((response) => {
            testData.centralLocalHoldingsNoteType.id = response.body.id;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.inventoryCRUDHoldingsNoteTypes.gui,
          ]).then((userProperties) => {
            tempUserC411459 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411459.userId);

            // Set up College (member-1) tenant with different permissions (no holdings note types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411459.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            HoldingsNoteTypes.createViaApi(testData.collegeLocalHoldingsNoteType).then(
              (response) => {
                testData.collegeLocalHoldingsNoteType.id = response.body.id;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            HoldingsNoteTypes.createViaApi(testData.universityLocalHoldingsNoteType).then(
              (response) => {
                testData.universityLocalHoldingsNoteType.id = response.body.id;
              },
            );
          });
        });

        after('delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          HoldingsNoteTypes.deleteViaApi(testData.centralLocalHoldingsNoteType.id);
          HoldingsNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedHoldingsNoteType);
          Users.deleteViaApi(tempUserC411459.userId);

          cy.withinTenant(Affiliations.University, () => {
            HoldingsNoteTypes.deleteViaApi(testData.universityLocalHoldingsNoteType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            HoldingsNoteTypes.deleteViaApi(testData.collegeLocalHoldingsNoteType.id);
          });
        });

        it(
          'C411459 User without "inventory-storage.holdings-note-types.collection.get" permission is NOT able to view the list of holdings note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411459'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411459.username, tempUserC411459.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Holdings note types and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsNoteTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared holdings note type is visible
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

            // Step 4: Verify central local holdings note type is visible
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

            // Step 5: Verify college (member-1) local holdings note type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalHoldingsNoteType.name,
            // );

            // Step 6: Verify university (member-2) local holdings note type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalHoldingsNoteType.name,
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
