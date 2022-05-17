import { Pane, Checkbox, TextArea, Button } from '../../../../../interactors';

const rootPane = Pane('Maximum number of overdue items');
const blockCheckboxes = {
  borrowing: Checkbox({ id:'blockBorrowing' }),
  renewals: Checkbox({ id:'blockRenewals' }),
  requests: Checkbox({ id:'blockRequests' }),
};
const message = rootPane.find(TextArea({ id:'message' }));
const saveButton = rootPane.find(Button('Save'));

export default {
  checkInitialState: () => {
    Object.values(blockCheckboxes).forEach(blockCheckbox => {
      cy.expect(rootPane.find(blockCheckbox).exists());
      cy.expect(rootPane.find(blockCheckbox).has({ disabled: false }));
      cy.expect(rootPane.find(blockCheckbox).has({ chacked: false }));
      cy.expect(message.has({ textContent: '' }));
      cy.expect(saveButton.has({ disabled: true }));
    });
  }

};
