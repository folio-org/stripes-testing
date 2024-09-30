import { Button, Modal, Section, Select } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const cancelEditingConfirmationModal = Modal({ id: 'cancel-editing-confirmation' });

export default {
  waitLoading() {
    cy.expect(Section({ id: 'central-ordering' }).exists());
  },

  selectAddressType(addressType) {
    cy.wait(4000);
    cy.do(Select({ name: 'ROUTING_USER_ADDRESS_TYPE_ID' }).choose(addressType));
  },

  checkAddressTypeOption(addressType) {
    cy.wait(4000);
    cy.expect(Select({ name: 'ROUTING_USER_ADDRESS_TYPE_ID' }).hasValue(addressType));
  },

  save() {
    cy.do(Button({ id: 'clickable-save-routing-address-footer' }).click());
    InteractorsTools.checkCalloutMessage('Routing address setting was successfully updated');
  },

  closeWhitoutSaving() {
    cy.expect(cancelEditingConfirmationModal.exists());
    cy.do(Button({ id: 'clickable-cancel-editing-confirmation-cancel' }).click());
  },

  keepEditing() {
    cy.expect(cancelEditingConfirmationModal.exists());
    cy.do(Button({ id: 'clickable-cancel-editing-confirmation-confirm' }).click());
  },
};
