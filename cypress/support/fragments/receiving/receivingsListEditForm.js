import {
  Button,
  Checkbox,
  HTML,
  MultiColumnListRow,
  Section,
  TextField,
  including,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import SelectLocationModal from '../orders/modals/selectLocationModal';
import ReceivingStates from './receivingStates';

const receivingsListEditForm = Section({ id: 'pane-title-receive-list' });
const receinigsListTable = receivingsListEditForm.find(HTML({ id: 'title-receive-list' }));

const cancelButton = receivingsListEditForm.find(Button('Cancel'));
const receiveButton = receivingsListEditForm.find(Button('Receive'));

const buttons = {
  Cancel: cancelButton,
  Receive: receiveButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(receivingsListEditForm.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkReceivingItemFieldValue({ fieldName, fieldValue, rowIndex = 0, strictMode = true } = {}) {
    cy.expect(
      receivingsListEditForm
        .find(TextField({ name: `receivedItems[${rowIndex}].${fieldName}` }))
        .has({ value: strictMode ? fieldValue : including(fieldValue) }),
    );
  },
  checkReceivingItemDetails({ copyNumber, barcode, receivedLocation, rowIndex } = {}) {
    if (copyNumber) {
      this.checkReceivingItemFieldValue({
        fieldName: 'copyNumber',
        fieldValue: copyNumber,
        rowIndex,
      });
    }
    if (barcode) {
      this.checkReceivingItemFieldValue({ fieldName: 'barcode', fieldValue: barcode, rowIndex });
    }
    if (receivedLocation) {
      this.checkReceivingItemFieldValue({
        fieldName: 'locationId',
        fieldValue: receivedLocation,
        rowIndex,
        strictMode: false,
      });
    }
  },
  fillReceivingFields({ barcode, rowIndex = 0, checked = true } = {}) {
    if (barcode) {
      cy.do(
        receinigsListTable
          .find(TextField({ name: `receivedItems[${rowIndex}].barcode` }))
          .fillIn(barcode),
      );
      cy.expect(
        receinigsListTable
          .find(TextField({ name: `receivedItems[${rowIndex}].barcode` }))
          .has({ value: barcode }),
      );
    }
    if (checked) {
      cy.do(
        receinigsListTable.find(Checkbox({ name: `receivedItems[${rowIndex}].checked` })).click(),
      );
      cy.expect(
        receinigsListTable
          .find(Checkbox({ name: `receivedItems[${rowIndex}].checked` }))
          .has({ checked }),
      );
    }
  },
  clickCreateNewHoldingsButton({ rowIndex = 0 } = {}) {
    cy.do(
      receinigsListTable
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
        .find(Button('Create new holdings for location'))
        .click(),
    );
    SelectLocationModal.waitLoading();
    SelectLocationModal.verifyModalView();

    return SelectLocationModal;
  },
  clickCancelButton() {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.do(cancelButton.click());
  },
  clickReceiveButton({ receiveSaved = true } = {}) {
    cy.expect(receiveButton.has({ disabled: false }));
    cy.do(receiveButton.click());

    if (receiveSaved) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
    }
  },
};
