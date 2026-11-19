import uuid from 'uuid';
import {
  Button,
  Checkbox,
  IconButton,
  including,
  KeyValue,
  NavListItem,
  PaneHeader,
  Popover,
  RadioButton,
  Select,
  TextArea,
  TextField,
  Heading,
} from '../../../../interactors';
import { LIBRARY_DUE_DATE_MANAGMENT, LOAN_PROFILE } from '../../constants';
import { getTestEntityValue } from '../../utils/stringTools';

const newButton = Button({ id: 'clickable-create-entry' });
const saveAndCloseButton = Button({ id: 'footer-save-entity' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const textBoxName = TextField({ id: 'input_policy_name' });
const textAreaDescription = TextArea({ name: 'description' });
const checkBoxLoanable = Checkbox({ id: 'loanable' });
const selectLoanProfile = Select({ name: 'loansPolicy.profileId' });
const textFieldPeriodDuration = TextField({ name: 'loansPolicy.period.duration' });
const selectPeriodInterval = Select({ name: 'loansPolicy.period.intervalId' });
const selectClosedLibraryDueDateManagement = Select({
  name: 'loansPolicy.closedLibraryDueDateManagementId',
});
const checkBoxRenewable = Checkbox({ id: 'renewable' });
const textFieldNumberOfRenewalsAllowed = TextField({ name: 'renewalsPolicy.numberAllowed' });
const selectRenewFrom = Select({ name: 'renewalsPolicy.renewFromId' });
const textFieldAlternateLoanPeriodDuration = TextField({
  name: 'requestManagement.holds.alternateCheckoutLoanPeriod.duration',
});
const selectAlternateLoanPeriodInterval = Select({
  name: 'requestManagement.holds.alternateCheckoutLoanPeriod.intervalId',
});
const checkBoxRenewalPeriodDifferent = Checkbox({ id: 'renewalsPolicy.differentPeriod' });
const textFieldRenewalPeriodDuration = TextField({ name: 'renewalsPolicy.period.duration' });
const selectRenewalPeriodInterval = Select({ name: 'renewalsPolicy.period.intervalId' });
const checkBoxUnlimitedRenewals = Checkbox({ id: 'renewalsPolicy.unlimited' });
const checkBoxAutomaticRenewals = Checkbox('Automatic renewals');
const automaticRenewalsInfoIcon = IconButton({ icon: 'info' });
const automaticRenewalsInfoPopover = Popover({
  content: including(
    'Automatic renewals are available for loans with intervals of one day or longer.',
  ),
});
const radioButtonOnDueDate = RadioButton({ id: 'attemptFirstRenewal.onDueDate' });
const radioButtonDaysBeforeDueDate = RadioButton({ id: 'attemptFirstRenewal.daysBefore' });
const textFieldDaysBeforeDueDate = TextField({ name: 'renewalsPolicy.daysBefore' });
const textFieldAdditionalRetries = TextField({ id: 'automaticRenewalRetryPeriodInDays' });
const cancelButton = Button('Cancel');
const closeWithoutSavingButton = Button('Close without saving');
const selectAllKey = Cypress.platform === 'darwin' ? 'Meta' : 'Control';

const getDefaultRollingLoanPolicy = (limit = '') => {
  const defaultLoanPolicy = {
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
      itemLimit: limit,
      period: { duration: 3, intervalId: 'Hours' },
      profileId: 'Rolling',
    },
    name: getTestEntityValue(),
    renewable: true,
    renewalsPolicy: { numberAllowed: '2', renewFromId: 'SYSTEM_DATE' },
  };
  return defaultLoanPolicy;
};

export const defaultLoanPolicy = {
  id: uuid(),
  name: getTestEntityValue(),
  description: 'description',
  loanable: false,
  renewable: false,
};

const getExampleLoanPolicy = () => {
  return {
    id: 'd9cd0bed-1b49-4b5e-a7bd-064b8d177231',
    name: 'Example Loan Policy',
    description: 'An example loan policy',
    loanable: true,
    loansPolicy: {
      profileId: 'Rolling',
      period: {
        duration: 60,
        intervalId: 'Days',
      },
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE',
      gracePeriod: {
        duration: 7,
        intervalId: 'Days',
      },
    },
    renewable: true,
    renewalsPolicy: {
      unlimited: true,
      renewFromId: 'CURRENT_DUE_DATE',
      differentPeriod: true,
      period: {
        duration: 30,
        intervalId: 'Days',
      },
    },
    requestManagement: {
      recalls: {
        minimumGuaranteedLoanPeriod: {
          duration: 30,
          intervalId: 'Days',
        },
        recallReturnInterval: {
          duration: 5,
          intervalId: 'Days',
        },
        allowRecallsToExtendOverdueLoans: false,
      },
    },
  };
};

export default {
  getDefaultRollingLoanPolicy,
  getExampleLoanPolicy,

  waitLoading() {
    cy.expect(Heading('Loan policies').exists());
    cy.wait(1000);
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  fillLoanPolicy(loanPolicy) {
    cy.do([
      textBoxName.fillIn(loanPolicy.name),
      textAreaDescription.fillIn(loanPolicy.description),
    ]);
    if (loanPolicy.loanable) {
      cy.do(checkBoxLoanable.checkIfNotSelected());
      this.fillLoans(loanPolicy);
    } else {
      cy.do(checkBoxLoanable.uncheckIfSelected());
    }
  },

  fillLoans(loanPolicy) {
    cy.do([
      selectLoanProfile.choose(loanPolicy.loans.profile),
      cy.wait(500),
      textFieldPeriodDuration.fillIn(loanPolicy.loans.period.duration.toString()),
      selectPeriodInterval.choose(loanPolicy.loans.period.interval),
      selectClosedLibraryDueDateManagement.choose(
        loanPolicy.loans.period.closedLibraryDueDateManagement,
      ),
    ]);
    if (loanPolicy.renewable) {
      cy.do(checkBoxRenewable.checkIfNotSelected());
      this.fillRenewals(loanPolicy);
    } else {
      cy.do(checkBoxRenewable.uncheckIfSelected());
    }
  },

  fillRenewals(loanPolicy) {
    cy.do([
      cy.wait(500),
      textFieldNumberOfRenewalsAllowed.fillIn(
        loanPolicy.renewals.numberOfRenewalsAllowed.toString(),
      ),
      selectRenewFrom.choose(loanPolicy.renewals.renewFrom),
      textFieldAlternateLoanPeriodDuration.fillIn(
        loanPolicy.requestManagement.holds.alternateCheckoutLoanPeriod.duration.toString(),
      ),
      selectAlternateLoanPeriodInterval.choose(
        loanPolicy.requestManagement.holds.alternateCheckoutLoanPeriod.interval,
      ),
    ]);
  },

  saveAndCloseLoanPolicy() {
    cy.do(saveAndCloseButton.click());
    cy.wait(1000);
  },

  clickActionsButton() {
    cy.do(actionsButton.click());
  },

  clickEditButton() {
    cy.do(editButton.click());
  },

  clickDeleteButton() {
    cy.do(deleteButton.click());
  },

  confirm() {
    cy.wait(1000);
    cy.do(deleteButton.click());
  },

  selectLoanPolicyByName(name) {
    cy.do(NavListItem(name).click());
    cy.wait(1000);
  },

  verifyLoanPolicy(loanPolicy) {
    if (loanPolicy.name) {
      this.verifyKeyValue('Loan policy name', loanPolicy.name);
    }
    if (loanPolicy.description) {
      this.verifyKeyValue('Description', loanPolicy.description);
    }

    if (loanPolicy.loanable) {
      this.verifyKeyValue('Loan profile', loanPolicy.loans.profile);
      this.verifyKeyValue(
        'Loan period',
        `${loanPolicy.loans.period.duration} ${loanPolicy.loans.period.interval}`,
      );
      this.verifyKeyValue(
        'Closed library due date management',
        loanPolicy.loans.period.closedLibraryDueDateManagement,
      );
    }

    if (loanPolicy.renewable) {
      this.verifyKeyValue('Renewable', loanPolicy.renewable ? 'Yes' : 'No');
    }
  },

  enableAutomaticRenewals() {
    cy.do(checkBoxAutomaticRenewals.checkIfNotSelected());
  },

  fillDaysBeforeDueDate(days) {
    cy.do([textFieldDaysBeforeDueDate.click(), textFieldDaysBeforeDueDate.fillIn(days.toString())]);
  },

  fillAdditionalRetries(attempts) {
    cy.do([
      textFieldAdditionalRetries.click(),
      textFieldAdditionalRetries.fillIn(attempts.toString()),
    ]);
  },

  verifyDaysBeforeDueDateSelected() {
    cy.expect(radioButtonDaysBeforeDueDate.has({ checked: true }));
  },

  verifyAutomaticRenewalsChecked(checked) {
    cy.expect(checkBoxAutomaticRenewals.has({ checked }));
  },

  verifyNewLoanPolicyFormOpened() {
    cy.expect(PaneHeader('New loan policy').exists());
  },

  verifyAutomaticRenewalsCheckboxAbsent() {
    cy.expect(checkBoxAutomaticRenewals.absent());
  },

  fillNumberOfRenewalsAllowed(number) {
    cy.do(textFieldNumberOfRenewalsAllowed.fillIn(number.toString()));
  },

  verifyAttemptFirstRenewalRequired() {
    cy.get('[id="attempt-first-renewal-label"] [class*="asterisk"]').should('exist');
  },

  verifyDaysBeforeRadioExists() {
    cy.expect(radioButtonDaysBeforeDueDate.exists());
  },

  clickAutomaticRenewalsInfoIcon() {
    cy.get('[data-testid="automaticRenewal"]').scrollIntoView();
    cy.do(automaticRenewalsInfoIcon.click());
  },

  verifyAutomaticRenewalsInfoPopover() {
    cy.expect(automaticRenewalsInfoPopover.exists());
  },

  selectDaysBeforeRadio() {
    cy.do(radioButtonDaysBeforeDueDate.click());
  },

  typeDaysBeforeDueDate(chars) {
    cy.get('[name="renewalsPolicy.daysBefore"]')
      .realClick()
      .realPress([selectAllKey, 'a'])
      .realPress('Backspace')
      .realType(chars);
  },

  typeAdditionalRetries(chars) {
    cy.get('[id="automaticRenewalRetryPeriodInDays"]')
      .realClick()
      .realPress([selectAllKey, 'a'])
      .realPress('Backspace')
      .realType(chars);
  },

  verifyDaysBeforeFieldEmpty() {
    cy.expect(textFieldDaysBeforeDueDate.has({ hasValue: false }));
  },

  verifyDaysBeforeFieldHasValue() {
    cy.expect(textFieldDaysBeforeDueDate.has({ hasValue: true }));
  },

  verifyDaysBeforeFieldValue(value) {
    cy.expect(textFieldDaysBeforeDueDate.has({ value }));
  },

  verifyDaysBeforeValidationError(message) {
    cy.expect(textFieldDaysBeforeDueDate.has({ error: message }));
  },

  verifyDaysBeforeNoValidationError() {
    cy.expect(textFieldDaysBeforeDueDate.has({ error: undefined }));
  },

  verifyAdditionalRetriesFieldEmpty() {
    cy.expect(textFieldAdditionalRetries.has({ hasValue: false }));
  },

  verifyAdditionalRetriesFieldHasValue() {
    cy.expect(textFieldAdditionalRetries.has({ hasValue: true }));
  },

  verifyAdditionalRetriesFieldValue(value) {
    cy.expect(textFieldAdditionalRetries.has({ value }));
  },

  verifyAdditionalRetriesValidationError(message) {
    cy.expect(textFieldAdditionalRetries.has({ error: message }));
  },

  verifyAdditionalRetriesNoValidationError() {
    cy.expect(textFieldAdditionalRetries.has({ error: undefined }));
  },

  fillLoanPolicyName(name) {
    cy.do(textBoxName.fillIn(name));
  },

  enableLoanable() {
    cy.do(checkBoxLoanable.checkIfNotSelected());
  },

  chooseLoanProfile(profile) {
    cy.do(selectLoanProfile.choose(profile));
    cy.wait(500);
  },

  fillLoanPeriod(duration, interval) {
    cy.do([
      textFieldPeriodDuration.fillIn(duration.toString()),
      selectPeriodInterval.choose(interval),
    ]);
  },

  chooseClosedLibraryDueDateManagement(option) {
    cy.do(selectClosedLibraryDueDateManagement.choose(option));
  },

  enableRenewable() {
    cy.do(checkBoxRenewable.checkIfNotSelected());
  },

  disableRenewable() {
    cy.do(checkBoxRenewable.uncheckIfSelected());
  },

  enableUnlimitedRenewals() {
    cy.do(checkBoxUnlimitedRenewals.checkIfNotSelected());
  },

  chooseRenewFrom(option) {
    cy.do(selectRenewFrom.choose(option));
  },

  enableRenewalPeriodDifferent() {
    cy.do(checkBoxRenewalPeriodDifferent.checkIfNotSelected());
  },

  fillRenewalPeriod(duration, interval) {
    cy.do([
      textFieldRenewalPeriodDuration.fillIn(duration.toString()),
      selectRenewalPeriodInterval.choose(interval),
    ]);
  },

  disableAutomaticRenewals() {
    cy.do(checkBoxAutomaticRenewals.uncheckIfSelected());
  },

  selectOnDueDateRadio() {
    cy.do(radioButtonOnDueDate.click());
  },

  clearAdditionalRetries() {
    cy.do([textFieldAdditionalRetries.click(), textFieldAdditionalRetries.fillIn('')]);
  },

  verifyAttemptFirstRenewalSectionAbsent() {
    cy.expect(radioButtonOnDueDate.absent());
  },

  verifyAttemptAdditionalRetriesSectionAbsent() {
    cy.expect(textFieldAdditionalRetries.absent());
  },

  verifyAutomaticRenewalsSectionAbsent() {
    cy.expect(KeyValue('Automatic renewals').absent());
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
  },

  clickCloseWithoutSavingButton() {
    cy.do(closeWithoutSavingButton.click());
  },

  verifyEditModeOpened(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyAttemptFirstRenewalSectionVisible() {
    cy.expect(radioButtonOnDueDate.has({ checked: true }));
  },

  verifyAttemptAdditionalRetriesSectionVisible() {
    cy.expect(textFieldAdditionalRetries.exists());
  },

  verifyAdditionalRetriesValue(value) {
    cy.expect(textFieldAdditionalRetries.has({ value }));
  },

  verifyKeyValue(verifyKey, verifyValue) {
    cy.expect(KeyValue(verifyKey, { value: verifyValue }).exists());
  },

  verifyLoanPolicyInNotInTheList(name) {
    cy.expect(NavListItem(name).absent());
  },

  getLoanPoliciesViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'loan-policy-storage/loan-policies',
      })
      .then((response) => {
        return response.body.loanPolicies;
      });
  },

  deleteLoanPolicyByNameViaAPI(name) {
    this.getLoanPoliciesViaAPI().then((loans) => {
      const loan = loans.find((l) => l.name === name);
      if (loan !== undefined) {
        this.deleteApi(loan.id);
      }
    });
  },

  verifyPoliciesCreated(policiesData, expectedCount) {
    this.getLoanPoliciesViaAPI().then((policies) => {
      const testPolicies = policies.filter((p) => policiesData.some((cp) => cp.id === p.id));
      cy.expect(testPolicies.length).to.be.at.least(expectedCount);
    });
  },

  createViaApi(loanPolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'loan-policy-storage/loan-policies',
        body: loanPolicy,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `loan-policy-storage/loan-policies/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  getApi(searchParams) {
    return cy.okapiRequest({
      path: 'loan-policy-storage/loan-policies',
      query: searchParams,
    });
  },
  createLoanableNotRenewableLoanPolicyApi(loanPolicy) {
    cy.createLoanPolicy({
      name: loanPolicy.name,
      id: loanPolicy.id,
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
        period: {
          duration: 3,
          intervalId: 'Weeks',
        },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: {
        unlimited: true,
      },
    });
  },
  createRenewableLoanPolicyApi(loanPolicy) {
    cy.createLoanPolicy({
      name: loanPolicy.name,
      id: loanPolicy.id,
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
        period: {
          duration: 3,
          intervalId: 'Weeks',
        },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: true,
      renewalsPolicy: {
        numberAllowed: 5,
        renewFromId: 'CURRENT_DUE_DATE',
      },
    });
  },
};
