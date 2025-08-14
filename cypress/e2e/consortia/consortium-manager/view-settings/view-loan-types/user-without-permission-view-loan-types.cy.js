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
import LoanTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/loanTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import LoanTypes from '../../../../../support/fragments/settings/inventory/items/loanTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Loan types', () => {
        const testData = {
          centralSharedLoanType: {
            payload: {
              name: getTestEntityValue('C411760_centralSharedLoanType'),
            },
          },
          centralLocalLoanType: {
            name: getTestEntityValue('C411760_centralLocalLoanType'),
            source: 'local',
          },
          collegeLocalLoanType: {
            name: getTestEntityValue('C411760_collegeLocalLoanType'),
            source: 'local',
          },
          universityLocalLoanType: {
            name: getTestEntityValue('C411760_universityLocalLoanType'),
            source: 'local',
          },
        };

        let tempUserC411760;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          LoanTypesConsortiumManager.createViaApi(testData.centralSharedLoanType).then(
            (newLoanType) => {
              testData.centralSharedLoanType.id = newLoanType.id;
            },
          );
          LoanTypes.createLoanTypesViaApi(testData.centralLocalLoanType).then((loanTypeId) => {
            testData.centralLocalLoanType.id = loanTypeId;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiCreateEditDeleteLoanTypes.gui,
          ]).then((userProperties) => {
            tempUserC411760 = userProperties;

            // Assign affiliation to College (member-1) only (NOT University member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411760.userId);

            // Set up College (member-1) tenant with Finance permission (NOT loan types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411760.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            LoanTypes.createLoanTypesViaApi(testData.collegeLocalLoanType).then((loanTypeId) => {
              testData.collegeLocalLoanType.id = loanTypeId;
            });

            // Set up University (member-2) tenant - user has no affiliation here but create test data
            cy.setTenant(Affiliations.University);
            LoanTypes.createLoanTypesViaApi(testData.universityLocalLoanType).then((loanTypeId) => {
              testData.universityLocalLoanType.id = loanTypeId;
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          LoanTypes.deleteLoanTypesViaApi(testData.centralLocalLoanType.id);
          LoanTypesConsortiumManager.deleteViaApi(testData.centralSharedLoanType);
          Users.deleteViaApi(tempUserC411760.userId);

          cy.withinTenant(Affiliations.University, () => {
            LoanTypes.deleteLoanTypesViaApi(testData.universityLocalLoanType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            LoanTypes.deleteLoanTypesViaApi(testData.collegeLocalLoanType.id);
          });
        });

        it(
          'C411760 User without "inventory-storage.loan-types.collection.get" permission is NOT able to view the list of loan types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411760'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411760.username, tempUserC411760.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Loan types and verify toast message
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            LoanTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(
            //   messages.noPermission(tenantNames.college),
            // );

            // Step 3: Verify shared loan type is shown
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedLoanType.payload.name,
              '',
              'All',
            ]);

            // Step 4: Verify central local loan type is shown with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.centralLocalLoanType.name, '', tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local loan type is NOT shown
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalLoanType.name,
            // );

            // Step 6: Verify university (member-2) local loan type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalLoanType.name,
            );

            // Step 7: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all tenants
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 9: Save with no members selected
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
