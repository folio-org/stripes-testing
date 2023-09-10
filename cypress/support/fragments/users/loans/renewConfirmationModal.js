import { Button, Modal } from '../../../../../interactors';

const rootModal = Modal({ id: 'bulk-renewal-modal' });

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  confirmRenewOverrideItem: () => {
    cy.do(Modal('Renew Confirmation').find(Button('Override')).click());
  },
};
