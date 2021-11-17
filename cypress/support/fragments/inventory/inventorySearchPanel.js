import { MultiSelect } from '../../../../interactors';

export default class InventorySearchPanel {
  static effectiveLocationInput = MultiSelect({ 'id': 'multiselect-6' });
  static effectiveLocationValues = {
    'mainLibrary': 'Main Library'
  }


  static selectAllCheckboxResult() {
    return cy.get('[aria-label="Select instance"]').click({ multiple: true })
  }
}
