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
      const policyName = getTestEntityValue('C1554463');
      const capabSetsToAssign = [CapabilitySets.uiCirculationSettingsLoanPoliciesManage];
      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create precondition loan policy and user', () => {
        cy.getAdminToken().then(() => {
          LoanPolicy.createViaApi({
            name: policyName,
            loanable: true,
            loansPolicy: {
              profileId: LOAN_PROFILE.ROLLING,
              period: { duration: 4, intervalId: 'Days' },
              closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
            },
            renewable: true,
            renewalsPolicy: {
              unlimited: true,
              renewFromId: 'CURRENT_DUE_DATE',
              differentPeriod: true,
              period: { duration: 1, intervalId: 'Weeks' },
              automaticRenewal: true,
              attemptFirstRenewal: 'onDueDate',
              automaticRenewalRetryPeriodInDays: 0,
              firstAutomaticRenewalAttemptDaysBeforeDueDate: 0,
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
        'C1554463 Settings - "Automatic renewals" fields validation during loan policy editing (vega)',
        { tags: ['criticalPath', 'vega', 'C1554463'] },
        () => {
          // Step 1: Open policy in edit mode — verify automatic renewals is checked with sections visible
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.verifyEditModeOpened(policyName);
          LoanPolicy.verifyAutomaticRenewalsChecked(true);
          LoanPolicy.verifyAttemptFirstRenewalRequired();
          LoanPolicy.verifyAttemptFirstRenewalSectionVisible();
          LoanPolicy.verifyDaysBeforeRadioExists();
          LoanPolicy.verifyAttemptAdditionalRetriesSectionVisible();
          LoanPolicy.verifyAdditionalRetriesFieldValue('0');

          // Step 2: Uncheck "Renewable" — verify automatic renewals section disappears
          LoanPolicy.disableRenewable();
          LoanPolicy.verifyAutomaticRenewalsCheckboxAbsent();

          // Step 3: Save — verify toast and details pane shows only "Renewable - No"
          LoanPolicy.saveAndCloseLoanPolicy();
          InteractorsTools.checkCalloutMessage(
            `The Loan policy ${policyName} was successfully updated.`,
          );
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Renewable', 'No');
          LoanPolicy.verifyAutomaticRenewalsSectionAbsent();

          // Step 4: Edit again, re-enable Renewable — verify automatic renewals appears unchecked
          LoanPolicy.clickActionsButton();
          LoanPolicy.clickEditButton();
          LoanPolicy.enableRenewable();
          LoanPolicy.verifyAutomaticRenewalsChecked(false);

          // Step 5: Fill renewals fields — verify automatic renewals remains unchecked
          LoanPolicy.enableUnlimitedRenewals();
          LoanPolicy.chooseRenewFrom('Current due date');
          LoanPolicy.enableRenewalPeriodDifferent();
          LoanPolicy.fillRenewalPeriod('1', 'Week(s)');
          LoanPolicy.verifyAutomaticRenewalsChecked(false);

          // Step 6: Enable automatic renewals — verify section appears with required indicator and both radios
          LoanPolicy.enableAutomaticRenewals();
          LoanPolicy.verifyAutomaticRenewalsChecked(true);
          LoanPolicy.verifyAttemptFirstRenewalRequired();
          LoanPolicy.verifyAttemptFirstRenewalSectionVisible();
          LoanPolicy.verifyDaysBeforeRadioExists();
          LoanPolicy.verifyAttemptAdditionalRetriesSectionVisible();

          // Step 7: Click info icon — verify popover text
          LoanPolicy.clickAutomaticRenewalsInfoIcon();
          LoanPolicy.verifyAutomaticRenewalsInfoPopover();

          // Step 8: Select "day(s) before due date" radio, leave blank, save — verify validation error
          LoanPolicy.selectDaysBeforeRadio();
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeValidationError('Please fill this in to continue');

          // Step 9: Type text into daysBefore field char-by-char — non-numeric rejected, field stays blank
          LoanPolicy.typeDaysBeforeDueDate('abc');
          LoanPolicy.verifyDaysBeforeFieldEmpty();
          LoanPolicy.verifyDaysBeforeValidationError('Please fill this in to continue');

          // Step 10: Save again — validation error still displayed
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeValidationError('Please fill this in to continue');

          // Step 11: Type mixed chars with +/- — invalid number, error persists
          LoanPolicy.typeDaysBeforeDueDate('a5/b-7+1)t');
          LoanPolicy.verifyDaysBeforeValidationError('Please fill this in to continue');

          // Step 12: Enter negative integer — verify value and validation error
          LoanPolicy.typeDaysBeforeDueDate('-36');
          LoanPolicy.verifyDaysBeforeFieldValue('-36');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 13: Save — validation error still displayed
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 14: Enter fractional number, save — verify value and validation error
          LoanPolicy.typeDaysBeforeDueDate('41.58');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeFieldValue('41.58');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 15: Enter "0", save — verify value and validation error
          LoanPolicy.fillDaysBeforeDueDate('0');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeFieldValue('0');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 16: Enter "101", save — verify value and validation error
          LoanPolicy.fillDaysBeforeDueDate('101');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeFieldValue('101');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 17: Enter "100" — verify value and no validation error
          LoanPolicy.fillDaysBeforeDueDate('100');
          LoanPolicy.verifyDaysBeforeFieldValue('100');
          LoanPolicy.verifyDaysBeforeNoValidationError();

          // Step 18: Type text into additional retries field char-by-char — non-numeric rejected, blank
          LoanPolicy.typeAdditionalRetries('abc');
          LoanPolicy.verifyAdditionalRetriesFieldEmpty();

          // Step 19: Type mixed letters/numbers into additional retries — only digits remain
          LoanPolicy.typeAdditionalRetries('a5/b91*t');
          LoanPolicy.verifyAdditionalRetriesFieldHasValue();

          // Step 20: Enter negative integer into additional retries — verify value and error
          LoanPolicy.typeAdditionalRetries('-7');
          LoanPolicy.verifyAdditionalRetriesFieldValue('-7');
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 21: Save — validation error still displayed
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 22: Enter fractional number, save — verify value and validation error
          LoanPolicy.typeAdditionalRetries('1.5');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyAdditionalRetriesFieldValue('1.5');
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 23: Enter integer > 100, save — verify value and validation error
          LoanPolicy.fillAdditionalRetries('47354');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyAdditionalRetriesFieldValue('47354');
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 24: Enter "100" — verify value and no validation error
          LoanPolicy.fillAdditionalRetries('100');
          LoanPolicy.verifyAdditionalRetriesFieldValue('100');
          LoanPolicy.verifyAdditionalRetriesNoValidationError();

          // Step 25: Save and verify updated policy details
          LoanPolicy.saveAndCloseLoanPolicy();
          InteractorsTools.checkCalloutMessage(
            `The Loan policy ${policyName} was successfully updated.`,
          );
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Renewable', 'Yes');
          LoanPolicy.verifyKeyValue('Unlimited renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Renew from', 'Current due date');
          LoanPolicy.verifyKeyValue('Renewal period different from original loan', 'Yes');
          LoanPolicy.verifyKeyValue('Alternate loan period for renewals', '1 Week(s)');
          LoanPolicy.verifyKeyValue('Automatic renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Attempt first renewal', '100 day(s) before due date');
          LoanPolicy.verifyKeyValue('Attempt additional retries for', '100 day(s)');
        },
      );
    });
  });
});
