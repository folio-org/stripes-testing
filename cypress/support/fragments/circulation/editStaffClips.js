import { Button, TextArea, NavListItem, Checkbox, Modal } from '../../../../interactors';

const editButton = Button({ id: 'clickable-edit-item' });
const staffClipsDescripton = TextArea({ id: 'input-staff-slip-description' });
const textCheck = 'The Wines of Italyc.2';
const saveButton = Button('Save & close');

export default {
  defaultUiEditStaffClips : {
    description: 'Created by autotest team',
  },
  editHold() {
    cy.do([
      NavListItem('Hold').click(),
      editButton.click(),
    ]);
  },
  editPickslip() {
    cy.do([
      NavListItem('Pick slip').click(),
      editButton.click(),
    ]);
  },
  editRequestDelivery() {
    cy.do([
      NavListItem('Request delivery').click(),
      editButton.click(),
    ]);
  },
  editTransit() {
    cy.do([
      NavListItem('Transit').click(),
      editButton.click(),
    ]);
  },
  fillStaffClips: (editStaffClipsHold) => {
    cy.get('#toolbar .ql-token ').click();
    cy.do([
      staffClipsDescripton.fillIn(editStaffClipsHold.description),
      Checkbox('item.title').click(),
      Checkbox('item.copy').click(),
      Button('Add token').click(),
      saveButton.click()
    ]);
  },
  previewStaffClips: () => {
    cy.do([
      Button('Preview').click(),
      Button('Close').click(),
    ]);
    cy.expect(Modal({ id: 'preview-modal' }).exists(textCheck));
  },
  clearStaffClips: () => {
    cy.do([
      Button('.ql-bold ql-active').click().type('{selectAll}{backspace}'),
      staffClipsDescripton.type('{selectAll}{backspace}'),
      saveButton.click()
    ]);
  },
};
