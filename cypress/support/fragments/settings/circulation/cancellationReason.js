import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  TextField,
  including,
} from '../../../../../interactors';

const newButton = Button({ id: 'clickable-add-request-cancellation-reasons' });
const cancellationReasonTextField = TextField({ name: 'items[0].name' });
const cancellationReasonDescriptionTextField = TextField({ name: 'items[0].description' });
const cancellationReasonPublicDescriptionTextField = TextField({
  name: 'items[0].publicDescription',
});
const confirmTrashButton = Button({
  id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm',
});
const saveButton = Button('Save');

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  waitLoading() {
    cy.expect(Pane('Request cancellation reasons').exists());
    cy.wait(1000);
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  setCancellationReasonName(name) {
    cy.do(cancellationReasonTextField.fillIn(name));
  },

  setCancellationReason(reason) {
    cy.do(cancellationReasonPublicDescriptionTextField.fillIn(reason.publicDescription));
    cy.do(cancellationReasonDescriptionTextField.fillIn(reason.description));
    cy.do(cancellationReasonTextField.fillIn(reason.name));
  },

  saveCancellationReason() {
    cy.do(saveButton.click());
  },

  verifyErrorMessage(message) {
    cy.expect(MultiColumnListRow(including(message)).exists());
  },

  verifyNoReasonInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },

  verifyReasonInTheList({ name, description = '', publicDescription = '', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: description })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 2, content: publicDescription })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    } else {
      Object.values(reasonsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyReasonAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickEditButtonForReason(name) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });
    cy.log();
    cy.do(
      row
        .find(actionsCell)
        .find(Button({ icon: 'edit' }))
        .click(),
    );
  },

  clickTrashButtonForReason(name) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });
    cy.log();
    cy.do(
      row
        .find(actionsCell)
        .find(Button({ icon: 'trash' }))
        .click(),
    );
  },

  clickTrashButtonConfirm() {
    cy.do(confirmTrashButton.click());
  },
};
