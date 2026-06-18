import { including, matching } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  ConfirmationModal,
  Decorator,
  DecoratorWrapper,
  Form,
  KeyValue,
  Section,
  Select,
  Option,
  TextArea,
  TextField,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';
import FinanceHelper from '../../../finance/financeHelper';
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
const orderLineDetails = {
  poLineDetails: orderDetails.orderLineInformation.find(Section({ id: 'po-line-details' })),
  costDetails: orderDetails.orderLineInformation.find(Section({ id: 'cost-details' })),
  locationDetails: orderDetails.orderLineInformation.find(Section(including('Location'))),
  physicalResourceDetails: orderDetails.orderLineInformation.find(
    Section({ id: 'physical-resource-details' }),
  ),
  eResourceDetails: orderDetails.orderLineInformation.find(Section({ id: 'e-resources-details' })),
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
  statisticalCodes: adminDataSection
    .find(Decorator('Statistical codes'))
    .find(Select('Select action')),
};
const orderInformationFields = {
  orderStatus: orderDetails.orderInformation.find(
    DecoratorWrapper({ label: including('Purchase order status') }).find(TextField()),
  ),
  overridePoLineLimit: orderDetails.orderInformation.find(
    TextField({ label: including('Override purchase order lines limit setting') }),
  ),
  vendor: orderDetails.orderInformation.find(TextField({ label: including('Vendor') })),
  vendorLookUp: orderDetails.orderInformation.find(Button('Organization look-up')),
  billToName: orderDetails.orderInformation.find(
    DecoratorWrapper({ label: 'Bill to name' }).find(TextField()),
  ),
  billToAddress: orderDetails.orderInformation.find(KeyValue('Bill to address')),
  shipToName: orderDetails.orderInformation.find(
    DecoratorWrapper({ label: 'Ship to name' }).find(TextField()),
  ),
  shipToAddress: orderDetails.orderInformation.find(KeyValue('Ship to address')),
};
const orderLineInformationFields = {
  title: orderDetails.orderLineInformation.find(TextField({ label: including('Title') })),
  acquisitionMethod: orderLineDetails.poLineDetails
    .find(DecoratorWrapper({ label: including('Acquisition method') }))
    .find(TextField()),
  orderFormat: orderLineDetails.poLineDetails
    .find(DecoratorWrapper({ label: including('Order format') }))
    .find(TextField()),
  receivingWorkflow: orderLineDetails.poLineDetails
    .find(DecoratorWrapper({ label: including('Receiving workflow') }))
    .find(TextField()),
  physicalUnitPrice: orderLineDetails.costDetails.find(TextField('Physical unit price')),
  quantityPhysical: orderLineDetails.costDetails.find(TextField('Quantity physical')),
  electronicUnitPrice: orderLineDetails.costDetails.find(TextField('Electronic unit price')),
  quantityElectronic: orderLineDetails.costDetails.find(TextField('Quantity electronic')),
  currency: orderLineDetails.costDetails
    .find(DecoratorWrapper({ label: including('Currency') }))
    .find(TextField()),
  materialSupplier: orderLineDetails.physicalResourceDetails.find(
    TextField({ label: including('Material supplier') }),
  ),
  pMaterialType: orderLineDetails.physicalResourceDetails.find(
    TextField({ label: including('Material type') }),
  ),
  materialSupplierLookUp: orderLineDetails.physicalResourceDetails.find(
    Button('Organization look-up'),
  ),
  createInventory: orderLineDetails.physicalResourceDetails
    .find(DecoratorWrapper({ label: including('Create inventory') }))
    .find(TextField()),
};

const electronicAccessFields = {
  select: detailsSection
    .find(Section({ id: matching('(?:holdings|item)-electronic-access') }))
    .find(Select('Select action')),
};

const locationFields = {
  quantityElectronic: orderLineDetails.locationDetails.find(TextField('Quantity electronic')),
};

const eResourceFields = {
  accessProvider: orderLineDetails.eResourceDetails.find(
    TextField({ label: including('Access provider') }),
  ),
  accessProviderLookUp: orderLineDetails.eResourceDetails.find(Button('Organization look-up')),
  activationStatus: orderLineDetails.eResourceDetails.find(Checkbox('Activation status')),
  activationDue: orderLineDetails.eResourceDetails
    .find(DecoratorWrapper({ label: including('Activation due') }))
    .find(TextField()),
  createInventory: orderLineDetails.eResourceDetails
    .find(DecoratorWrapper({ label: including('Create inventory') }))
    .find(TextField()),
  materialType: orderLineDetails.eResourceDetails.find(
    TextField({ label: including('Material type') }),
  ),
  trial: orderLineDetails.eResourceDetails.find(Checkbox('Trial')),
  expectedActivation: orderLineDetails.eResourceDetails
    .find(DecoratorWrapper({ label: including('Expected activation') }))
    .find(TextField()),
  userLimit: orderLineDetails.eResourceDetails.find(TextField({ label: including('User limit') })),
  url: orderLineDetails.eResourceDetails.find(TextField({ label: including('URL') })),
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
const statisticalCodesOptions = {
  'Select action': '',
  'Add these to existing': 'EXTEND_EXISTING',
  'Delete all existing values': 'DELETE_EXISTING',
  'Delete all existing and add these': 'EXCHANGE_EXISTING',
  'Find and remove these': 'DELETE_INCOMING',
};
const electronicAccessOptions = {
  'Select action': '',
  'Add these to existing': 'EXTEND_EXISTING',
  'Delete all existing values': 'DELETE_EXISTING',
  'Delete all existing and add these': 'EXCHANGE_EXISTING',
  'Find and remove these': 'DELETE_INCOMING',
};
const formButtons = {
  'Add location': orderDetails.orderLineInformation.find(Button('Add location')),
  Close: closeButton,
  'Save as profile & Close': saveAndCloseButton,
};

const formFields = {
  'Order information -> Bill to address': orderInformationFields.billToAddress,
  'Order information -> Ship to address': orderInformationFields.shipToAddress,
  'Physical resource details -> Material type': orderLineInformationFields.pMaterialType,
  'Cost details -> Electronic unit price': orderLineInformationFields.electronicUnitPrice,
  'Cost details -> Quantity electronic': orderLineInformationFields.quantityElectronic,
  'Location -> Quantity electronic': locationFields.quantityElectronic,
  'E-resources details -> Access provider': eResourceFields.accessProvider,
  'E-resources details -> Organization look-up': eResourceFields.accessProviderLookUp,
  'E-resources details -> Activation status': eResourceFields.activationStatus,
  'E-resources details -> Activation due': eResourceFields.activationDue,
  'E-resources details -> Create inventory': eResourceFields.createInventory,
  'E-resources details -> Material type': eResourceFields.materialType,
  'E-resources details -> Trial': eResourceFields.trial,
  'E-resources details -> Expected activation': eResourceFields.expectedActivation,
  'E-resources details -> User limit': eResourceFields.userLimit,
  'E-resources details -> URL': eResourceFields.url,
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
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(formFields[label].has(conditions));
    });
  },
  checkFieldValidationError({ orderInformation, shouldBlur = false }) {
    if (orderInformation?.length) {
      orderInformation.forEach(({ label, error }) => {
        if (shouldBlur) {
          cy.do(orderDetails.orderInformation.find(TextField({ label: including(label) })).blur());
        }

        cy.expect(
          orderDetails.orderInformation.find(TextField({ label: including(label) })).has({ error }),
        );
      });
    }
  },
  getDropdownOptionsList({ label }) {
    return cy.then(() => summarySection.find(Select({ label: including(label) })).allOptionsText());
  },
  checkDropdownOptionsList({ label, expectedList }) {
    this.getDropdownOptionsList({ label }).then((optionsList) => {
      cy.expect(optionsList).to.eql(expectedList);
    });
  },
  fillMappingProfileFields({
    summary,
    adminData,
    orderInformation,
    orderLineInformation,
    electronicAccess,
  }) {
    if (summary) {
      this.fillSummaryProfileFields(summary);
    }
    if (adminData) {
      this.fillAdministrativeDataProfileFields(adminData);
    }
    if (orderInformation) {
      this.fillOrderInformationProfileFields(orderInformation);
    }
    if (orderLineInformation) {
      this.fillOrderLineInformationProfileFields(orderLineInformation);
    }
    if (electronicAccess) {
      this.fillElectronicAccessProfileFields(electronicAccess);
    }
    cy.wait(300);
  },
  fillSummaryProfileFields({
    name,
    incomingRecordType,
    existingRecordType,
    description,
    clearField = false,
  }) {
    InteractorsTools.setTextFieldValue({
      textField: summaryFields.name,
      clearField,
      fieldValue: name,
    });
    if (description) {
      InteractorsTools.setTextFieldValue({
        textField: summaryFields.description,
        clearField,
        fieldValue: `"${description}"`,
      });
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
    cy.wait(2000);
  },
  fillAdministrativeDataProfileFields({ suppressFromDiscovery, statisticalCodes }) {
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

    if (statisticalCodes) {
      cy.do([
        administrativeDataFields.statisticalCodes.focus(),
        administrativeDataFields.statisticalCodes.choose(statisticalCodes),
      ]);
      cy.expect(
        administrativeDataFields.statisticalCodes.has({
          value: statisticalCodesOptions[statisticalCodes],
        }),
      );
    }
  },
  fillOrderInformationProfileFields({
    status,
    overridePoLineLimit,
    vendor,
    organizationLookUp,
    billToName,
    shipToName,
    clearField = false,
  }) {
    [
      { textField: orderInformationFields.orderStatus, fieldValue: status },
      { textField: orderInformationFields.overridePoLineLimit, fieldValue: overridePoLineLimit },
      { textField: orderInformationFields.vendor, fieldValue: vendor },
      { textField: orderInformationFields.billToName, fieldValue: billToName },
      { textField: orderInformationFields.shipToName, fieldValue: shipToName },
    ].forEach(({ textField, fieldValue }) => {
      InteractorsTools.setTextFieldValue({
        textField,
        clearField,
        fieldValue: fieldValue && `"${fieldValue}"`,
      });
    });

    if (organizationLookUp !== undefined) {
      cy.do([orderInformationFields.vendor.focus(), orderInformationFields.vendorLookUp.click()]);
      FinanceHelper.selectFromLookUpView({ itemName: organizationLookUp });
      cy.expect(orderInformationFields.vendor.has({ value: `"${organizationLookUp}"` }));
    }
  },
  fillOrderLineInformationProfileFields({
    title,
    contributors,
    productIds,
    poLineDetails,
    costDetails,
    locations,
    physicalResourceDetails,
    eResourceDetails,
  }) {
    if (title) {
      cy.do([
        orderLineInformationFields.title.focus(),
        orderLineInformationFields.title.fillIn(`"${title}"`),
      ]);
      cy.expect(orderLineInformationFields.title.has({ value: `"${title}"` }));
    }

    if (contributors?.length) {
      contributors.forEach((contributor, index) => {
        const nameField = `profile.mappingDetails.mappingFields[25].subfields.${index}.fields.0.value`;
        const typeField = `profile.mappingDetails.mappingFields[25].subfields.${index}.fields.1.value`;
        cy.do(orderDetails.orderLineInformation.find(Button('Add contributor')).click());

        if (contributor.name) {
          cy.do(
            orderDetails.orderLineInformation
              .find(TextField({ name: nameField }))
              .fillIn(`"${contributor.name}"`),
          );
          cy.expect(
            orderDetails.orderLineInformation
              .find(TextField({ name: nameField }))
              .has({ value: `"${contributor.name}"` }),
          );
        }

        if (contributor.type) {
          cy.do(
            orderDetails.orderLineInformation
              .find(TextField({ name: typeField }))
              .fillIn(`"${contributor.type}"`),
          );
          cy.expect(
            orderDetails.orderLineInformation
              .find(TextField({ name: typeField }))
              .has({ value: `"${contributor.type}"` }),
          );
        }
      });
    }

    if (productIds?.length) {
      productIds.forEach((productId, index) => {
        const idField = `profile.mappingDetails.mappingFields[26].subfields.${index}.fields.0.value`;
        const typeField = `profile.mappingDetails.mappingFields[26].subfields.${index}.fields.1.value`;

        cy.do(
          orderDetails.orderLineInformation
            .find(Button('Add product ID and product ID type'))
            .click(),
        );

        if (productId.id) {
          cy.do(
            orderDetails.orderLineInformation
              .find(TextField({ name: idField }))
              .fillIn(`"${productId.id}"`),
          );
          cy.expect(
            orderDetails.orderLineInformation
              .find(TextField({ name: idField }))
              .has({ value: `"${productId.id}"` }),
          );
        }

        if (productId.type) {
          cy.do(
            orderDetails.orderLineInformation
              .find(TextField({ name: typeField }))
              .fillIn(`"${productId.type}"`),
          );
          cy.expect(
            orderDetails.orderLineInformation
              .find(TextField({ name: typeField }))
              .has({ value: `"${productId.type}"` }),
          );
        }
      });
    }

    if (poLineDetails) {
      this.fillPoLineDetailsProfileFields(poLineDetails);
    }

    if (costDetails) {
      this.fillCostDetailsProfileFields(costDetails);
    }

    if (locations?.length) {
      this.fillLocationsDetailsProfileFields(locations);
    }

    if (physicalResourceDetails) {
      this.fillPhysicalResourceDetailsPfofileFields(physicalResourceDetails);
    }

    if (eResourceDetails) {
      this.fillElectronicResourceDetailsPfofileFields(eResourceDetails);
    }
  },
  fillPoLineDetailsProfileFields({
    acquisitionMethod,
    orderFormat,
    receivingWorkflow,
    clearField = false,
  }) {
    [
      { textField: orderLineInformationFields.acquisitionMethod, fieldValue: acquisitionMethod },
      { textField: orderLineInformationFields.orderFormat, fieldValue: orderFormat },
      { textField: orderLineInformationFields.receivingWorkflow, fieldValue: receivingWorkflow },
    ].forEach(({ textField, fieldValue }) => {
      InteractorsTools.setTextFieldValue({
        textField,
        clearField,
        fieldValue: fieldValue && `"${fieldValue}"`,
      });
    });
  },
  fillCostDetailsProfileFields({ physicalUnitPrice, currency }) {
    [
      { textField: orderLineInformationFields.physicalUnitPrice, fieldValue: physicalUnitPrice },
      { textField: orderLineInformationFields.currency, fieldValue: currency },
    ].forEach(({ textField, fieldValue }) => {
      InteractorsTools.setTextFieldValue({
        textField,
        fieldValue: fieldValue === undefined ? undefined : `"${fieldValue}"`,
      });
    });
  },
  fillLocationsDetailsProfileFields(locations = []) {
    locations.forEach((location, index) => {
      this.clickAddLocationButton();

      const nameField = `profile.mappingDetails.mappingFields[57].subfields.${index}.fields.0.value`;
      const quantityPhysicalField = `profile.mappingDetails.mappingFields[57].subfields.${index}.fields.1.value`;
      const quantityElectronicField = `profile.mappingDetails.mappingFields[57].subfields.${index}.fields.2.value`;

      if (location.name) {
        cy.do(
          orderDetails.orderLineInformation
            .find(TextField({ name: nameField }))
            .fillIn(`"${location.name}"`),
        );
        cy.expect(
          orderDetails.orderLineInformation
            .find(TextField({ name: nameField }))
            .has({ value: `"${location.name}"` }),
        );
      }

      if (location.quantityPhysical) {
        cy.do(
          orderDetails.orderLineInformation
            .find(TextField({ name: quantityPhysicalField }))
            .fillIn(`"${location.quantityPhysical}"`),
        );
        cy.expect(
          orderDetails.orderLineInformation
            .find(TextField({ name: quantityPhysicalField }))
            .has({ value: `"${location.quantityPhysical}"` }),
        );
      }

      if (location.quantityElectronic) {
        cy.do(
          orderDetails.orderLineInformation
            .find(TextField({ name: quantityElectronicField }))
            .fillIn(`"${location.quantityElectronic}"`),
        );
        cy.expect(
          orderDetails.orderLineInformation
            .find(TextField({ name: quantityElectronicField }))
            .has({ value: `"${location.quantityElectronic}"` }),
        );
      }
    });
  },
  fillPhysicalResourceDetailsPfofileFields({
    materialSupplier,
    materialType,
    organizationLookUp,
    createInventory,
  }) {
    [
      { textField: orderLineInformationFields.materialSupplier, fieldValue: materialSupplier },
      { textField: orderLineInformationFields.pMaterialType, fieldValue: materialType },
      { textField: orderLineInformationFields.createInventory, fieldValue: createInventory },
    ].forEach(({ textField, fieldValue }) => {
      InteractorsTools.setTextFieldValue({
        textField,
        fieldValue: fieldValue && `"${fieldValue}"`,
      });
    });

    if (organizationLookUp) {
      cy.do([
        orderLineInformationFields.materialSupplier.focus(),
        orderLineInformationFields.materialSupplierLookUp.click(),
      ]);
      FinanceHelper.selectFromLookUpView({ itemName: organizationLookUp });
      cy.expect(
        orderLineInformationFields.materialSupplier.has({ value: `"${organizationLookUp}"` }),
      );
    }
  },
  fillElectronicResourceDetailsPfofileFields({ accessProvider, organizationLookUp, materialType }) {
    [
      { textField: eResourceFields.accessProvider, fieldValue: accessProvider },
      { textField: eResourceFields.materialType, fieldValue: materialType },
    ].forEach(({ textField, fieldValue }) => {
      InteractorsTools.setTextFieldValue({
        textField,
        fieldValue: fieldValue && `"${fieldValue}"`,
      });
    });

    if (organizationLookUp) {
      cy.do([eResourceFields.accessProvider.focus(), eResourceFields.accessProviderLookUp.click()]);
      FinanceHelper.selectFromLookUpView({ itemName: organizationLookUp });
      cy.expect(eResourceFields.accessProvider.has({ value: `"${organizationLookUp}"` }));
    }
  },
  fillElectronicAccessProfileFields({ value }) {
    if (value) {
      cy.do([electronicAccessFields.select.focus(), electronicAccessFields.select.choose(value)]);
      cy.expect(electronicAccessFields.select.has({ value: electronicAccessOptions[value] }));
    }
  },
  clickAddLocationButton() {
    cy.do(formButtons['Add location'].click());
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
  clickSaveAndCloseButton({ profileCreated = true, profileUpdated = false } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());

    if (profileCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(Notifications.fieldMappingProfileCreatedSuccessfully)),
      );
      cy.expect(mappingProfileForm.absent());
    }

    if (profileUpdated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(Notifications.fieldMappingProfileUpdateSuccessfully)),
      );
      cy.expect(mappingProfileForm.absent());
    }
  },

  save: () => {
    cy.wait(1500);
    cy.do(Button('Save as profile & Close').click());
  },

  markFieldForProtection: (field) => {
    cy.get('div[class^="mclRow--"]')
      .find('div[class^="mclCell-"]')
      .contains(field)
      .then((elem) => {
        elem.parent()[0].querySelector('input[type="checkbox"]').click();
      });
  },

  fillInstanceStatusTerm: (status) => {
    cy.do(TextField('Instance status term').fillIn(status));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillCatalogedDate: (date) => {
    cy.do(TextField('Cataloged date').fillIn(date));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillFundDistriction: (fundData) => {
    cy.do([
      TextField('Fund ID').fillIn(fundData.fundId),
      TextField('Expense class').fillIn(fundData.expenseClass),
    ]);
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
    cy.do([
      TextField('Value').fillIn(`"${fundData.value}"`),
      Accordion('Fund distribution').find(Button('%')).click(),
    ]);
  },

  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),

  verifyFOLIORecordTypeOptionExists(type) {
    cy.expect(summaryFields.existingRecordType.find(Option(type)).exists());
  },

  verifyValueBySection: (sectionName, value, isRequired) => {
    if (isRequired) {
      cy.expect(TextField(`${sectionName}*`).has({ value: `"${value}"` }));
    } else {
      cy.expect(TextField(sectionName).has({ value: `"${value}"` }));
    }
  },

  verifyFolioRecordTypeOptions: (options) => {
    options.forEach((option) => {
      cy.expect(summaryFields.existingRecordType.has({ allOptionsText: including(option) }));
    });
  },
};
