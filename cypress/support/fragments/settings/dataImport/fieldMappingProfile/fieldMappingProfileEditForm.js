import {
  Button,
  ConfirmationModal,
  Form,
  Section,
  Select,
  TextArea,
  TextField,
  including,
  matching,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';
import Notifications from '../notifications';

const mappingProfileForm = Form({ id: 'mapping-profiles-form' });

const summarySection = mappingProfileForm.find(Section({ id: 'summary' }));
const detailsSection = mappingProfileForm.find(Section({ id: 'mapping-profile-details' }));
const adminDataSection = detailsSection.find(Section({ id: 'administrative-data' }));
const actionProfilesSection = mappingProfileForm.find(
  Section({ id: 'mappingProfileFormAssociatedActionProfileAccordion' }),
);

const itemDetails = {
  administrativeData: adminDataSection,
  itemData: detailsSection.find(Section({ id: 'item-data' })),
  enumerationData: detailsSection.find(Section({ id: 'enumeration-data' })),
  itemCondition: detailsSection.find(Section({ id: 'item-condition' })),
  itemNotes: detailsSection.find(Section({ id: 'item-notes' })),
  itemLoans: detailsSection.find(Section({ id: 'item-loans' })),
  itemLocation: detailsSection.find(Section({ id: 'item-location' })),
  itemElectronicAccess: detailsSection.find(Section({ id: 'item-electronic-access' })),
};
const holdingDetails = {
  administrativeData: adminDataSection,
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
const administrativeDataFields = {
  suppressFromDiscovery: adminDataSection.find(Select('Suppress from discovery')),
};
const electronicAccessFields = {
  select: detailsSection
    .find(Section({ id: matching('(?:holdings|item)-electronic-access') }))
    .find(Select('Select action')),
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

const suppressFromDiscoveryOptions = {
  'Select сheckbox field mapping': '',
  'Mark for all affected records': 'ALL_TRUE',
  'Unmark for all affected records': 'ALL_FALSE',
  'Keep the existing value for all affected records': 'AS_IS',
};
const electronicAccessOptions = {
  'Select action': '',
  'Add these to existing': 'EXTEND_EXISTING',
  'Delete all existing values': 'DELETE_EXISTING',
  'Delete all existing and add these': 'EXCHANGE_EXISTING',
  'Find and remove these': 'DELETE_INCOMING',
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
  fillMappingProfileFields({ summary, adminData, electronicAccess }) {
    if (summary) {
      this.fillSummaryProfileFields(summary);
    }
    if (adminData) {
      this.fillAdministrativeDataProfileFields(adminData);
    }
    if (electronicAccess) {
      this.fillElectronicAccessProfileFields(electronicAccess);
    }
    cy.wait(300);
  },
  fillSummaryProfileFields({ name, incomingRecordType, existingRecordType, description }) {
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
  fillAdministrativeDataProfileFields({ suppressFromDiscovery }) {
    if (suppressFromDiscovery) {
      cy.do([
        administrativeDataFields.suppressFromDiscovery.focus(),
        administrativeDataFields.suppressFromDiscovery.choose(suppressFromDiscovery),
      ]);
      cy.expect(
        administrativeDataFields.suppressFromDiscovery.has({
          value: suppressFromDiscoveryOptions[suppressFromDiscovery],
        }),
      );
    }
  },
  fillElectronicAccessProfileFields({ value }) {
    if (value) {
      cy.do([electronicAccessFields.select.focus(), electronicAccessFields.select.choose(value)]);
      cy.expect(electronicAccessFields.select.has({ value: electronicAccessOptions[value] }));
    }
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
  clickSaveAndCloseButton({ profileCreated = true } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(mappingProfileForm.absent());

    if (profileCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(Notifications.fieldMappingProfileCreatedSuccessfully)),
      );
    }
  },
};
