import { REQUEST_METHOD } from '../../../../constants';
import {
  Button,
  including,
  MultiColumnListRow,
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
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .then(($row) => {
        const actionsCell = $row.find('div[class*="mclCell-"]').eq(2);
        actions.forEach((action) => {
          if (action === 'edit') {
            cy.get(actionsCell).find('button[icon="edit"]').should('exist');
          } else if (action === 'trash') {
            cy.get(actionsCell).find('button[icon="trash"]').should('exist');
          }
        });
      });
  },

  verifyLoanTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForLoanTypes(name) {
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .find('div[class*="mclCell-"]')
      .eq(2)
      .find('button[icon="trash"]')
      .click();
    cy.do(Button('Delete').click());
  },
};
