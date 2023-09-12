import { Button, Modal } from '../../../../../../interactors';

const confirm = Modal('Confirm action profile changes');

export default {
  confirmChanges: () => cy.do(confirm.find(Button('Confirm')).click()),
  cancelChanges: () => cy.do(confirm.find(Button('Cancel')).click()),
};
