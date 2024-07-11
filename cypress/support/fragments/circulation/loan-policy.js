import { LIBRARY_DUE_DATE_MANAGMENT, LOAN_PROFILE } from '../../constants';
import { Button, TextField, TextArea, Checkbox, Select } from '../../../../interactors';

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
const selectClosedLibraryDueDateManagementId = Select({
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

export default {
  waitLoading() {
    cy.get('.paneTitleLabel---MZtJM').contains('Loan policies').should('exist');
    cy.wait(1000);
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  fillLoanPoliciesWithUncheckedBox(loanPolicy) {
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
      selectLoanProfile.choose(loanPolicy.loans.profileId),
      cy.wait(500),
      textFieldPeriodDuration.fillIn(loanPolicy.loans.period.duration.toString()),
      selectPeriodInterval.choose(loanPolicy.loans.period.intervalId),
      selectClosedLibraryDueDateManagementId.choose(
        loanPolicy.loans.period.closedLibraryDueDateManagementId,
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
      selectRenewFrom.choose(loanPolicy.renewals.renewFromId),
      textFieldAlternateLoanPeriodDuration.fillIn(
        loanPolicy.requestManagement.holds.alternateCheckoutLoanPeriod.duration.toString(),
      ),
      selectAlternateLoanPeriodInterval.choose(
        loanPolicy.requestManagement.holds.alternateCheckoutLoanPeriod.intervalId,
      ),
    ]);
  },

  saveAndCloseLoanPolicies() {
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

  getLoanPolicyViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'loan-policy-storage/loan-policies',
      })
      .then((response) => {
        return response.body.loanPolicies;
      });
  },

  deleteLoanPolicyByIdViaAPI(id) {
    this.getLoanPolicyViaAPI().then((loans) => {
      const loan = loans.find((r) => r.id === id);
      if (loan !== undefined) {
        cy.okapiRequest({
          method: 'DELETE',
          path: `loan-policy-storage/loan-policies/${loan.id}`,
        });
      }
    });
  },

  createViaApi(loanPolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'loan-policy-storage/loan-policies',
        body: loanPolicy,
      })
      .then(({ body }) => {
        return body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `loan-policy-storage/loan-policies/${id}`,
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
