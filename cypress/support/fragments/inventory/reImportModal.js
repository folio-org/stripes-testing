import { including } from '@interactors/html';
import { Button, Modal, Select, TextField } from '../../../../interactors';

const externalIdentifierType = Select({ name: 'externalIdentifierType' });
const selectedJobProfile = Select({ name: 'selectedJobProfileId' });
const externalIdentifierField = TextField({ name: 'externalIdentifier' });
const importButton = Button('Import');
const reImportModal = Modal('Re-import');

function verifyListIsSortedInAlhpabeticalOrder() {
  const optionsArray = [];
  cy.get('[name="selectedJobProfileId"] option')
    .each(($el, index) => {
      optionsArray[index] = $el.text();
    })
    .then(() => {
      expect(optionsArray).to.deep.equal(optionsArray.sort()); // note deep for arrays
    });
}

export default {
  selectExternalTarget(profileName) {
    cy.do(reImportModal.find(externalIdentifierType).choose(profileName));
    cy.expect(reImportModal.find(TextField(`Enter the ${profileName} identifier`)).exists());
  },

  selectTheProfileToBeUsedToOverlayTheCurrentData(profileName) {
    cy.do(reImportModal.find(selectedJobProfile).choose(profileName));
    cy.expect(reImportModal.find(selectedJobProfile).has({ content: including(profileName) }));
  },

  fillEnterTheTargetIdentifier(identifier) {
    cy.do(reImportModal.find(externalIdentifierField).fillIn(identifier));
    cy.expect(reImportModal.find(externalIdentifierField).has({ value: identifier }));
  },

  import() {
    cy.do(reImportModal.find(importButton).click());
    cy.expect(reImportModal.absent());
  },

  verifyModalWithOneTargetProfile: () => {
    cy.expect([
      reImportModal.exists(),
      selectedJobProfile.exists(),
      externalIdentifierField.exists(),
      Button('Cancel').exists(),
      importButton.has({ visible: false }),
    ]);
  },

  verifyModalWithSeveralTargetProfiles: () => {
    cy.expect([
      reImportModal.exists(),
      externalIdentifierType.exists(),
      selectedJobProfile.exists(),
      externalIdentifierField.exists(),
      Button('Cancel').exists(),
      importButton.has({ visible: false }),
    ]);
  },

  verifySelectTheProfileToBeUsedToOverlayTheCurrentDataField(profileName) {
    cy.expect(reImportModal.find(selectedJobProfile).has({ content: including(profileName) }));
    verifyListIsSortedInAlhpabeticalOrder();
  },

  verifyExternalTargetField(profileName) {
    cy.expect(reImportModal.find(externalIdentifierType).has({ content: including(profileName) }));
    verifyListIsSortedInAlhpabeticalOrder();
  },
};
