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
    cy.do([
      staffClipsDescripton.fillIn(editStaffClipsHold.description),
      Button({ className: 'ql-token' }).click(),
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
  fillAndPreviewTemplate(editStaffClipsHold) {
    this.fillStaffClips(editStaffClipsHold);
    this.previewStaffClips();
  },
  clearStaffClips: () => {
    cy.get('#template-editor').type('{selectAll}{backspace}');
    cy.get('#input-staff-slip-description').type('{selectAll}{backspace}');
    cy.do(saveButton.click());
  },
  editAndClearHold() {
    this.editHold();
    this.clearStaffClips();
  },
  editAndClearPickslip() {
    cy.do(Button({ icon: 'times' }).click());
    this.editPickslip();
    this.clearStaffClips();
  },
  editAndClearRequestDelivery() {
    cy.do(Button({ icon: 'times' }).click());
    this.editRequestDelivery();
    this.clearStaffClips();
  },
  editAndClearTransit() {
    cy.do(Button({ icon: 'times' }).click());
    this.editTransit();
    this.clearStaffClips();
  },
};
