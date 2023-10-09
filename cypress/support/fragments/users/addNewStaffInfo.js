import { Button, Modal, TextArea } from '../../../../interactors';

const rootModal = Modal('Staff information');
const commentTextArea = rootModal.find(TextArea({ name: 'comment' }));
export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
    cy.expect(commentTextArea.exists());
  },
  fillIn: (info) => cy.do(commentTextArea.fillIn(info)),
  submit: () => cy.do(rootModal.find(Button('Save')).click()),
  checkStaffInfoModalClosed: () => cy.expect(rootModal.absent()),
};
