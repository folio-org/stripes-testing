import { including } from '@interactors/html';

import { Button, Modal, MultiColumnListCell } from '../../../../../interactors';

const rootModal = Modal({ id: 'bulk-renewal-modal' });

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  confirmRenewOverrideItem: () => {
    cy.do(Modal('Renew Confirmation').find(Button('Override')).click());
  },

  verifyRenewConfirmationModal: (renewalStatus, hasOverridePermission) => {
    cy.expect([
      MultiColumnListCell({ column: 'Renewal status' }).has({ content: including(renewalStatus) }),
      Button('Close').exists(),
    ]);
    if (hasOverridePermission) {
      cy.expect(Button('Override').exists());
    }
  },
};
