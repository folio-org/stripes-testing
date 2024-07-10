import { LIBRARY_DUE_DATE_MANAGMENT, LOAN_PROFILE } from '../../constants';
import { Button, TextField, TextArea, Checkbox } from '../../../../interactors';

const newButton = Button({ id: 'clickable-create-entry' });
const saveAndCloseButton = Button({ id: 'footer-save-entity' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const textBoxName = TextField({ id: 'input_policy_name' });
const textAreaDescription = TextArea({ name: 'description' });
const checkBoxLoanable = Checkbox({ id: 'loanable' });

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
      checkBoxLoanable.uncheckIfSelected(),
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
    return this.getLoanPolicyViaAPI().then((policies) => {
      const policy = policies.find((p) => p.id === id);
      if (policy !== undefined) {
        return cy
          .okapiRequest({
            method: 'DELETE',
            path: `loan-policy-storage/loan-policies/${policy.id}`,
          })
          .then((response) => {
            console.log('DELETE request response:', response);
            return response;
          });
      } else {
        console.log(`Policy with ID ${id} not found`);
        return null;
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
