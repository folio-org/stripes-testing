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
import RequestCancellationReasonsConsortiumManager from '../../../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Request cancellation reasons', () => {
        const testData = {
          centralSharedCancellationReason: {
            payload: {
              name: getTestEntityValue('C410836_centralSharedCancellationReason'),
            },
          },
          centralLocalCancellationReason: {
            name: getTestEntityValue('C410836_centralLocalCancellationReason'),
          },
          collegeLocalCancellationReason: {
            name: getTestEntityValue('C410836_collegeLocalCancellationReason'),
          },
          universityLocalCancellationReason: {
            name: getTestEntityValue('C410836_universityLocalCancellationReason'),
          },
        };

        let tempUserC410836;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          RequestCancellationReasonsConsortiumManager.createViaApi(
            testData.centralSharedCancellationReason,
          ).then((newCancellationReason) => {
            testData.centralSharedCancellationReason.id = newCancellationReason.settingId;
          });
          cy.addCancellationReasonApi(testData.centralLocalCancellationReason).then(
            (cancellationReason) => {
              testData.centralLocalCancellationReason.id = cancellationReason.id;
            },
          );

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.settingsCircView.gui,
          ]).then((userProperties) => {
            tempUserC410836 = userProperties;

            // Assign affiliation to College (member-1) only (NOT University member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC410836.userId);

            // Set up College (member-1) tenant with Orders permission (NOT cancellation reasons permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC410836.userId, [
              Permissions.uiOrdersView.gui,
            ]);
            cy.addCancellationReasonApi(testData.collegeLocalCancellationReason).then(
              (cancellationReason) => {
                testData.collegeLocalCancellationReason.id = cancellationReason.id;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here but create test data
            cy.setTenant(Affiliations.University);
            cy.addCancellationReasonApi(testData.universityLocalCancellationReason).then(
              (cancellationReason) => {
                testData.universityLocalCancellationReason.id = cancellationReason.id;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.deleteCancellationReasonApi(testData.centralLocalCancellationReason.id);
          RequestCancellationReasonsConsortiumManager.deleteViaApi(
            testData.centralSharedCancellationReason,
          );
          Users.deleteViaApi(tempUserC410836.userId);

          cy.withinTenant(Affiliations.University, () => {
            cy.deleteCancellationReasonApi(testData.universityLocalCancellationReason.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            cy.deleteCancellationReasonApi(testData.collegeLocalCancellationReason.id);
          });
        });

        it(
          'C410836 User without "circulation-storage.cancellation-reasons.item.get" permission is NOT able to view the list of request cancellation reasons of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410836'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC410836.username, tempUserC410836.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Circulation settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);

            // Step 3: Navigate to Request cancellation reasons and verify toast message
            RequestCancellationReasonsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(
            //   messages.noPermission(tenantNames.college),
            // );

            // Step 4: Verify shared request cancellation reason is shown
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedCancellationReason.payload.name,
              '',
              '',
              'All',
            ]);

            // Step 5: Verify central local request cancellation reason is shown with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.centralLocalCancellationReason.name, '', '', tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 6: Verify college (member-1) local cancellation reason is NOT shown
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalCancellationReason.name,
            // );

            // Step 7: Verify university (member-2) local cancellation reason is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalCancellationReason.name,
            );

            // Step 8: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 9: Uncheck all tenants
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 10: Save with no members selected
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
