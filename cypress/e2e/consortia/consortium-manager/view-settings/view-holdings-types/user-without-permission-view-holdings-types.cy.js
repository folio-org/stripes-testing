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
import HoldingsTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import HoldingsTypes from '../../../../../support/fragments/settings/inventory/holdings/holdingsTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Holdings types', () => {
        const testData = {
          centralSharedHoldingsType: {
            payload: {
              name: getTestEntityValue('C411481_centralSharedHoldingsType'),
            },
          },
          centralLocalHoldingsType: {
            name: getTestEntityValue('C411481_centralLocalHoldingsType'),
            source: 'local',
          },
          collegeLocalHoldingsType: {
            name: getTestEntityValue('C411481_collegeLocalHoldingsType'),
            source: 'local',
          },
          universityLocalHoldingsType: {
            name: getTestEntityValue('C411481_universityLocalHoldingsType'),
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

        let tempUserC411481;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          HoldingsTypesConsortiumManager.createViaApi(testData.centralSharedHoldingsType).then(
            (newHoldingsType) => {
              testData.centralSharedHoldingsType = newHoldingsType;
            },
          );
          HoldingsTypes.createViaApi(testData.centralLocalHoldingsType).then((response) => {
            testData.centralLocalHoldingsType.id = response.body.id;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.inventoryCRUDHoldingsTypes.gui,
          ]).then((userProperties) => {
            tempUserC411481 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411481.userId);

            // Set up College (member-1) tenant with different permissions (no holdings types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411481.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            HoldingsTypes.createViaApi(testData.collegeLocalHoldingsType).then((response) => {
              testData.collegeLocalHoldingsType.id = response.body.id;
            });

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            HoldingsTypes.createViaApi(testData.universityLocalHoldingsType).then((response) => {
              testData.universityLocalHoldingsType.id = response.body.id;
            });
          });
        });

        after('delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          HoldingsTypes.deleteViaApi(testData.centralLocalHoldingsType.id);
          HoldingsTypesConsortiumManager.deleteViaApi(testData.centralSharedHoldingsType);
          Users.deleteViaApi(tempUserC411481.userId);

          cy.withinTenant(Affiliations.University, () => {
            HoldingsTypes.deleteViaApi(testData.universityLocalHoldingsType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            HoldingsTypes.deleteViaApi(testData.collegeLocalHoldingsType.id);
          });
        });

        it(
          'C411481 User without "inventory-storage.holdings-types.collection.get" permission is NOT able to view the list of holdings types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411481'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411481.username, tempUserC411481.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Holdings types and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared holdings type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedHoldingsType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedHoldingsType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: Verify central local holdings type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalHoldingsType.name,
              tenantNames.central,
              [
                testData.centralLocalHoldingsType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local holdings type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalHoldingsType.name,
            // );

            // Step 6: Verify university (member-2) local holdings type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalHoldingsType.name,
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
