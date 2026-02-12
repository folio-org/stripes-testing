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
import LoanTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/loanTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import LoanTypes from '../../../../../support/fragments/settings/inventory/items/loanTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Loan types', () => {
        const testData = {
          centralSharedLoanType: {
            payload: {
              name: getTestEntityValue('C411759_centralSharedLoanType'),
            },
          },
          centralLocalLoanType: {
            name: getTestEntityValue('C411759_centralLocalLoanType'),
            source: 'local',
          },
          collegeLocalLoanType: {
            name: getTestEntityValue('C411759_collegeLocalLoanType'),
            source: 'local',
          },
          universityLocalLoanType: {
            name: getTestEntityValue('C411759_universityLocalLoanType'),
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
          cy.getAdminToken().then(() => {
            LoanTypesConsortiumManager.createViaApi(testData.centralSharedLoanType).then(
              (newLoanType) => {
                testData.centralSharedLoanType = newLoanType;
              },
            );
            LoanTypes.createLoanTypesViaApi(testData.centralLocalLoanType).then((loanTypeId) => {
              testData.centralLocalLoanType.id = loanTypeId;
            });
            cy.setTenant(Affiliations.College);
            LoanTypes.createLoanTypesViaApi(testData.collegeLocalLoanType).then((loanTypeId) => {
              testData.collegeLocalLoanType.id = loanTypeId;
            });
            cy.resetTenant();
            cy.setTenant(Affiliations.University);
            LoanTypes.createLoanTypesViaApi(testData.universityLocalLoanType).then((loanTypeId) => {
              testData.universityLocalLoanType.id = loanTypeId;
            });
            cy.resetTenant();
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiCreateEditDeleteLoanTypes.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiCreateEditDeleteLoanTypes.gui,
            ]);
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiCreateEditDeleteLoanTypes.gui,
            ]);
            cy.resetTenant();

            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          LoanTypesConsortiumManager.deleteViaApi(testData.centralSharedLoanType);
          LoanTypes.deleteLoanTypesViaApi(testData.centralLocalLoanType.id);
          cy.setTenant(Affiliations.College);
          LoanTypes.deleteLoanTypesViaApi(testData.collegeLocalLoanType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.University);
          LoanTypes.deleteLoanTypesViaApi(testData.universityLocalLoanType.id);
        });

        it(
          'C411759 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of loan types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411759'] },
          () => {
            // Step 1: Navigate to Consortium manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Open Select members modal to verify modal elements
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 3: Uncheck University (member-2) tenant
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 4: Save and close modal
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: Navigate to Loan types settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            LoanTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: Verify shared loan type is displayed (no Actions)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedLoanType.payload.name,
              constants.memberLibraries.all,
              [
                testData.centralSharedLoanType.payload.name,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 7: Verify central local loan type is displayed with Actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.centralLocalLoanType.name,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify college local loan type is displayed with Actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.collegeLocalLoanType.name,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify university local loan type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalLoanType.name,
            );

            // Step 10: Open Select members modal again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Uncheck College (member-1) tenant, leaving only Central
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 12: Save and close modal
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify shared loan type is still displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedLoanType.payload.name,
              constants.memberLibraries.all,
              [
                testData.centralSharedLoanType.payload.name,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 14: Verify central local loan type is still displayed with Actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.centralLocalLoanType.name,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify college local loan type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalLoanType.name,
            );

            // Step 16: Verify university local loan type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalLoanType.name,
            );
          },
        );
      });
    });
  });
});
