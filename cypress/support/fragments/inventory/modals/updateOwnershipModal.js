import { Button, Modal, Selection, SelectionList } from '../../../../../interactors';
import InventoryNewHoldings from '../inventoryNewHoldings';

const updateOwnershipModal = Modal({ header: 'Update ownership' });
const cancelButton = updateOwnershipModal.find(Button('Cancel'));
const updateButton = updateOwnershipModal.find(Button('Update'));

export default {
  validateUpdateOwnershipModalView(tenant) {
    cy.expect([
      updateOwnershipModal.exists(),
      updateOwnershipModal
        .find(Selection('Affiliation*'))
        .has({ singleValue: 'Select affiliation' }),
      updateOwnershipModal.find(Selection('Select holdings*')).exists(),
    ]);
    cy.do([
      updateOwnershipModal.find(Selection('Affiliation*')).open(),
      SelectionList().select(tenant),
    ]);
    cy.expect([
      updateOwnershipModal.find(Button('Create new holdings for location')).exists(),
      cancelButton.exists(),
      updateButton.has({ disabled: true }),
    ]);
  },

  createNewHoldingsForLocation() {
    cy.do(updateOwnershipModal.find(Button('Create new holdings for location')).click());
    InventoryNewHoldings.waitLoading();
    InventoryNewHoldings.close();
  },
};
