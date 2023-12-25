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
const detailsSection = mappingProfileForm.find(Section({ id: 'mapping-profile-details' }));
const actionProfilesSection = mappingProfileForm.find(
  Section({ id: 'mappingProfileFormAssociatedActionProfileAccordion' }),
);

const itemDetails = {
  administrativeData: detailsSection.find(Section({ id: 'administrative-data' })),
  itemData: detailsSection.find(Section({ id: 'item-data' })),
  enumerationData: detailsSection.find(Section({ id: 'enumeration-data' })),
  itemCondition: detailsSection.find(Section({ id: 'item-condition' })),
  itemNotes: detailsSection.find(Section({ id: 'item-notes' })),
  itemLoans: detailsSection.find(Section({ id: 'item-loans' })),
  itemLocation: detailsSection.find(Section({ id: 'item-location' })),
  itemElectronicAccess: detailsSection.find(Section({ id: 'item-electronic-access' })),
};
const holdingDetails = {
  administrativeData: detailsSection.find(Section({ id: 'administrative-data' })),
  holdingsLOcation: detailsSection.find(Section({ id: 'holdings-location' })),
  holdingsDetails: detailsSection.find(Section({ id: 'holdings-details' })),
  holdingsNotes: detailsSection.find(Section({ id: 'holdings-notes' })),
  holdingsElectronicAccess: detailsSection.find(Section({ id: 'holdings-electronic-access' })),
  holdingsReceivingHistory: detailsSection.find(Section({ id: 'holdings-receiving-history' })),
};

const invoiceDetails = {
  invoiceInformation: detailsSection.find(Section({ id: 'invoice-information' })),
  invoiceAdjustments: detailsSection.find(Section({ id: 'invoice-adjustments' })),
  vendorInformation: detailsSection.find(Section({ id: 'vendor-information' })),
  extendedInformation: detailsSection.find(Section({ id: 'extended-information' })),
  invoiceLineInformation: detailsSection.find(Section({ id: 'invoice-line-information' })),
  invoiceLIneFundDistribution: detailsSection.find(
    Section({ id: 'invoice-line-fund-distribution' }),
  ),
  invoiceLineAdjustments: detailsSection.find(Section({ id: 'invoice-line-adjustments' })),
};
const orderDetails = {
  orderInformation: detailsSection.find(Section({ id: 'order-information' })),
  orderLineInformation: detailsSection.find(Section({ id: 'order-line-information' })),
};

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

const formButtons = {
  Close: closeButton,
  'Save as profile & Close': saveAndCloseButton,
};

export default {
  waitLoading() {
    cy.expect(mappingProfileForm.exists());
  },
  verifyFormView({ type } = {}) {
    cy.expect([summarySection.exists(), actionProfilesSection.exists()]);

    if (type === 'ITEM') {
      Object.values(itemDetails).forEach((view) => cy.expect(view.exists()));
    }

    if (type === 'HOLDINGS') {
      Object.values(holdingDetails).forEach((view) => cy.expect(view.exists()));
    }

    if (type === 'INVOICE') {
      Object.values(invoiceDetails).forEach((view) => cy.expect(view.exists()));
    }

    if (type === 'ORDER') {
      Object.values(orderDetails).forEach((view) => cy.expect(view.exists()));
    }
  },
  checkButtonsConditions(buttons = []) {
    buttons.forEach(({ label, conditions }) => {
      cy.expect(formButtons[label].has(conditions));
    });
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
    cy.wait(2000);
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
