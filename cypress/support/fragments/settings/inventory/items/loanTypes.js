import { including, Pane, HTML, PaneHeader, NavListItem } from '../../../../../../interactors';

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
};
