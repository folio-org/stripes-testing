import { REQUEST_METHOD } from '../../../../constants';
import {
  Button,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
  Pane,
  HTML,
  PaneHeader,
  NavListItem,
} from '../../../../../../interactors';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
const paneHeader = PaneHeader({ id: 'paneHeadercontrolled-vocab-pane' });
const paneLoanType = Pane('Loan types');

export default {
  waitLoading: () => {
    cy.expect(paneHeader.exists());
  },
  verifyLoanTypesOption: () => {
    cy.expect(Pane('Inventory').find(NavListItem('Loan types')).exists());
  },
  verifyLoanTypeExists(loanTypeName) {
    cy.expect(paneLoanType.find(HTML(including(loanTypeName))).exists());
  },
  createLoanTypesViaApi: (body) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'loan-types',
        body,
      })
      .then((response) => response.body.id);
  },

  deleteLoanTypesViaApi: (noteTypeId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `loan-types/${noteTypeId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyLoanTypesInTheList({ name, actions = [] }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 2 });
    cy.expect([row.exists()]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    } else {
      Object.values(reasonsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyLoanTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForLoanTypes(name) {
    cy.do([
      MultiColumnListRow({ isContainer: true, content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
