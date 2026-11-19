import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import { LOAN_PROFILE } from '../../../support/constants';

describe('Settings', () => {
  describe('Circulation', () => {
    describe('Loan policies', () => {
      const testData = {};
      const policyName = getTestEntityValue('C1554460');
      const capabSetsToAssign = [CapabilitySets.uiCirculationSettingsLoanPoliciesManage];
      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create user and login', () => {
        cy.getAdminToken().then(() => {
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
        LoanPolicy.deleteLoanPolicyByNameViaAPI(policyName);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1554460 Settings - Create loan policy with "Automatic renewals" enabled (vega)',
        { tags: ['criticalPath', 'vega', 'C1554460'] },
        () => {
          // Step 1: Open "New loan policy" form
          LoanPolicy.clickNewButton();
          LoanPolicy.verifyNewLoanPolicyFormOpened();

          // Step 2: Fill required fields — verify "Automatic renewals" checkbox appears unchecked
          LoanPolicy.fillLoanPolicyName(policyName);
          LoanPolicy.enableLoanable();
          LoanPolicy.chooseLoanProfile(LOAN_PROFILE.ROLLING);
          LoanPolicy.fillLoanPeriod('5', 'Day(s)');
          LoanPolicy.chooseClosedLibraryDueDateManagement('Keep the current due date');
          LoanPolicy.enableRenewable();
          LoanPolicy.enableUnlimitedRenewals();
          LoanPolicy.chooseRenewFrom('Current due date');
          LoanPolicy.verifyAutomaticRenewalsChecked(false);

          // Step 3: Enable automatic renewals — verify sections appear with "On due date" default
          LoanPolicy.enableAutomaticRenewals();
          LoanPolicy.verifyAutomaticRenewalsChecked(true);
          LoanPolicy.verifyAttemptFirstRenewalSectionVisible();
          LoanPolicy.verifyAttemptAdditionalRetriesSectionVisible();

          // Step 4: Save and verify created policy details
          LoanPolicy.saveAndCloseLoanPolicy();
          InteractorsTools.checkCalloutMessage(
            `The Loan policy ${policyName} was successfully created.`,
          );
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Renewable', 'Yes');
          LoanPolicy.verifyKeyValue('Unlimited renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Renew from', 'Current due date');
          LoanPolicy.verifyKeyValue('Renewal period different from original loan', 'No');
          LoanPolicy.verifyKeyValue('Automatic renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Attempt first renewal', 'On due date');
          LoanPolicy.verifyKeyValue('Attempt additional retries for', '0 day(s)');

          // Step 5: Edit — uncheck automatic renewals, verify sections disappear
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.disableAutomaticRenewals();
          LoanPolicy.verifyAutomaticRenewalsChecked(false);
          LoanPolicy.verifyAttemptFirstRenewalSectionAbsent();
          LoanPolicy.verifyAttemptAdditionalRetriesSectionAbsent();

          // Step 6: Save and verify view shows only "Automatic renewals - No"
          LoanPolicy.saveAndCloseLoanPolicy();
          InteractorsTools.checkCalloutMessage(
            `The Loan policy ${policyName} was successfully updated.`,
          );
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Automatic renewals', 'No');

          // Step 7: Edit — verify form shows "Automatic renewals" unchecked
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.verifyEditModeOpened(policyName);
          LoanPolicy.verifyAutomaticRenewalsChecked(false);

          // Step 8: Enable automatic renewals, fill days before and retries, save
          LoanPolicy.enableAutomaticRenewals();
          LoanPolicy.fillDaysBeforeDueDate('5');
          LoanPolicy.fillAdditionalRetries('3');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Automatic renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Attempt first renewal', '5 day(s) before due date');
          LoanPolicy.verifyKeyValue('Attempt additional retries for', '3 day(s)');

          // Step 9: Edit — switch to "On due date", save, verify retries value persists
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.selectOnDueDateRadio();
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Automatic renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Attempt first renewal', 'On due date');
          LoanPolicy.verifyKeyValue('Attempt additional retries for', '3 day(s)');

          // Step 10: Edit — fill days before "5", clear retries, save
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.fillDaysBeforeDueDate('5');
          LoanPolicy.clearAdditionalRetries();
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Automatic renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Attempt first renewal', '5 day(s) before due date');
          LoanPolicy.verifyKeyValue('Attempt additional retries for', '0 day(s)');

          // Step 11: Edit — uncheck "Renewable", save, verify no "Automatic renewals" section
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.disableRenewable();
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyAutomaticRenewalsSectionAbsent();

          // Step 12: Edit — re-enable "Renewable", verify automatic renewals appears unchecked, sections absent
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.enableRenewable();
          LoanPolicy.verifyAutomaticRenewalsChecked(false);
          LoanPolicy.verifyAttemptFirstRenewalSectionAbsent();
          LoanPolicy.verifyAttemptAdditionalRetriesSectionAbsent();

          // Step 13: Cancel without saving — verify view still has no "Automatic renewals" section
          LoanPolicy.clickCancelButton();
          LoanPolicy.clickCloseWithoutSavingButton();
          LoanPolicy.verifyAutomaticRenewalsSectionAbsent();
        },
      );
    });
  });
});
