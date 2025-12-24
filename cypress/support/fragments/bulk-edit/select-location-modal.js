import { including } from '@interactors/html';
import { Modal, Button, Select, Selection } from '../../../../interactors';

const selectLocationModal = Modal();
const selectPermanentLocationModal = Modal('Select permanent location');
const selectTemporaryLocationModal = Modal('Select temporary location');
const institutionSelect = Select('Institution');
const campusSelect = Select('Campus');
const librarySelect = Select('Library');
const locationSelect = Selection('Location');
const saveButton = Button('Save & close');
const cancelButton = Button('Cancel');

export default {
  waitLoading(locationType = 'permanent') {
    if (locationType === 'permanent') {
      cy.expect(selectPermanentLocationModal.exists());
    }
    if (locationType === 'temporary') {
      cy.expect(selectTemporaryLocationModal.exists());
    }
  },

  verifySelectLocationModal() {
    cy.expect([
      institutionSelect.has({ disabled: false }),
      campusSelect.has({ disabled: true }),
      librarySelect.has({ disabled: true }),
      Button({ id: 'locationId' }).has({ disabled: true }),
      selectLocationModal.find(cancelButton).has({ disabled: false }),
      selectLocationModal.find(saveButton).has({ disabled: true }),
    ]);
  },

  selectExistingHoldingsLocation(locationObject) {
    cy.expect(selectPermanentLocationModal.exists());
    cy.do(institutionSelect.choose(locationObject.institutionName));
    // wait until values applied in dropdowns
    cy.wait(2000);
    cy.do(campusSelect.choose(locationObject.campusName));
    cy.wait(3000);
    cy.expect([
      institutionSelect.has({ value: locationObject.institutionId }),
      campusSelect.has({ value: locationObject.campusId }),
      librarySelect.has({ value: locationObject.libraryId }),
    ]);
    cy.do([locationSelect.choose(including(locationObject.name)), saveButton.click()]);
    cy.expect(selectPermanentLocationModal.absent());
  },

  fillInSelectLocationForm(institutionName, campusName, locationName) {
    cy.do(institutionSelect.choose(institutionName));
    cy.wait(2000);
    if (campusName) {
      cy.do(campusSelect.choose(campusName));
      cy.wait(1000);
      cy.expect(locationSelect.exists());
    }
    if (locationName) {
      cy.do(locationSelect.click());
      cy.wait(1000);
      cy.do([locationSelect.choose(including(locationName)), saveButton.click()]);
      cy.wait(1000);
    }
    cy.expect(selectLocationModal.absent());
  },
};
