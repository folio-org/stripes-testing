import { Button, Section, TextField, TextArea, Checkbox, NavListItem } from '../../../../../interactors';

export default {

  newPatronTemlate() {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
  },

  fillInPatronTemlateInformation(name, description) {
    cy.do([
      TextField({ name: 'name' }).fillIn(name),
      Section({ id: 'blockInformation' }).find(TextArea({ name: 'blockTemplate.desc' })).fillIn(description),
      Checkbox('Borrowing').click(),
      Button('Save & close').click()
    ]);
  },

  findPatronTemlate(templateName) {
    cy.do(NavListItem(templateName).click());
  },

  editPatronTemplate() {
    cy.do(Button({ id: 'clickable-edit-item' }).click());
  },

  deletePatronTemplate() {
    cy.do([
      Button({ id: 'clickable-delete-block-template' }).click(),
      Button({ id: 'clickable-delete-block-template-confirmation-confirm' }).click(),
    ]);
  },

};
