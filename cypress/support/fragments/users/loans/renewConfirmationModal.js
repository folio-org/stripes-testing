import { including, matching } from '@interactors/html';

import { Button, Modal, MultiColumnListCell, MultiColumnListRow } from '../../../../../interactors';

const rootModal = Modal({ id: 'bulk-renewal-modal' });

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  confirmRenewOverrideItem: () => {
    cy.do(rootModal.find(Button('Override')).click());
  },

  closeModal: () => {
    cy.do(rootModal.find(Button('Close')).click());
    cy.expect(rootModal.absent());
  },

  verifyRenewConfirmationModal: (loansToCheck, hasOverridePermission = false) => {
    cy.expect(Button('Close').exists());
    loansToCheck.forEach((loan) => {
      cy.expect(
        rootModal
          .find(MultiColumnListRow({ text: matching(loan.itemBarcode), isContainer: false }))
          .find(MultiColumnListCell({ column: 'Renewal status' }))
          .has({ content: including(loan.status) }),
      );
    });
    if (hasOverridePermission) {
      cy.expect(Button('Override').exists());
    } else {
      cy.expect(Button('Override').absent());
    }
  },
};
