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
import CallNumberTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings-items/callNumberTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import { CallNumberTypes } from '../../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Call number types', () => {
        const testData = {
          centralSharedCallNumberType: {
            payload: {
              name: getTestEntityValue('C411394_centralSharedCallNumberType'),
            },
          },
          centralLocalCallNumberType: {
            name: getTestEntityValue('C411394_centralLocalCallNumberType'),
            source: 'local',
          },
          collegeLocalCallNumberType: {
            name: getTestEntityValue('C411394_collegeLocalCallNumberType'),
            source: 'local',
          },
          universityLocalCallNumberType: {
            name: getTestEntityValue('C411394_universityLocalCallNumberType'),
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
        let tempUserC411394;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          CallNumberTypesConsortiumManager.createViaApiShared(
            testData.centralSharedCallNumberType,
          ).then((newCallNumberType) => {
            testData.centralSharedCallNumberType.id = newCallNumberType.id;
          });
          CallNumberTypes.createCallNumberTypeViaApi(testData.centralLocalCallNumberType).then(
            (callNumberTypeId) => {
              testData.centralLocalCallNumberType.id = callNumberTypeId;
            },
          );

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
          ]).then((userProperties) => {
            tempUserC411394 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411394.userId);

            // Set up College (member-1) tenant with Finance permissions (no call number types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411394.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            CallNumberTypes.createCallNumberTypeViaApi(testData.collegeLocalCallNumberType).then(
              (callNumberTypeId) => {
                testData.collegeLocalCallNumberType.id = callNumberTypeId;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            CallNumberTypes.createCallNumberTypeViaApi(testData.universityLocalCallNumberType).then(
              (callNumberTypeId) => {
                testData.universityLocalCallNumberType.id = callNumberTypeId;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.centralLocalCallNumberType.id);
          CallNumberTypesConsortiumManager.deleteViaApi(testData.centralSharedCallNumberType);
          Users.deleteViaApi(tempUserC411394.userId);

          cy.withinTenant(Affiliations.University, () => {
            CallNumberTypes.deleteLocalCallNumberTypeViaApi(
              testData.universityLocalCallNumberType.id,
            );
          });
          cy.withinTenant(Affiliations.College, () => {
            CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.collegeLocalCallNumberType.id);
          });
        });

        it(
          'C411394 User without "inventory-storage.call-number-types.collection.get" permission is NOT able to view the list of call number types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411394'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411394.username, tempUserC411394.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Call number types and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            CallNumberTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared call number type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedCallNumberType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedCallNumberType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: Verify central local call number type is visible with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalCallNumberType.name,
              tenantNames.central,
              [
                testData.centralLocalCallNumberType.name,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local call number type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalCallNumberType.name,
            // );

            // Step 6: Verify university (member-2) local call number type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalCallNumberType.name,
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
