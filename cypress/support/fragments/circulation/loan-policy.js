import { getTestEntityValue } from '../../utils/stringTools';
import { LIBRARY_DUE_DATE_MANAGMENT, LOAN_PROFILE } from '../../constants';
import {
  Button,
  TextField,
  TextArea,
  Checkbox,
  // MultiColumnListRow,
} from '../../../../interactors';

const newButton = Button({ id: 'clickable-create-entry' });
const saveAndCloseButton = Button({ id: 'footer-save-entity' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const textBoxName = TextField({ id: 'input_policy_name' });
const textAreaDescription = TextArea({ name: 'description' });
const checkBoxLoanable = Checkbox({ id: 'loanable' });

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

export default {
  waitLoading() {
    cy.get('.paneTitleLabel---MZtJM').contains('Loan policies').should('exist');
    cy.wait(1000);
  },
  getDefaultRollingLoanPolicy,

  clickNewButton() {
    cy.do(newButton.click());
  },

  fillLoanPolicies(loanPolicy) {
    cy.do([
      textBoxName.fillIn(loanPolicy.name),
      textAreaDescription.fillIn(loanPolicy.description),
      loanPolicy.loanable
        ? checkBoxLoanable.checkIfNotSelected()()
        : checkBoxLoanable.uncheckIfSelected(),
    ]); // if loanable is true - not working
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

  clickConfirmDeleteButton() {
    cy.do(deleteButton.click());
  },

  // verifyReasonInTheList({ name, description = '', publicDescription = '', actions = [] }) {
  //   const row = MultiColumnListRow({ content: including(name) });
  //   cy.expect([
  //     row.exists(),
  //     row.find(MultiColumnListCell({ columnIndex: 1, content: description })).exists(),
  //     row.find(MultiColumnListCell({ columnIndex: 2, content: publicDescription })).exists(),
  //   ]);
  //   const actionsCell = MultiColumnListCell({ columnIndex: 3 });
  //   if (actions.length === 0) {
  //     cy.expect(row.find(actionsCell).has({ content: '' }));
  //   } else {
  //     Object.values(reasonsActions).forEach((action) => {
  //       const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
  //       if (actions.includes(action)) {
  //         cy.expect(buttonSelector.exists());
  //       } else {
  //         cy.expect(buttonSelector.absent());
  //       }
  //     });
  //   }
  // },

  // verifyNoReasonInTheList(name) {
  //   cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  // },

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
