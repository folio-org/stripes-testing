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
      const policyName = getTestEntityValue('C1554462');
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
        'C1554462 Settings - "Automatic renewals" fields validation during loan policy creation (vega)',
        { tags: ['criticalPath', 'vega', 'C1554462'] },
        () => {
          // Step 1: Open "New loan policy" form
          LoanPolicy.clickNewButton();
          LoanPolicy.verifyNewLoanPolicyFormOpened();

          // Step 2: Fill fields with Renewable disabled — verify "Automatic renewals" section absent
          LoanPolicy.fillLoanPolicyName(policyName);
          LoanPolicy.enableLoanable();
          LoanPolicy.chooseLoanProfile(LOAN_PROFILE.ROLLING);
          LoanPolicy.fillLoanPeriod('3', 'Month(s)');
          LoanPolicy.chooseClosedLibraryDueDateManagement('Keep the current due date');
          LoanPolicy.disableRenewable();
          LoanPolicy.verifyAutomaticRenewalsCheckboxAbsent();

          // Step 3: Enable Renewable — verify "Automatic renewals" checkbox appears unchecked
          LoanPolicy.enableRenewable();
          LoanPolicy.verifyAutomaticRenewalsChecked(false);

          // Step 4: Fill renewals fields — verify "Automatic renewals" checkbox remains unchecked
          LoanPolicy.fillNumberOfRenewalsAllowed('2');
          LoanPolicy.chooseRenewFrom('Current due date');
          LoanPolicy.verifyAutomaticRenewalsChecked(false);

          // Step 5: Enable automatic renewals — verify section appears with required indicator and both radios
          LoanPolicy.enableAutomaticRenewals();
          LoanPolicy.verifyAutomaticRenewalsChecked(true);
          LoanPolicy.verifyAttemptFirstRenewalRequired();
          LoanPolicy.verifyAttemptFirstRenewalSectionVisible();
          LoanPolicy.verifyDaysBeforeRadioExists();
          LoanPolicy.verifyAttemptAdditionalRetriesSectionVisible();

          // Step 6: Click info icon — verify popover text
          LoanPolicy.clickAutomaticRenewalsInfoIcon();
          LoanPolicy.verifyAutomaticRenewalsInfoPopover();

          // Step 7: Select "day(s) before due date" radio, leave blank, save — verify validation error
          LoanPolicy.selectDaysBeforeRadio();
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeValidationError('Please fill this in to continue');

          // Step 8: Type text into daysBefore field char-by-char — non-numeric rejected, field stays blank
          LoanPolicy.typeDaysBeforeDueDate('abc');
          LoanPolicy.verifyDaysBeforeFieldEmpty();
          LoanPolicy.verifyDaysBeforeValidationError('Please fill this in to continue');

          // Step 9: Save again — validation error still displayed
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeValidationError('Please fill this in to continue');

          // Step 10: Type mixed letters/numbers char-by-char — letters rejected, digits remain, no error
          LoanPolicy.typeDaysBeforeDueDate('a5/b1)t');
          LoanPolicy.verifyDaysBeforeFieldHasValue();
          LoanPolicy.verifyDaysBeforeNoValidationError();

          // Step 11: Enter negative integer char-by-char — verify value and validation error
          LoanPolicy.typeDaysBeforeDueDate('-36');
          LoanPolicy.verifyDaysBeforeFieldValue('-36');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 12: Save — validation error still displayed, form stays open
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 13: Enter fractional number char-by-char, save — verify value and validation error
          LoanPolicy.typeDaysBeforeDueDate('41.58');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeFieldValue('41.58');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 14: Enter "0", save — verify value and validation error
          LoanPolicy.fillDaysBeforeDueDate('0');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeFieldValue('0');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 15: Enter integer > 100, save — verify value and validation error
          LoanPolicy.fillDaysBeforeDueDate('47354');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyDaysBeforeFieldValue('47354');
          LoanPolicy.verifyDaysBeforeValidationError(
            'The value must be integer and must be between 1 and 100',
          );

          // Step 16: Enter "100" — verify value displayed and no validation error
          LoanPolicy.fillDaysBeforeDueDate('100');
          LoanPolicy.verifyDaysBeforeFieldValue('100');
          LoanPolicy.verifyDaysBeforeNoValidationError();

          // Step 17: Type text into additional retries field char-by-char — non-numeric rejected, blank
          LoanPolicy.typeAdditionalRetries('abc');
          LoanPolicy.verifyAdditionalRetriesFieldEmpty();

          // Step 18: Type mixed letters/numbers char-by-char — letters rejected, digits remain
          LoanPolicy.typeAdditionalRetries('5/b1*t');
          LoanPolicy.verifyAdditionalRetriesFieldHasValue();

          // Step 19: Enter negative integer char-by-char into additional retries — verify value and error
          LoanPolicy.typeAdditionalRetries('-7');
          LoanPolicy.verifyAdditionalRetriesFieldValue('-7');
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 20: Save — validation error still displayed, form stays open
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 21: Enter fractional number char-by-char, save — verify value and validation error
          LoanPolicy.typeAdditionalRetries('1.5');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyAdditionalRetriesFieldValue('1.5');
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 22: Enter "101", save — verify value and validation error
          LoanPolicy.fillAdditionalRetries('101');
          LoanPolicy.saveAndCloseLoanPolicy();
          LoanPolicy.verifyAdditionalRetriesFieldValue('101');
          LoanPolicy.verifyAdditionalRetriesValidationError(
            'The value must be integer and must be between 0 and 100 or blank',
          );

          // Step 23: Enter "100" — verify value and no validation error
          LoanPolicy.fillAdditionalRetries('100');
          LoanPolicy.verifyAdditionalRetriesFieldValue('100');
          LoanPolicy.verifyAdditionalRetriesNoValidationError();

          // Step 24: Save and verify created policy details
          LoanPolicy.saveAndCloseLoanPolicy();
          InteractorsTools.checkCalloutMessage(
            `The Loan policy ${policyName} was successfully created.`,
          );
          LoanPolicy.selectLoanPolicyByName(policyName);
          LoanPolicy.verifyKeyValue('Renewable', 'Yes');
          LoanPolicy.verifyKeyValue('Unlimited renewals', 'No');
          LoanPolicy.verifyKeyValue('Number of renewals allowed', '2');
          LoanPolicy.verifyKeyValue('Renew from', 'Current due date');
          LoanPolicy.verifyKeyValue('Renewal period different from original loan', 'No');
          LoanPolicy.verifyKeyValue('Automatic renewals', 'Yes');
          LoanPolicy.verifyKeyValue('Attempt first renewal', '100 day(s) before due date');
          LoanPolicy.verifyKeyValue('Attempt additional retries for', '100 day(s)');
        },
      );
    });
  });
});
