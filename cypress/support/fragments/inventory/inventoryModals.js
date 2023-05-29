import { including } from '@interactors/html';
import { Button, Checkbox, Modal, MultiColumnListCell, Select, TextField } from '../../../../interactors';

const externalIdentifierType = Select({ name:'externalIdentifierType' });
const selectedJobProfile = Select({ name:'selectedJobProfileId' });
const externalIdentifierField = TextField({ name:'externalIdentifier' });
const importButton = Button('Import');
const singleReportImportModal = Modal('Single record import');

function getModalCheckboxByRow(row) { return Modal().find(MultiColumnListCell({ 'row': row, 'columnIndex': 0 })).find(Checkbox()); }
function buttonIsEnabled(name) { return cy.expect(Modal().find(Button(name)).is({ disabled: false })); }
function verifyListIsSortedInAlhpabeticalOrder() {
  const optionsArray = [];
  cy.get('[name="selectedJobProfileId"] option').each(($el, index) => {
    optionsArray[index] = $el.text();
  })
    .then(() => {
      expect(optionsArray).to.deep.equal(optionsArray.sort());  // note deep for arrays
    });
}

export default {
  verifyListIsSortedInAlhpabeticalOrder,
  verifySelectedRecords(elemCount) {
    for (let i = 0; i < elemCount; i++) {
      cy.expect(getModalCheckboxByRow(i).is({ disabled: false, checked: true }));
    }
  },

  verifySelectedRecordsCount(expectedCount) {
    cy.get('#selected-records-list [data-row-index]').then(elements => {
      expect(elements.length).to.eq(expectedCount);
    });
  },

  verifyButtons() {
    buttonIsEnabled('Cancel');
    buttonIsEnabled('Save & close');
  },

  verifyInventorySingleRecordModalWithSeveralTargetProfiles:() => {
    cy.expect([
      Modal('Single record import').exists(),
      externalIdentifierType.exists(),
      // alphabetical order
      selectedJobProfile.exists(),
      externalIdentifierField.exists(),
      Button('Cancel').exists(),
      importButton.has({ visible: false })
    ]);
  },

  verifyInventorySingleRecordModalWithOneTargetProfile:() => {
    cy.expect([
      Modal('Single record import').exists(),
      selectedJobProfile.exists(),
      externalIdentifierField.exists(),
      Button('Cancel').exists(),
      importButton.has({ visible: false })
    ]);
  },

  clickOnCheckboxes(count) {
    for (let i = 0; i < count; i++) {
      cy.do(getModalCheckboxByRow(i).click());
    }
  },

  save() { return cy.do(Modal().find(Button('Save & close')).click()); },

  selectExternalTarget(profileName) {
    cy.do(singleReportImportModal.find(externalIdentifierType).choose(profileName));
    cy.expect(singleReportImportModal.find(TextField(`Enter the ${profileName} identifier`)).exists());
  },

  selectTheProfileToBeUsed(profileName) {
    cy.do(singleReportImportModal.find(selectedJobProfile).choose(profileName));
    cy.expect(singleReportImportModal.find(selectedJobProfile).has({ content: including(profileName) }));
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
    cy.expect(singleReportImportModal.find(selectedJobProfile).has({ content: including(profileName) }));
    verifyListIsSortedInAlhpabeticalOrder();
  }
};
