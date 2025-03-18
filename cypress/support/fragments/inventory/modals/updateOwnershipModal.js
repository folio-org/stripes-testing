import { Button, Modal, Selection, SelectionList } from '../../../../../interactors';
import SelectLocationModal from './selectLocationModal';

const updateOwnershipModal = Modal('Update ownership');
const cancelButton = updateOwnershipModal.find(Button('Cancel'));
const updateButton = updateOwnershipModal.find(Button('Update'));
const selectAffiliationDropdown = updateOwnershipModal.find(Selection('Affiliation*'));
const selectHoldingsDropdown = updateOwnershipModal.find(Selection('Select holdings*'));

function selectAffiliation(affiliation) {
  cy.do([selectAffiliationDropdown.open(), SelectionList().select(affiliation)]);
}

function selectHoldings(location) {
  cy.do([selectHoldingsDropdown.open(), SelectionList().select(location)]);
}

export default {
  selectAffiliation,
  selectHoldings,

  updateHoldings(tenant, location) {
    selectAffiliation(tenant);
    selectHoldings(location);
    cy.do(updateButton.click());
    cy.expect(updateOwnershipModal.absent());
    cy.do(Modal('Update ownership of items').find(Button('Confirm')).click());
  },

  validateAbilityToCreateNewHoldings(tenant) {
    selectAffiliation(tenant);
    cy.do(updateOwnershipModal.find(Button('Create new holdings for location')).click());
    SelectLocationModal.validateSelectLocationModalExists();
    SelectLocationModal.close();
  },

  validateUpdateOwnershipModalView(tenant) {
    cy.expect([
      updateOwnershipModal.exists(),
      selectAffiliationDropdown.has({ singleValue: 'Select affiliation' }),
      selectHoldingsDropdown.exists(),
    ]);
    cy.do([selectAffiliationDropdown.open(), SelectionList().select(tenant)]);
    cy.expect([
      updateOwnershipModal.find(Button('Create new holdings for location')).exists(),
      cancelButton.exists(),
      updateButton.has({ disabled: true }),
    ]);
  },

  validateLocationDropdown(location) {
    cy.wait(1500);
    cy.do(selectHoldingsDropdown.open());
    cy.then(() => {
      return SelectionList({ placeholder: 'Filter options list' }).optionList();
    }).then((list) => {
      cy.wait(1000);
      cy.wrap(list).should('include', location);
    });
  },
};
