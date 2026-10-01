import {
  Button,
  Checkbox,
  HTML,
  MultiColumnList,
  MultiColumnListRow,
  Pane,
  Section,
  TextArea,
  TextField,
  including,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME, RECEIVE_LIST_COLUMN_HEADERS } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import SelectLocationModal from '../orders/modals/selectLocationModal';
import ReceivingStates from './receivingStates';

const receivingsListEditForm = Section({ id: 'pane-title-receive-list' });
const receinigsListTable = receivingsListEditForm.find(HTML({ id: 'title-receive-list' }));

const cancelButton = receivingsListEditForm.find(Button('Cancel'));
const receiveButton = receivingsListEditForm.find(Button('Receive'));

const SELECT_ALL_PIECES_CHECKBOX = 'Select all pieces';
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
  verifyFormView({ polNumber, titleName } = {}) {
    cy.expect(Pane({ title: `${polNumber} - ${titleName}` }).exists());
    cy.expect(Checkbox({ ariaLabel: SELECT_ALL_PIECES_CHECKBOX }).has({ checked: false }));

    Object.values(RECEIVE_LIST_COLUMN_HEADERS).forEach((content) => {
      cy.expect(
        receivingsListEditForm.find(MultiColumnList()).has({ columns: including(content) }),
      );
    });

    cy.expect(cancelButton.has({ disabled: false }));
    cy.expect(receiveButton.has({ disabled: true }));
  },
  receiveAll({ receiveSaved = true } = {}) {
    cy.do([
      Checkbox({ ariaLabel: SELECT_ALL_PIECES_CHECKBOX }).clickInput(),
      receiveButton.click(),
    ]);
    if (receiveSaved) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
    }
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
  fillReceivingFields({
    rowIndex = 0,
    checked = true,
    comment,
    displayOnHolding,
    ...textFields
  } = {}) {
    Object.entries(textFields).forEach(([fieldName, value]) => {
      const field = receinigsListTable.find(
        TextField({ name: `receivedItems[${rowIndex}].${fieldName}` }),
      );

      cy.do(field.fillIn(value));
      cy.expect(field.has({ value }));
    });
    if (comment) {
      const commentField = receinigsListTable.find(
        TextArea({ name: `receivedItems[${rowIndex}].comment` }),
      );

      cy.do(commentField.fillIn(comment));
      cy.expect(commentField.has({ value: comment }));
    }
    if (displayOnHolding) {
      const displayOnHoldingCheckbox = receinigsListTable.find(
        Checkbox({ name: `receivedItems[${rowIndex}].displayOnHolding` }),
      );

      cy.do(displayOnHoldingCheckbox.click());
      cy.expect(displayOnHoldingCheckbox.has({ checked: true }));
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
