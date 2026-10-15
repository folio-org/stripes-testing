import {
  Button,
  Modal,
  MultiColumnList,
  MultiColumnListHeader,
  Select,
  including,
  matching,
} from '../../../../../interactors';
import { CHANGE_INSTANCE_HOLDINGS_OPERATIONS, DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import OrderStates from '../orderStates';

const changeInstanceModal = Modal({ id: 'changing-instance-confirmation' });
const holdingOperationSelect = changeInstanceModal.find(Select('How to update Holdings*'));
const cancelButton = changeInstanceModal.find(Button('Cancel'));
const submitButton = changeInstanceModal.find(Button('Submit'));

const content =
  'You have changed the title information of this purchase order line from (?:\\S+) to (?:\\S+). All related item records will be moved to the new instance. How would you like to address the related Holdings?';
const holdingOperations = Object.values(CHANGE_INSTANCE_HOLDINGS_OPERATIONS);
const itemsTableColumns = [
  'Item: barcode',
  'Status',
  'Copy number',
  'Loan type',
  'Effective location',
  'Enumeration',
  'Chronology',
  'Volume',
  'Year, caption',
  'Material type',
];

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(changeInstanceModal.exists());
  },
  verifyModalView() {
    cy.expect([
      changeInstanceModal.has({ header: 'Change title' }),
      changeInstanceModal.has({ message: matching(content) }),
      holdingOperationSelect.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: true, visible: true }),
    ]);
  },
  checkHowToUpdateHoldingsValue(operation) {
    cy.expect(
      holdingOperationSelect.has(operation ? { selectedOptionLabel: operation } : { value: '' }),
    );
  },
  checkHowToUpdateHoldingsOptions(operations = holdingOperations) {
    operations.forEach((operation) => {
      cy.expect(holdingOperationSelect.has({ content: including(operation) }));
    });
  },
  checkHowToUpdateHoldingsOptionDisabled(operation) {
    cy.expect(holdingOperationSelect.has({ allOptionsText: including(`${operation} (disabled)`) }));
  },
  checkItemsTableColumns(columns = itemsTableColumns) {
    columns.forEach((column) => {
      cy.do(changeInstanceModal.find(MultiColumnList()).scrollHeaderIntoView(column));
      cy.expect(changeInstanceModal.find(MultiColumnListHeader(column)).exists());
    });
  },
  selectHoldingOperation({ operation, shouldConfirm = true }) {
    cy.do(holdingOperationSelect.choose(operation));

    if (shouldConfirm) {
      this.clickSubmitButton();
    }
  },
  clickCancelButton() {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.do(cancelButton.click());

    cy.expect(changeInstanceModal.absent());
  },
  clickSubmitButton({ updated = true } = {}) {
    cy.expect(submitButton.has({ disabled: false }));
    cy.do(submitButton.click());

    if (updated) {
      cy.expect(changeInstanceModal.absent());
      InteractorsTools.checkCalloutMessage(OrderStates.orderInstanceConnectionUpdatedSuccessfully);
    }
  },
};
