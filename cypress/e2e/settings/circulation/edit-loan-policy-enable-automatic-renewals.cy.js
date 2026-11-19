import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import { LIBRARY_DUE_DATE_MANAGMENT, LOAN_PROFILE } from '../../../support/constants';

describe('Settings', () => {
  describe('Circulation', () => {
    describe('Loan policies', () => {
      const testData = {};
      const policyName = getTestEntityValue('C1554461');
      const capabSetsToAssign = [CapabilitySets.uiCirculationSettingsLoanPoliciesManage];
      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create precondition loan policy and user', () => {
        cy.getAdminToken().then(() => {
          LoanPolicy.createViaApi({
            name: policyName,
            loanable: true,
            loansPolicy: {
              profileId: LOAN_PROFILE.ROLLING,
              period: { duration: 2, intervalId: 'Weeks' },
              closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
            },
            renewable: true,
            renewalsPolicy: {
              unlimited: false,
              numberAllowed: 1,
              renewFromId: 'CURRENT_DUE_DATE',
              differentPeriod: false,
            },
          }).then((policy) => {
            testData.policyId = policy.id;
          });

          cy.createTempUser([]).then((createdUserProperties) => {
            testData.user = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(
              testData.user.userId,
              capabsToAssign,
              capabSetsToAssign,
            );
            cy.login(testData.user.username, testData.user.password, {
              path: SettingsMenu.circulationLoanPoliciesPath,
              waiter: LoanPolicy.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        LoanPolicy.deleteApi(testData.policyId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1554461 Settings - Edit loan policy and enable "Automatic renewals" option (vega)',
        { tags: ['criticalPath', 'vega', 'C1554461'] },
        () => {
          // Step 1: Navigate to loan policy details and open in edit mode
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.verifyEditModeOpened(policyName);
          LoanPolicy.verifyAutomaticRenewalsChecked(false);

          // Step 2: Check "Automatic renewals" checkbox — verify it is checked and new sections appear
          LoanPolicy.enableAutomaticRenewals();
          LoanPolicy.verifyAutomaticRenewalsChecked(true);
          LoanPolicy.verifyAttemptFirstRenewalSectionVisible();
          LoanPolicy.verifyAttemptAdditionalRetriesSectionVisible();

          // Step 3: Fill "day(s) before due date" field with "1" — radio button switches to that option
          LoanPolicy.fillDaysBeforeDueDate('1');
          LoanPolicy.verifyDaysBeforeDueDateSelected();

          // Step 4: Fill "Attempt additional retries for" field with "20"
          LoanPolicy.fillAdditionalRetries('20');
          LoanPolicy.verifyAdditionalRetriesValue('20');

          // Step 5: Save and verify success toast and updated details pane
          LoanPolicy.saveAndCloseLoanPolicy();
          InteractorsTools.checkCalloutMessage(
            `The Loan policy ${policyName} was successfully updated.`,
          );
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Renewable', 'Yes');
          LoanPolicy.verifyKeyValue('Unlimited renewals', 'No');
          LoanPolicy.verifyKeyValue('Number of renewals allowed', '1');
          LoanPolicy.verifyKeyValue('Renew from', 'Current due date');
          LoanPolicy.verifyKeyValue('Renewal period different from original loan', 'No');
          LoanPolicy.verifyKeyValue('Automatic renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Attempt first renewal', '1 day(s) before due date');
          LoanPolicy.verifyKeyValue('Attempt additional retries for', '20 day(s)');
        },
      );
    });
  });
});
