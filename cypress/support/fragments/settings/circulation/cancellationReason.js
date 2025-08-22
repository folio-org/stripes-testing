import {
  Button,
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
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .then(($row) => {
        if (description) {
          cy.wrap($row).find('div[class*="mclCell-"]').eq(1).should('contain.text', description);
        }

        if (publicDescription) {
          cy.wrap($row)
            .find('div[class*="mclCell-"]')
            .eq(2)
            .should('contain.text', publicDescription);
        }

        const actionsCell = $row.find('div[class*="mclCell-"]').eq(3);
        actions.forEach((action) => {
          if (action === 'edit') {
            cy.get(actionsCell).find('button[icon="edit"]').should('exist');
          } else if (action === 'trash') {
            cy.get(actionsCell).find('button[icon="trash"]').should('exist');
          }
        });
      });
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
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .find('div[class*="mclCell-"]')
      .eq(3)
      .find('button[icon="trash"]')
      .click();
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
