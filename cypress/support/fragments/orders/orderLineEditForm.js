import {
  Button,
  Section,
  Select,
  Selection,
  SelectionList,
  including,
  matching,
} from '../../../../interactors';
import OrderStates from './orderStates';
import InteractorsTools from '../../utils/interactorsTools';

const orderLineEditFormRoot = Section({ id: 'pane-poLineForm' });
const orderLineDetailsSection = orderLineEditFormRoot.find(Section({ id: 'lineDetails' }));

const cancelButtom = Button('Cancel');
const saveButtom = Button('Save & close');

const orderLineFields = {
  receiptStatus: orderLineDetailsSection.find(Select({ name: 'receiptStatus' })),
  paymentStatus: orderLineDetailsSection.find(Select({ name: 'paymentStatus' })),
};

const buttons = {
  Cancel: cancelButtom,
  'Save & close': saveButtom,
};

export default {
  waitLoading() {
    cy.expect(orderLineEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  fillOrderLineFields(orderLine) {
    if (orderLine.receiptStatus) {
      cy.do(orderLineFields.receiptStatus.choose(orderLine.receiptStatus));
    }
    if (orderLine.paymentStatus) {
      cy.do(orderLineFields.paymentStatus.choose(orderLine.paymentStatus));
    }
  },
  addFundDistribution() {
    cy.do(Button('Add fund distribution').click());
  },
  selectDropDownValue(label, option) {
    cy.do([
      Selection(including(label)).open(),
      SelectionList().filter(option),
      SelectionList().select(including(option)),
    ]);
  },
  selectFundDistribution(fund) {
    this.selectDropDownValue('Fund ID', fund);
  },
  selectExpenseClass(expenseClass) {
    this.selectDropDownValue('Expense class', expenseClass);
  },
  clickCancelButton() {
    cy.do(cancelButtom.click());
    cy.expect(orderLineEditFormRoot.absent());
  },
  clickSaveButton({ orderLineUpdated = true } = {}) {
    cy.expect(saveButtom.has({ disabled: false }));
    cy.do(saveButtom.click());

    if (orderLineUpdated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderLineUpdatedSuccessfully)),
      );
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
};
