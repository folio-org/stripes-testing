import { including } from '@interactors/html';
import { Button, Modal, Select, TextField } from '../../../../interactors';

const externalIdentifierType = Select({ name: 'externalIdentifierType' });
const selectedJobProfile = Select({ name: 'selectedJobProfileId' });
const externalIdentifierField = TextField({ name: 'externalIdentifier' });
const importButton = Button('Import');
const singleReportImportModal = Modal('Single record import');

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
  verifyInventorySingleRecordModalWithSeveralTargetProfiles: () => {
    cy.expect([
      singleReportImportModal.exists(),
      externalIdentifierType.exists(),
      // alphabetical order
      selectedJobProfile.exists(),
      externalIdentifierField.exists(),
      Button('Cancel').exists(),
      importButton.has({ visible: false }),
    ]);
  },

  verifyInventorySingleRecordModalWithOneTargetProfile: () => {
    cy.expect([
      singleReportImportModal.exists(),
      selectedJobProfile.exists(),
      externalIdentifierField.exists(),
      Button('Cancel').exists(),
      importButton.has({ visible: false }),
    ]);
  },

  selectExternalTarget(profileName) {
    cy.do(singleReportImportModal.find(externalIdentifierType).choose(profileName));
    cy.expect(
      singleReportImportModal.find(TextField(`Enter the ${profileName} identifier`)).exists(),
    );
  },

  selectTheProfileToBeUsed(profileName) {
    cy.do(singleReportImportModal.find(selectedJobProfile).choose(profileName));
    cy.expect(
      singleReportImportModal.find(selectedJobProfile).has({ content: including(profileName) }),
    );
  },

  fillEnterTestIdentifier(identifier) {
    cy.do(singleReportImportModal.find(externalIdentifierField).fillIn(identifier));
    cy.expect(singleReportImportModal.find(externalIdentifierField).has({ value: identifier }));
  },

  import() {
    cy.do(singleReportImportModal.find(importButton).click());
    cy.expect(singleReportImportModal.absent());
  },

  verifySelectTheProfileToBeUsedField(profileName) {
    cy.expect(
      singleReportImportModal.find(selectedJobProfile).has({ content: including(profileName) }),
    );
    verifyListIsSortedInAlhpabeticalOrder();
  },
};
