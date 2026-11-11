import {
  Button,
  Checkbox,
  HTML,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  Select,
  Selection,
  TextField,
  including,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import SelectLocationModal from '../orders/modals/selectLocationModal';

const bindPiecesForm = HTML({ id: 'receiving-module-display' });
const cancelButton = bindPiecesForm.find(Button('Cancel'));
const bindButton = bindPiecesForm.find(Button('Bind'));
const createNewHoldingForLocationButton = bindPiecesForm.find(
  Button('Create new holdings for location'),
);

const bindItemFields = {
  barcode: bindPiecesForm.find(TextField({ name: 'bindItem.barcode' })),
  callNumber: bindPiecesForm.find(TextField({ name: 'bindItem.callNumber' })),
  materialType: bindPiecesForm.find(Select(including('Material type'))),
  permanentLoanType: bindPiecesForm.find(Select(including('Permanent loan type'))),
  permanentLocation: bindPiecesForm.find(Selection(including('Permanent location'))),
  // Shown instead of the holdings dropdown after "Create new holdings for location"
  newHoldingLocation: bindPiecesForm.find(TextField({ name: 'bindItem.locationId' })),
};

const selectAllPiecesCheckbox = bindPiecesForm.find(Checkbox({ ariaLabel: 'Select all pieces' }));
const confirmBindingModal = Modal({ id: 'confirm-binding-modal' });
const transferRequestsButton = confirmBindingModal.find(Button('Transfer'));

export const ITEM_CREATED_MESSAGE = 'Item created successfully';

const checkItemCreated = (barcode) => {
  InteractorsTools.checkCalloutMessage(
    barcode ? `Item ${barcode} created successfully` : ITEM_CREATED_MESSAGE,
  );
  cy.expect(bindButton.absent());
};

const getPieceRow = (displaySummary) => bindPiecesForm.find(
  MultiColumnListRow({ content: including(displaySummary), isContainer: false }),
);

const buttons = {
  Cancel: cancelButton,
  Bind: bindButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(bindPiecesForm.exists());
  },
  checkFormTitle(title) {
    cy.expect(bindPiecesForm.has({ text: including(title) }));
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkPiecesCount(piecesCount) {
    for (let index = 0; index < piecesCount; index++) {
      cy.expect(bindPiecesForm.find(MultiColumnListRow({ index })).exists());
    }
    cy.expect(bindPiecesForm.find(MultiColumnListRow({ index: piecesCount })).absent());
  },
  checkPiecesOrder(displaySummaries = []) {
    displaySummaries.forEach((displaySummary, index) => {
      cy.expect(
        bindPiecesForm
          .find(MultiColumnListRow({ index, isContainer: false }))
          .has({ content: including(displaySummary) }),
      );
    });
  },
  selectPieces(piecesCount) {
    for (let index = 0; index < piecesCount; index++) {
      const pieceCheckbox = bindPiecesForm.find(
        Checkbox({ name: `receivedItems[${index}].checked` }),
      );

      cy.do(pieceCheckbox.click());
      cy.expect(pieceCheckbox.has({ checked: true }));
    }
  },
  selectAllPieces() {
    cy.do(selectAllPiecesCheckbox.click());
    cy.expect(selectAllPiecesCheckbox.has({ checked: true }));
  },
  selectPiecesByDisplaySummary(displaySummaries = []) {
    displaySummaries.forEach((displaySummary) => {
      const pieceCheckbox = getPieceRow(displaySummary).find(Checkbox());

      cy.do(pieceCheckbox.click());
      cy.expect(pieceCheckbox.has({ checked: true }));
    });
  },
  checkPieceRowContent(displaySummary, contents = []) {
    contents.forEach((content) => {
      cy.expect(getPieceRow(displaySummary).has({ content: including(content) }));
    });
  },
  checkBindItemFieldsEmpty() {
    cy.expect([
      bindItemFields.barcode.has({ value: '' }),
      bindItemFields.callNumber.has({ value: '' }),
      bindItemFields.materialType.has({ value: 'Select material type' }),
      bindItemFields.permanentLoanType.has({ value: 'Select loan type' }),
      bindItemFields.permanentLocation.find(HTML({ className: including('singleValue') })).absent(),
    ]);
  },
  checkPiecesTableColumns(columns = []) {
    const piecesList = bindPiecesForm.find(MultiColumnList());

    cy.expect(selectAllPiecesCheckbox.exists());
    columns.forEach((column) => {
      cy.expect(piecesList.has({ columns: including(column) }));
    });
  },
  fillBindItemDetails({
    barcode,
    callNumber,
    materialType,
    permanentLoanType,
    permanentLocation,
    newHoldingLocation,
  } = {}) {
    if (barcode) {
      cy.do(bindItemFields.barcode.fillIn(barcode));
      cy.expect(bindItemFields.barcode.has({ value: barcode }));
    }
    if (callNumber) {
      cy.do(bindItemFields.callNumber.fillIn(callNumber));
      cy.expect(bindItemFields.callNumber.has({ value: callNumber }));
    }
    if (materialType) {
      cy.do(bindItemFields.materialType.choose(materialType));
      cy.expect(bindItemFields.materialType.has({ checkedOptionText: materialType }));
    }
    if (permanentLoanType) {
      cy.do(bindItemFields.permanentLoanType.choose(permanentLoanType));
      cy.expect(bindItemFields.permanentLoanType.has({ checkedOptionText: permanentLoanType }));
    }
    if (permanentLocation) {
      cy.do(bindItemFields.permanentLocation.choose(including(permanentLocation)));
      cy.expect(
        bindItemFields.permanentLocation.has({ singleValue: including(permanentLocation) }),
      );
    }
    if (newHoldingLocation) {
      cy.do(createNewHoldingForLocationButton.click());
      SelectLocationModal.waitLoading();
      SelectLocationModal.selectLocation(newHoldingLocation);
      cy.expect(bindItemFields.newHoldingLocation.has({ value: including(newHoldingLocation) }));
    }
  },
  // With open requests on pieces items the "Transfer requests" confirmation modal appears
  clickBindButton({ itemCreated = true, barcode, hasOpenRequests = false } = {}) {
    cy.expect(bindButton.has({ disabled: false }));
    cy.do(bindButton.click());

    if (hasOpenRequests) {
      cy.expect(confirmBindingModal.exists());
    } else if (itemCreated) {
      checkItemCreated(barcode);
    } else {
      cy.expect(bindButton.absent());
    }
  },
  checkTransferRequestsModal(barcodes = []) {
    cy.expect([
      confirmBindingModal.has({
        message: including(
          `There are requests on the following pieces: ${barcodes.join(', ')}. Transfer requests to the new record?`,
        ),
      }),
      confirmBindingModal.find(Button('Cancel')).has({ disabled: false }),
      transferRequestsButton.has({ disabled: false }),
      confirmBindingModal.find(Button('Do not transfer')).has({ disabled: false }),
    ]);
  },
  clickTransferRequestsButton({ barcode } = {}) {
    cy.do(transferRequestsButton.click());
    cy.expect(confirmBindingModal.absent());
    checkItemCreated(barcode);
  },
  // With unsaved changes the form stays open behind the "Are you sure?" modal
  clickCancelButton({ hasUnsavedChanges = false } = {}) {
    cy.do(cancelButton.click());

    if (!hasUnsavedChanges) {
      cy.expect(bindButton.absent());
    }
  },
};
