import { including } from 'bigtest';
import { Button, MultiColumnListCell, MultiColumnListRow, PaneHeader, Section, TextField, Modal, MultiColumnListHeader, TextArea, Checkbox, NavListItem } from '../../../../../interactors';

const rootSection = Section({ id: 'controlled-vocab-pane' });
const newButton = rootSection.find(Button({ id: 'clickable-add-settings-waives' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-settings-waives-') }));
const reasonTextField = rootSection.find(TextField({ placeholder: 'nameReason' }));
const descriptionTextField = TextField({ placeholder: 'description' });

const getRowByReason = (reason) => cy.then(() => rootSection.find(MultiColumnListCell(reason)).row());
const getDescriptionColumnIdex = () => cy.then(() => rootSection.find(MultiColumnListHeader('Description')).index());

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
