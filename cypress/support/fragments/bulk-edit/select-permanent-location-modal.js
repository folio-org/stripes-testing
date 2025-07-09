import { including } from '@interactors/html';
import { Modal, Button, Selection, Select } from '../../../../interactors';

const selectPermanentLocationModal = Modal('Select permanent location');
const holdingsLocationInstitutionSelect = Select('Institution');
const holdingsLocationCampusSelect = Select('Campus');
const holdingsLocationLibrarySelect = Select('Library');
const holdingLocationSelect = Selection('Location');
const holdingsLocationSaveButton = Button('Save & close');

export default {
  selectExistingHoldingsLocation(locationObject) {
    cy.expect(selectPermanentLocationModal.exists());
    cy.do(holdingsLocationInstitutionSelect.choose(locationObject.institutionName));
    // wait until values applied in dropdowns
    cy.wait(3000);
    cy.expect([
      holdingsLocationInstitutionSelect.has({ value: locationObject.institutionId }),
      holdingsLocationCampusSelect.has({ value: locationObject.campusId }),
      holdingsLocationLibrarySelect.has({ value: locationObject.libraryId }),
    ]);
    cy.do([
      holdingLocationSelect.choose(including(locationObject.name)),
      holdingsLocationSaveButton.click(),
    ]);
    cy.expect(selectPermanentLocationModal.absent());
  },
};
