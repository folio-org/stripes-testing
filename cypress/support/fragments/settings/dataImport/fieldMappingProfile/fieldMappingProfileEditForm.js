import {
  Button,
  ConfirmationModal,
  Decorator,
  DecoratorWrapper,
  Form,
  Section,
  Select,
  TextArea,
  TextField,
  including,
  matching,
} from '../../../../../../interactors';
import FinanceHelper from '../../../finance/financeHelper';
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
const orderLineDetails = {
  poLineDetails: orderDetails.orderLineInformation.find(Section({ id: 'po-line-details' })),
  costDetails: orderDetails.orderLineInformation.find(Section({ id: 'cost-details' })),
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
  currency: orderLineDetails.costDetails
    .find(DecoratorWrapper({ label: including('Currency') }))
    .find(TextField()),
  materialSupplier: orderLineDetails.physicalResourceDetails.find(
    TextField({ label: including('Material supplier') }),
  ),
  materialSupplierLookUp: orderLineDetails.physicalResourceDetails.find(
    Button('Organization look-up'),
  ),
  createInventory: orderLineDetails.physicalResourceDetails
    .find(DecoratorWrapper({ label: including('Create inventory') }))
    .find(TextField()),
  accessProvider: orderLineDetails.eResourceDetails.find(
    TextField({ label: including('Access provider') }),
  ),
  accessProviderLookUp: orderLineDetails.eResourceDetails.find(Button('Organization look-up')),
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
    useQuates = true,
  }) {
    if (status !== undefined) {
      const value = useQuates ? `"${status}"` : status;

      cy.do([
        orderInformationFields.orderStatus.focus(),
        orderInformationFields.orderStatus.fillIn(value),
      ]);
      cy.expect(orderInformationFields.orderStatus.has({ value }));
    }

    if (overridePoLineLimit !== undefined) {
      const value = useQuates ? `"${overridePoLineLimit}"` : overridePoLineLimit;
      cy.do([
        orderInformationFields.overridePoLineLimit.focus(),
        orderInformationFields.overridePoLineLimit.fillIn(value),
      ]);
      cy.expect(orderInformationFields.overridePoLineLimit.has({ value }));
    }

    if (vendor !== undefined) {
      const value = useQuates ? `"${vendor}"` : vendor;
      cy.do([orderInformationFields.vendor.focus(), orderInformationFields.vendor.fillIn(value)]);
      cy.expect(orderInformationFields.vendor.has({ value }));
    }

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

    if (physicalResourceDetails) {
      this.fillPhysicalResourceDetailsPfofileFields(physicalResourceDetails);
    }

    if (eResourceDetails) {
      this.fillElectronicResourceDetailsPfofileFields(eResourceDetails);
    }
  },
  fillPoLineDetailsProfileFields({ acquisitionMethod, orderFormat, receivingWorkflow }) {
    if (acquisitionMethod) {
      cy.do([
        orderLineInformationFields.acquisitionMethod.focus(),
        orderLineInformationFields.acquisitionMethod.fillIn(`"${acquisitionMethod}"`),
      ]);
      cy.expect(
        orderLineInformationFields.acquisitionMethod.has({ value: `"${acquisitionMethod}"` }),
      );
    }

    if (orderFormat) {
      cy.do([
        orderLineInformationFields.orderFormat.focus(),
        orderLineInformationFields.orderFormat.fillIn(`"${orderFormat}"`),
      ]);
      cy.expect(orderLineInformationFields.orderFormat.has({ value: `"${orderFormat}"` }));
    }

    if (receivingWorkflow) {
      cy.do([
        orderLineInformationFields.receivingWorkflow.focus(),
        orderLineInformationFields.receivingWorkflow.fillIn(`"${receivingWorkflow}"`),
      ]);
      cy.expect(
        orderLineInformationFields.receivingWorkflow.has({ value: `"${receivingWorkflow}"` }),
      );
    }
  },
  fillCostDetailsProfileFields({ physicalUnitPrice, currency }) {
    if (physicalUnitPrice) {
      cy.do([
        orderLineInformationFields.physicalUnitPrice.focus(),
        orderLineInformationFields.physicalUnitPrice.fillIn(`"${physicalUnitPrice}"`),
      ]);
      cy.expect(
        orderLineInformationFields.physicalUnitPrice.has({ value: `"${physicalUnitPrice}"` }),
      );
    }

    if (currency) {
      cy.do([
        orderLineInformationFields.currency.focus(),
        orderLineInformationFields.currency.fillIn(`"${currency}"`),
      ]);
      cy.expect(orderLineInformationFields.currency.has({ value: `"${currency}"` }));
    }
  },
  fillPhysicalResourceDetailsPfofileFields({
    materialSupplier,
    organizationLookUp,
    createInventory,
  }) {
    if (materialSupplier) {
      cy.do([
        orderLineInformationFields.materialSupplier.focus(),
        orderLineInformationFields.materialSupplier.fillIn(`"${materialSupplier}"`),
      ]);
      cy.expect(
        orderLineInformationFields.materialSupplier.has({ value: `"${materialSupplier}"` }),
      );
    }

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

    if (createInventory) {
      cy.do([
        orderLineInformationFields.createInventory.focus(),
        orderLineInformationFields.createInventory.fillIn(`"${createInventory}"`),
      ]);
      cy.expect(orderLineInformationFields.createInventory.has({ value: `"${createInventory}"` }));
    }
  },
  fillElectronicResourceDetailsPfofileFields({ accessProvider, organizationLookUp }) {
    if (accessProvider) {
      cy.do([
        orderLineInformationFields.accessProvider.focus(),
        orderLineInformationFields.accessProvider.fillIn(`"${accessProvider}"`),
      ]);
      cy.expect(orderLineInformationFields.accessProvider.has({ value: `"${accessProvider}"` }));
    }

    if (organizationLookUp) {
      cy.do([
        orderLineInformationFields.accessProvider.focus(),
        orderLineInformationFields.accessProviderLookUp.click(),
      ]);
      FinanceHelper.selectFromLookUpView({ itemName: organizationLookUp });
      cy.expect(
        orderLineInformationFields.accessProvider.has({ value: `"${organizationLookUp}"` }),
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
};
