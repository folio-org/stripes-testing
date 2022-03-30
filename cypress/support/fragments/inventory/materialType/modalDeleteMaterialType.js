import { Button, Modal } from '../../../../../interactors';

export default {
  createNewMaterialType:() => {
    cy.do(Modal('Delete Material type').find(Button('Delete')).click());
  },
};
