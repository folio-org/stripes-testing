import {
  Button,
  Checkbox,
  HTML,
  MultiColumnListRow,
  Select,
  Selection,
  including,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';

const bindPiecesForm = HTML({ id: 'receiving-module-display' });
const cancelButton = bindPiecesForm.find(Button('Cancel'));
const bindButton = bindPiecesForm.find(Button('Bind'));

const bindItemFields = {
  materialType: bindPiecesForm.find(Select(including('Material type'))),
  permanentLoanType: bindPiecesForm.find(Select(including('Permanent loan type'))),
  permanentLocation: bindPiecesForm.find(Selection(including('Permanent location'))),
};

const buttons = {
  Cancel: cancelButton,
  Bind: bindButton,
};

export const ITEM_CREATED_MESSAGE = 'Item created successfully';

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
  selectPieces(piecesCount) {
    for (let index = 0; index < piecesCount; index++) {
      const pieceCheckbox = bindPiecesForm.find(
        Checkbox({ name: `receivedItems[${index}].checked` }),
      );

      cy.do(pieceCheckbox.click());
      cy.expect(pieceCheckbox.has({ checked: true }));
    }
  },
  fillBindItemDetails({ materialType, permanentLoanType, permanentLocation } = {}) {
    if (materialType) {
      cy.do(bindItemFields.materialType.choose(materialType));
    }
    if (permanentLoanType) {
      cy.do(bindItemFields.permanentLoanType.choose(permanentLoanType));
    }
    if (permanentLocation) {
      cy.do(bindItemFields.permanentLocation.choose(including(permanentLocation)));
    }
  },
  clickBindButton({ itemCreated = true } = {}) {
    cy.expect(bindButton.has({ disabled: false }));
    cy.do(bindButton.click());

    if (itemCreated) {
      InteractorsTools.checkCalloutMessage(ITEM_CREATED_MESSAGE);
    }
    cy.expect(bindButton.absent());
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(bindButton.absent());
  },
};
