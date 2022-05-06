import { Button, Modal } from '../../../../../interactors';

export default {
  confirmRenewOverrideItem:() => {
    cy.do(Modal('Renew Confirmation').find(Button('Override')).click());
  },
};
