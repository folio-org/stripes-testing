import { including } from '@interactors/html';
import { Button, Modal } from '../../../../../interactors';

const linkedToLocalAuthoritiesModal = Modal('Linked to local authorities');
const cancelButton = linkedToLocalAuthoritiesModal.find(Button('Cancel'));
const proceedButton = linkedToLocalAuthoritiesModal.find(Button('Proceed'));

export default {
  waitLoading() {
    cy.expect(linkedToLocalAuthoritiesModal.exists());
  },

  verifyModalView(numberOfLinkedFields = 1) {
    cy.expect([
      linkedToLocalAuthoritiesModal.has({
        header: 'Linked to local authorities',
      }),
      linkedToLocalAuthoritiesModal.has({
        message: including(
          `If you proceed with sharing this instance, then ${numberOfLinkedFields} bibliographic fields linked to local authority records will retain authorized values but will become uncontrolled`,
        ),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      proceedButton.has({ disabled: false, visible: true }),
    ]);
  },

  isNotDisplayed() {
    cy.expect(linkedToLocalAuthoritiesModal.absent());
  },

  clickCancel() {
    cy.do(cancelButton.click());
    cy.expect(linkedToLocalAuthoritiesModal.absent());
  },

  clickProceed() {
    cy.do(proceedButton.click());
    cy.expect(linkedToLocalAuthoritiesModal.absent());
  },
};
