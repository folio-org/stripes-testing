import {
  Button,
  EditableListRow,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  TextField,
  including,
} from '../../../../../interactors';
import { REQUEST_METHOD } from '../../../constants';

const newButton = Button({ id: 'clickable-add-request-cancellation-reasons' });
const cancellationReasonTextField = TextField({ placeholder: 'name' });
const cancellationReasonDescriptionTextField = TextField({ placeholder: 'description' });
const cancellationReasonPublicDescriptionTextField = TextField({
  placeholder: 'publicDescription',
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

  fillCancellationReason(reason) {
    cy.do([
      cancellationReasonPublicDescriptionTextField.fillIn(reason.publicDescription),
      cancellationReasonDescriptionTextField.fillIn(reason.description),
      cancellationReasonTextField.fillIn(reason.name),
    ]);
  },

  saveCancellationReason() {
    cy.do(saveButton.click());
  },

  verifyErrorMessage(message) {
    cy.expect(MultiColumnListRow(including(message)).exists());
  },

  verifyNoReasonInTheList(name) {
    cy.expect(MultiColumnListRow({ isContainer: true, content: including(name) }).absent());
  },

  verifyReasonInTheList({ name, description = '', publicDescription = '', actions = [] }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
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
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    cy.expect(row.absent());
  },

  clickEditButtonForReason(name) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });
    cy.do(
      row
        .find(actionsCell)
        .find(Button({ icon: 'edit' }))
        .click(),
    );
  },

  clickTrashButtonForReason(name) {
    cy.do([
      MultiColumnListRow({ isContainer: true, content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },

  clickTrashButtonConfirm() {
    cy.do(confirmTrashButton.click());
    cy.wait(2000);
  },

  getCancellationReasonsViaAPI() {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.GET,
        path: 'cancellation-reason-storage/cancellation-reasons',
      })
      .then((response) => {
        return response.body.cancellationReasons;
      });
  },

  deleteCancellationReasonByNameViaAPI(name) {
    this.getCancellationReasonsViaAPI().then((reasons) => {
      const reason = reasons.find((r) => r.name === name);
      if (reason !== undefined) {
        cy.okapiRequest({
          method: REQUEST_METHOD.DELETE,
          path: `cancellation-reason-storage/cancellation-reasons/${reason.id}`,
        });
      }
    });
  },
};
