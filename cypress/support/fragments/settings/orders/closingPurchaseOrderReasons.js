import uuid from 'uuid';
import {
  Button,
  EditableListRow,
  MultiColumnListCell,
  Pane,
  TextField,
  Modal,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import InteractorsTools from '../../../utils/interactorsTools';

const reasonsPane = Pane({ id: 'controlled-vocab-pane' });
const saveButton = Button('Save');

function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  defaultClosingReason: {
    id: uuid(),
    reason: `ClosingReason_${getRandomPostfix()}`,
  },

  waitLoading: () => {
    cy.expect(reasonsPane.exists());
  },

  createClosingReason: (closingReason) => {
    cy.do(Button({ id: 'clickable-add-closingReasons' }).click());
    cy.do([
      TextField({ name: 'items[0].reason' }).fillIn(closingReason),
      reasonsPane.find(saveButton).click(),
    ]);
    // There are two spaces before closingReason in the callout message
    InteractorsTools.checkCalloutMessage(`The  ${closingReason} was successfully created`);
  },

  editClosingReason: (closingReason, editedReason) => {
    cy.do(
      MultiColumnListCell({ content: closingReason }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'edit' }))
            .click(),
        );
      }),
    );
    cy.do([TextField().fillIn(editedReason), reasonsPane.find(saveButton).click()]);
    // There are two spaces before editClosingReason in the callout message
    InteractorsTools.checkCalloutMessage(`The  ${editedReason} was successfully updated`);
  },

  deleteClosingReason: (closingReason) => {
    cy.do(
      MultiColumnListCell({ content: closingReason }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      }),
    );
    const confirmationModal = Modal('Delete closing reason');
    cy.expect(
      confirmationModal.has({ message: `The closing reason ${closingReason} will be deleted.` }),
    );
    const deleteButton = confirmationModal.find(Button('Delete'));
    cy.do(deleteButton.click());
    InteractorsTools.checkCalloutMessage(
      `The closing reason ${closingReason} was successfully deleted`,
    );
  },

  verifyClosingReasonAbsent: (reason) => {
    cy.expect(MultiColumnListCell(reason).absent());
  },

  verifySystemClosingReasonNotEditable: (systemReason) => {
    cy.do(
      MultiColumnListCell({ content: systemReason }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const row = getEditableListRow(rowNumber);
        cy.expect(row.find(Button({ icon: 'edit' })).absent());
        cy.expect(row.find(Button({ icon: 'trash' })).absent());
      }),
    );
  },
};
