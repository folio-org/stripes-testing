import {
  Button,
  ConfirmationModal,
  Form,
  Section,
  Select,
  TextArea,
  TextField,
  including,
} from '../../../../../../interactors';

const mappingProfileForm = Form({ id: 'mapping-profiles-form' });

const summarySection = mappingProfileForm.find(Section({ id: 'summary' }));
const actionProfilesSection = mappingProfileForm.find(
  Section({ id: 'mappingProfileFormAssociatedActionProfileAccordion' }),
);

const closeButton = mappingProfileForm.find(Button('Close'));
const saveAndCloseButton = mappingProfileForm.find(Button('Save as profile & Close'));

const summaryFields = {
  name: summarySection.find(TextField({ name: 'profile.name' })),
  incomingRecordType: summarySection.find(Select({ name: 'profile.incomingRecordType' })),
  existingRecordType: summarySection.find(Select({ name: 'profile.existingRecordType' })),
  description: summarySection.find(TextArea({ name: 'profile.description' })),
};

const incomingRecordTypes = {
  'MARC Bibliographic': 'MARC_BIBLIOGRAPHIC',
  'MARC Holdings': 'MARC_HOLDINGS',
  'MARC Authority': 'MARC_AUTHORITY',
  'EDIFACT invoice': 'EDIFACT_INVOICE',
};
const existingRecordTypes = {
  Instance: 'INSTANCE',
  Holdings: 'HOLDINGS',
  Item: 'ITEM',
  Order: 'ORDER',
  Invoice: 'INVOICE',
  'MARC Bibliographic': 'MARC_BIBLIOGRAPHIC',
  'MARC Holdings': 'MARC_HOLDINGS',
  'MARC Authority': 'MARC_AUTHORITY',
};

export default {
  waitLoading() {
    cy.expect(mappingProfileForm.exists());
  },
  verifyFormView() {
    cy.expect([summarySection.exists(), actionProfilesSection.exists()]);
  },
  getDropdownOptionsList({ label }) {
    return cy.then(() => summarySection.find(Select({ label: including(label) })).allOptionsText());
  },
  checkDropdownOptionsList({ label, expectedList }) {
    this.getDropdownOptionsList({ label }).then((optionsList) => {
      cy.expect(optionsList).to.eql(expectedList);
    });
  },
  fillMappingProfileFields({ name, incomingRecordType, existingRecordType, description }) {
    if (name) {
      cy.do(summaryFields.name.fillIn(name));
      cy.expect(summaryFields.name.has({ value: name }));
    }
    if (incomingRecordType) {
      cy.do(summaryFields.incomingRecordType.choose(incomingRecordType));
      cy.expect(
        summaryFields.incomingRecordType.has({ value: incomingRecordTypes[incomingRecordType] }),
      );
    }
    if (existingRecordType) {
      cy.do(summaryFields.existingRecordType.choose(existingRecordType));
      cy.expect(
        summaryFields.existingRecordType.has({ value: existingRecordTypes[existingRecordType] }),
      );
    }
    if (description) {
      cy.do(summaryFields.description.fillIn(description));
      cy.expect(summaryFields.description.has({ value: description }));
    }
    cy.wait(300);
  },
  clickCloseButton({ closeWoSaving = true } = {}) {
    cy.expect(closeButton.has({ disabled: false }));
    cy.do(closeButton.click());

    if (closeWoSaving) {
      const confirmModal = ConfirmationModal('Are you sure?');
      cy.expect(confirmModal.has({ message: 'There are unsaved changes' }));
      cy.do(confirmModal.confirm('Close without saving'));
    }
    cy.wait(300);
    cy.expect(mappingProfileForm.absent());
  },
  clickSaveAndCloseButton() {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(mappingProfileForm.absent());
  },
};
