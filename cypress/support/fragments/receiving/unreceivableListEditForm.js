import {
  Button,
  Checkbox,
  HTML,
  MultiColumnListHeader,
  Pane,
  Section,
  TextArea,
} from '../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
  UNRECEIVABLE_LIST_COLUMN_HEADERS,
} from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import ReceivingStates from './receivingStates';

const unreceivableListEditForm = Section({ id: 'pane-title-unreceivable-pieces-list' });
const unreceiveListTable = unreceivableListEditForm.find(HTML({ id: 'title-expect-list' }));

const cancelButton = unreceivableListEditForm.find(Button(COMMON_BUTTON_LABELS.CANCEL));
const expectButton = unreceivableListEditForm.find(
  Button(RECEIVING_PIECE_FORM_ACTIONS_LABELS.EXPECT),
);

const SELECT_ALL_PIECES_CHECKBOX = 'Select all pieces';
const buttons = {
  Cancel: cancelButton,
  Expect: expectButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(unreceivableListEditForm.exists());
  },

  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },

  verifyFormView({ polNumber, titleName } = {}) {
    cy.expect(Pane({ title: `${polNumber} - ${titleName}` }).exists());
    cy.expect(Checkbox({ ariaLabel: SELECT_ALL_PIECES_CHECKBOX }).exists());

    Object.values(UNRECEIVABLE_LIST_COLUMN_HEADERS).forEach((content) => {
      cy.expect(unreceivableListEditForm.find(MultiColumnListHeader(content)).exists());
    });

    cy.expect(cancelButton.has({ disabled: false }));
    cy.expect(expectButton.has({ disabled: true }));
  },

  expectAll: ({ expectSaved = true } = {}) => {
    cy.do([Checkbox({ ariaLabel: SELECT_ALL_PIECES_CHECKBOX }).clickInput(), expectButton.click()]);
    if (expectSaved) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.expectSavedSuccessfully);
    }
  },

  clickUnreceivingItemCheckbox({ rowIndex = 0, checked = true } = {}) {
    cy.do(
      unreceiveListTable
        .find(Checkbox({ name: `unreceivablePieces[${rowIndex}].checked` }))
        .click(),
    );
    cy.expect(
      unreceiveListTable
        .find(Checkbox({ name: `unreceivablePieces[${rowIndex}].checked` }))
        .has({ checked }),
    );
  },

  fillInCommentField({ comment, rowIndex = 0 } = {}) {
    cy.do(
      unreceiveListTable
        .find(TextArea({ name: `unreceivablePieces[${rowIndex}].comment` }))
        .fillIn(comment),
    );
    cy.expect(
      unreceiveListTable
        .find(TextArea({ name: `unreceivablePieces[${rowIndex}].comment` }))
        .has({ value: comment }),
    );
  },

  clickCancelButton() {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.do(cancelButton.click());
  },

  clickExpectButton({ expectSaved = true } = {}) {
    cy.expect(expectButton.has({ disabled: false }));
    cy.do(expectButton.click());

    if (expectSaved) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.expectSavedSuccessfully);
    }
  },
};
