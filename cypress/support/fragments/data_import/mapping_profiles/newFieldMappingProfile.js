/* eslint-disable cypress/no-unnecessary-waiting */
import {
  TextField,
  Button,
  Select,
  TextArea,
  Modal,
  HTML,
  including,
  MultiColumnListCell,
  MultiColumnListRow,
  SearchField,
  Accordion,
  Checkbox,
  Dropdown,
  DropdownMenu,
  Callout,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  EXISTING_RECORDS_NAMES,
  ACQUISITION_METHOD_NAMES_IN_MAPPING_PROFILES,
} from '../../../constants';

const saveButton = Button('Save as profile & Close');
const searchButton = Button('Search');
const organizationLookUpButton = Button('Organization look-up');
const organizationModal = Modal('Select Organization');
const staffSuppressSelect = Select('Staff suppress');
const suppressFromDiscoverySelect = Select('Suppress from discovery');
const previouslyHeldSelect = Select('Previously held');
const loanAndAvailabilityAccordion = Accordion('Loan and availability');
const orderInformationAccordion = Accordion('Order information');
const locationAccordion = Accordion('Location');
const physicalResourceDetailsAccordion = Accordion('Physical resource details');
const nameField = TextField({ name: 'profile.name' });
const searchField = TextField({ id: 'input-record-search' });
const permanentLocationField = TextField('Permanent');
const catalogedDateField = TextField('Cataloged date');
const titleField = TextField('Title*');
const incomingRecordTypeField = Select({ name: 'profile.incomingRecordType' });
const currencyField = TextField('Currency*');
const noteTypeField = TextField('Note type');
const reEncumberField = TextField('Re-encumber');
const purchaseOrderStatus = TextField('Purchase order status*');
const mustAcknoledgeReceivingNoteField = TextField('Must acknowledge receiving note');
const publicationDateField = TextField('Publication date');
const publisherField = TextField('Publisher');
const editionField = TextField('Edition');
const internalNoteField = TextArea('Internal note');
const acquisitionMethodField = TextField('Acquisition method*');
const orderFormatField = TextField('Order format*');
const receiptStatusField = TextField('Receipt status');
const paymentStatusField = TextField('Payment status');
const selectorField = TextField('Selector');
const rushField = TextField('Rush');
const materialTypeField = TextField('Material type');
const paymentMethodField = TextField('Payment method*');
const batchGroupField = TextField('Batch group*');
const receivingWorkflowField = TextField('Receiving workflow*');
const accountNumberField = TextField('Account number');
const physicalUnitPrice = TextField('Physical unit price');
const cancellationRestrictionField = TextField('Cancellation restriction');
const quantityPhysicalField = TextField('Quantity physical');
const electronicUnitPriceField = TextField('Electronic unit price');
const quantityElectronicField = TextField('Quantity electronic');
const existingRecordType = Select({ name: 'profile.existingRecordType' });
const approvedCheckbox = Checkbox({
  name: 'profile.mappingDetails.mappingFields[1].booleanFieldAction',
});

const incomingRecordType = {
  marcBib: 'MARC Bibliographic',
  edifact: 'EDIFACT invoice',
  marcAuth: 'MARC Authority',
};
const actions = {
  addTheseToExisting: 'Add these to existing',
  deleteAllExistingValues: 'Delete all existing values',
  deleteAllExistingAndAddThese: 'Delete all existing and add these',
  findAndRemoveThese: 'Find and remove these',
};
const actionsFieldMappingsForMarc = {
  modify: 'Modifications',
  update: 'Updates',
};

const permanentLocation = '"Annex (KU/CC/DI/A)"';
const materialType = '"book"';
const permanentLoanType = '"Can circulate"';
const status = '"In process"';
const holdingsType = 'Holdings';
const itemType = 'Item';
const catalogedDate = '###TODAY###';
const defaultMappingProfile = {
  name: `autotest${FOLIO_RECORD_TYPE.INSTANCE}${getRandomPostfix()}`,
  typeValue: FOLIO_RECORD_TYPE.INSTANCE,
  location: permanentLocation,
  material: materialType,
  loan: permanentLoanType,
  statusField: status,
  fillProfile: '',
};

const save = () => {
  // TODO need to wait until profile to be filled
  cy.wait(1000);
  cy.do(saveButton.click());
};
const selectOrganizationByName = (organizationName) => {
  cy.do(organizationLookUpButton.click());
  cy.expect(organizationModal.exists());
  cy.do([
    organizationModal.find(searchField).fillIn(organizationName),
    organizationModal.find(searchButton).click(),
    organizationModal.find(HTML(including('1 record found'))).exists(),
    MultiColumnListCell(organizationName).click({ row: 0, columnIndex: 0 }),
  ]);
  cy.expect(TextField({ value: `"${organizationName}"` }).exists());
};

const waitLoading = () => {
  // wait will be add uuid for acceptedValues
  cy.wait(1000);
};

const selectFromResultsList = (rowNumber = 0) => cy.do(organizationModal.find(MultiColumnListRow({ index: rowNumber })).click());

const addContributor = (profile) => {
  if (profile.contributor) {
    cy.do([
      Button('Add contributor').click(),
      TextField('Contributor').fillIn(profile.contributor),
      TextField('Contributor type').fillIn(`"${profile.contributorType}"`),
    ]);
  }
};

const addProductId = (profile) => {
  if (profile.productId) {
    cy.do([
      Button('Add product ID and product ID type').click(),
      TextField('Product ID').fillIn(profile.productId),
      TextField('Product ID type').fillIn(`"${profile.productIDType}"`),
    ]);
  }
  if (profile.qualifier) {
    cy.do(TextField('Qualifier').fillIn(profile.qualifier));
  }
};

const addVendorReferenceNumber = (profile) => {
  if (profile.vendorReferenceNumber) {
    cy.do([
      Button('Add vendor reference number').click(),
      TextField('Vendor reference number').fillIn(profile.vendorReferenceNumber),
      TextField('Vendor reference type').fillIn(`"${profile.vendorReferenceType}"`),
    ]);
  }
};

const addFundDistriction = (profile) => {
  if (profile.fundId) {
    cy.do([
      Button('Add fund distribution').click(),
      TextField('Fund ID').fillIn(profile.fundId),
      TextField('Expense class').fillIn(profile.expenseClass),
      TextField('Value').fillIn(`"${profile.value}"`),
      Accordion('Fund distribution').find(Button('%')).click(),
    ]);
  }
};

const addLocation = (profile) => {
  if (profile.locationName) {
    cy.do([
      locationAccordion.find(Button('Add location')).click(),
      TextField('Name (code)').fillIn(profile.locationName),
    ]);
  }
  if (profile.locationQuantityElectronic) {
    cy.do(
      locationAccordion.find(quantityElectronicField).fillIn(profile.locationQuantityElectronic),
    );
  }
  if (profile.locationQuantityPhysical) {
    cy.do(locationAccordion.find(quantityPhysicalField).fillIn(profile.locationQuantityPhysical));
  }
};

const addVendor = (profile) => {
  cy.wait(1000);
  cy.do([
    orderInformationAccordion.find(organizationLookUpButton).click(),
    organizationModal.find(searchField).fillIn(profile.vendor),
    organizationModal.find(searchButton).click(),
    organizationModal.find(HTML(including('1 record found'))).exists(),
    MultiColumnListCell(profile.vendor).click({ row: 0, columnIndex: 0 }),
  ]);
};

const addVolume = (profile) => {
  if (profile.volume) {
    cy.do([
      physicalResourceDetailsAccordion.find(Button('Add volume')).click(),
      TextField('Volume').fillIn(profile.volume),
    ]);
  }
};
const fillSummaryInMappingProfile = (specialMappingProfile = defaultMappingProfile) => {
  cy.do([
    nameField.fillIn(specialMappingProfile.name),
    incomingRecordTypeField.choose(incomingRecordType.marcBib),
    existingRecordType.choose(specialMappingProfile.typeValue),
  ]);
};
const getDefaultInstanceMappingProfile = (name) => {
  const defaultInstanceMappingProfile = {
    profile: {
      name,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
    },
  };
  return defaultInstanceMappingProfile;
};
const getDefaultHoldingsMappingProfile = (name, permLocation) => {
  const defaultHoldingsMappingProfile = {
    profile: {
      name,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      mappingDetails: {
        name: 'holdings',
        recordType: 'HOLDINGS',
        mappingFields: [
          {
            name: 'permanentLocationId',
            enabled: true,
            path: 'holdings.permanentLocationId',
            value: `"${permLocation}"`,
          },
        ],
      },
    },
  };
  return defaultHoldingsMappingProfile;
};
const getDefaultItemMappingProfile = (name) => {
  const defaultItemMappingProfile = {
    profile: {
      name,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
      mappingDetails: {
        name: 'item',
        recordType: 'ITEM',
        mappingFields: [
          {
            name: 'materialType.id',
            enabled: true,
            path: 'item.materialType.id',
            value: '"book"',
            acceptedValues: { '1a54b431-2e4f-452d-9cae-9cee66c9a892': 'book' },
          },
          {
            name: 'permanentLoanType.id',
            enabled: true,
            path: 'item.permanentLoanType.id',
            value: '"Can circulate"',
            acceptedValues: { '2b94c631-fca9-4892-a730-03ee529ffe27': 'Can circulate' },
          },
          { name: 'status.name', enabled: true, path: 'item.status.name', value: '"Available"' },
          {
            name: 'permanentLocation.id',
            enabled: 'true',
            path: 'item.permanentLocation.id',
            value: `"${permanentLocation}"`,
            acceptedValues: { 'fcd64ce1-6995-48f0-840e-89ffa2288371': 'Main Library (KU/CC/DI/M)' },
          },
        ],
      },
    },
  };
  return defaultItemMappingProfile;
};
const fillInvoiceLineDescription = (description) => {
  cy.do(Accordion('Invoice line information').find(TextField('Description*')).fillIn(description));
};

export default {
  getDefaultInstanceMappingProfile,
  getDefaultHoldingsMappingProfile,
  getDefaultItemMappingProfile,
  incomingRecordType,
  permanentLocation,
  materialType,
  permanentLoanType,
  statusField: status,
  catalogedDate,
  actions,
  addContributor,
  addProductId,
  addVendorReferenceNumber,
  addFundDistriction,
  addLocation,
  addVendor,
  addVolume,
  selectFromResultsList,
  waitLoading,
  fillSummaryInMappingProfile,
  fillInvoiceLineDescription,
  selectOrganizationByName,
  save,

  fillMappingProfile: (specialMappingProfile = defaultMappingProfile) => {
    fillSummaryInMappingProfile(specialMappingProfile);
    if (specialMappingProfile.typeValue === holdingsType) {
      if (specialMappingProfile.permanentLocation) {
        cy.do(permanentLocationField.fillIn(specialMappingProfile.permanentLocation));
      }

      if (specialMappingProfile.electronicAccess) {
        cy.get('[name="profile.mappingDetails.mappingFields[23].repeatableFieldAction"]').select(
          specialMappingProfile.electronicAccess.action,
        );
        cy.do([
          Button('Add electronic access').click(),
          TextField('Relationship').fillIn(specialMappingProfile.electronicAccess.relationship),
          TextField('URI').fillIn(specialMappingProfile.electronicAccess.uri),
          TextField('Link text').fillIn(specialMappingProfile.electronicAccess.linkText),
        ]);
      }

      if (specialMappingProfile.discoverySuppress) {
        cy.get('[name="profile.mappingDetails.mappingFields[0].booleanFieldAction"]').select(
          specialMappingProfile.discoverySuppress,
        );
      }

      if (specialMappingProfile.callNumberType) {
        cy.do(TextField('Call number type').fillIn(specialMappingProfile.callNumberType));
      }

      if (specialMappingProfile.callNumber) {
        cy.do(TextField('Call number').fillIn(specialMappingProfile.callNumber));
      }
    } else if (specialMappingProfile.typeValue === itemType) {
      cy.intercept('loan-types?*').as('getType');
      cy.do(materialTypeField.fillIn(materialType));
      cy.do(TextField('Permanent loan type').fillIn(permanentLoanType));
      cy.wait('@getType');
      // wait accepted values to be filled
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1800);
      cy.do(TextField('Status').fillIn(status));
    } else if (specialMappingProfile.typeValue === FOLIO_RECORD_TYPE.INSTANCE) {
      if ('update' in specialMappingProfile) {
        cy.do([
          catalogedDateField.fillIn(catalogedDate),
          TextField('Instance status term').fillIn(`"${INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED}"`),
        ]);
        // wait accepted values to be filled
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1800);
      } else {
        cy.do(catalogedDateField.fillIn(catalogedDate));
      }
    }
    save();
  },

  fillMappingProfileForUpdate: (specialMappingProfile = defaultMappingProfile) => {
    fillSummaryInMappingProfile(specialMappingProfile);
    specialMappingProfile.fillProfile();
    save();
    cy.expect(saveButton.absent());
  },

  fillInvoiceMappingProfile: (profile) => {
    // Summary section
    cy.do([
      nameField.fillIn(profile.name),
      incomingRecordTypeField.choose(profile.incomingRecordType),
      existingRecordType.choose(profile.typeValue),
    ]);
    if (profile.description) {
      cy.do(
        Accordion('Summary')
          .find(TextArea({ name: 'profile.description' }))
          .fillIn(profile.description),
      );
    }
    // Invoice information section
    if (profile.batchGroup) {
      cy.do(batchGroupField.fillIn(profile.batchGroup));
    }
    if (profile.lockTotalAmount) {
      cy.do(TextField('Lock total amount').fillIn(profile.lockTotalAmount));
    }
    if (profile.invoiceNote) {
      cy.do(TextArea('Note').fillIn(profile.invoiceNote));
    }
    if (profile.acquisitionsUnits) {
      cy.do(TextField('Acquisitions units').fillIn(profile.acquisitionsUnits));
    }
    // Vendor information section
    if (profile.organizationName) {
      selectOrganizationByName(profile.organizationName);
    }
    // Extended information section
    if (profile.paymentMethod) {
      cy.do(paymentMethodField.fillIn(profile.paymentMethod));
    }
    if (profile.currency) {
      cy.do(currencyField.fillIn(`"${profile.currency}"`));
    }
    // Invoice line information section
    if (profile.invoiceLinePOlDescription) {
      fillInvoiceLineDescription(profile.invoiceLinePOlDescription);
    }
    if (profile.polNumber) {
      cy.do(TextField('PO line number').fillIn(profile.polNumber));
    }
    if (profile.polVendorReferenceNumber) {
      cy.do(TextField('Vendor reference number').fillIn(profile.polVendorReferenceNumber));
    }
    if (profile.subscriptionInfo) {
      cy.do(TextField('Subscription info').fillIn(profile.subscriptionInfo));
    }
    if (profile.subscriptionStartDate) {
      cy.do(TextField('Subscription start date').fillIn(profile.subscriptionStartDate));
    }
    if (profile.subscriptionEndDate) {
      cy.do(TextField('Subscription end date').fillIn(profile.subscriptionEndDate));
    }
    if (profile.comment) {
      cy.do(TextField('Comment').fillIn(profile.comment));
    }
    save();
  },

  fillMappingProfileForMatch: (specialMappingProfile = defaultMappingProfile) => {
    fillSummaryInMappingProfile(specialMappingProfile);
    if (specialMappingProfile.typeValue === holdingsType) {
      cy.do(TextField('Holdings type').fillIn('"Monograph"'));
      // wait accepted values to be filed
      cy.wait(1500);
      cy.do(permanentLocationField.fillIn('980$a'));
      cy.do(TextField('Call number type').fillIn('"Library of Congress classification"'));
      // wait accepted values to be filled
      cy.wait(1500);
      cy.do(TextField('Call number').fillIn('980$b " " 980$c'));
    } else if (specialMappingProfile.typeValue === itemType) {
      cy.do(TextField('Barcode').fillIn('981$b'));
      cy.do(TextField('Copy number').fillIn('981$b'));
      cy.do(TextField('Status').fillIn(status));
    } else if (specialMappingProfile.typeValue === FOLIO_RECORD_TYPE.INSTANCE) {
      if ('update' in specialMappingProfile) {
        cy.do([
          catalogedDateField.fillIn(catalogedDate),
          TextField('Instance status term').fillIn(`"${INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED}"`),
        ]);
        // wait accepted values to be filled
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1800);
      }
    }
    save();
  },

  fillOrderMappingProfile: (profile) => {
    // Summary section
    fillSummaryInMappingProfile(profile);
    // Order information section
    cy.do([
      purchaseOrderStatus.fillIn(`"${profile.orderStatus}"`),
      orderInformationAccordion.find(approvedCheckbox).click(),
    ]);
    addVendor(profile);
    if (profile.reEncumber) {
      cy.do(reEncumberField.fillIn(`"${profile.reEncumber}"`));
    }
    if (profile.acquisitionsUnits) {
      cy.do(TextField('Acquisitions units').fillIn(`"${profile.acquisitionsUnits}"`));
    }
    // Order line information
    cy.do(titleField.fillIn(profile.title));
    if (profile.mustAcknowledgeReceivingNote) {
      cy.do(mustAcknoledgeReceivingNoteField.fillIn(`"${profile.mustAcknowledgeReceivingNote}"`));
    }
    if (profile.publicationDate) {
      cy.do([
        publicationDateField.fillIn(profile.publicationDate),
        publisherField.fillIn(profile.publisher),
      ]);
    }
    if (profile.edition) {
      cy.do(editionField.fillIn(profile.edition));
    }
    addContributor(profile);
    addProductId(profile);
    if (profile.internalNote) {
      cy.do(internalNoteField.fillIn(profile.internalNote));
    }
    cy.do([
      acquisitionMethodField.fillIn(`"${profile.acquisitionMethod}"`),
      orderFormatField.fillIn(`"${profile.orderFormat}"`),
    ]);
    if (profile.receiptStatus) {
      cy.do(receiptStatusField.fillIn(`"${profile.receiptStatus}"`));
    }
    if (profile.paymentStatus) {
      cy.do(paymentStatusField.fillIn(`"${profile.paymentStatus}"`));
    }
    if (profile.selector) {
      cy.do(selectorField.fillIn(profile.selector));
    }
    if (profile.cancellationRestriction) {
      cy.do(cancellationRestrictionField.fillIn(`"${profile.cancellationRestriction}"`));
    }
    if (profile.rush) {
      cy.do(rushField.fillIn(profile.rush));
    }
    cy.do(receivingWorkflowField.fillIn(`"${profile.receivingWorkflow}"`));
    addVendorReferenceNumber(profile);
    if (profile.instructionsToVendor) {
      cy.do(TextArea('Instructions to vendor').fillIn(profile.instructionsToVendor));
    }
    if (profile.accountNumber) {
      cy.do(accountNumberField.fillIn(profile.accountNumber));
    }
    if (profile.physicalUnitPrice) {
      cy.do([
        physicalUnitPrice.fillIn(profile.physicalUnitPrice),
        quantityPhysicalField.fillIn(profile.quantityPhysical),
      ]);
    }
    cy.do(currencyField.fillIn(`"${profile.currency}"`));
    if (profile.quantityElectronic) {
      cy.do(quantityElectronicField.fillIn(profile.quantityElectronic));
    }
    if (profile.electronicUnitPrice) {
      cy.do(electronicUnitPriceField.fillIn(profile.electronicUnitPrice));
    }
    addFundDistriction(profile);
    addLocation(profile);
    if (profile.materialSupplier) {
      cy.do([
        physicalResourceDetailsAccordion.find(organizationLookUpButton).click(),
        organizationModal.find(searchField).fillIn(profile.materialSupplier),
        organizationModal.find(searchButton).click(),
        organizationModal.find(HTML(including('1 record found'))).exists(),
        MultiColumnListCell(profile.vendor).click({ row: 0, columnIndex: 0 }),
      ]);
    }
    if (profile.createInventory) {
      cy.do(
        physicalResourceDetailsAccordion
          .find(TextField('Create inventory'))
          .fillIn(`"${profile.createInventory}"`),
      );
    }
    if (profile.materialType) {
      cy.do(
        physicalResourceDetailsAccordion
          .find(materialTypeField)
          .fillIn(`"${profile.materialType}"`),
      );
    }
    addVolume(profile);
    if (profile.accessProvider) {
      cy.do(TextField('Access provider').fillIn(`"${profile.accessProvider}"`));
    }
    waitLoading();
  },

  addName: (name) => cy.do(nameField.fillIn(name)),
  addIncomingRecordType: (type) => cy.do(incomingRecordTypeField.choose(type)),
  addFolioRecordType: (folioType) => cy.do(existingRecordType.choose(folioType)),
  fillTemporaryLocation: (location) => cy.do(TextField('Temporary').fillIn(location)),
  fillDigitizationPolicy: (policy) => cy.do(TextField('Digitization policy').fillIn(policy)),
  fillCallNumber: (number) => cy.do(TextField('Call number').fillIn(number)),
  fillNumberOfPieces: (number) => cy.do(TextField('Number of pieces').fillIn(number)),
  fillBarcode: (barcode) => cy.do(TextField('Barcode').fillIn(barcode)),
  fillItemIdentifier: (identifier) => cy.do(TextField('Item identifier').fillIn(identifier)),
  fillAccessionNumber: (number) => cy.do(TextField('Accession number').fillIn(number)),
  fillCopyNumber: (number) => cy.do(TextField('Copy number').fillIn(number)),
  fillVendorInvoiceNumber: (number) => cy.do(TextField('Vendor invoice number*').fillIn(number)),
  fillDescription: (text) => {
    cy.do(
      Accordion('Summary')
        .find(TextArea({ name: 'profile.description' }))
        .fillIn(text),
    );
  },
  fillQuantity: (quantity) => cy.do(TextField('Quantity*').fillIn(quantity)),
  fillSubTotal: (number) => cy.do(TextField('Sub-total*').fillIn(number)),

  fillMappingProfileForUpdatesMarc: (specialMappingProfile = defaultMappingProfile) => {
    fillSummaryInMappingProfile(specialMappingProfile);
    cy.do(
      Select({ name: 'profile.mappingDetails.marcMappingOption' }).choose(
        actionsFieldMappingsForMarc.update,
      ),
    );
  },

  fillMappingProfileForUpdatesMarcAuthority: (specialMappingProfile = defaultMappingProfile) => {
    fillSummaryInMappingProfile(specialMappingProfile);
    cy.do(
      Select({ name: 'profile.mappingDetails.marcMappingOption' }).choose(
        actionsFieldMappingsForMarc.update,
      ),
    );
  },

  selectActionForStatisticalCode(number, action = actions.addTheseToExisting) {
    // number needs for using this method in filling fields for holdings and item profiles
    const statisticalCodeFieldName = `profile.mappingDetails.mappingFields[${number}].repeatableFieldAction`;

    cy.do([
      Select({ name: statisticalCodeFieldName }).focus(),
      Select({ name: statisticalCodeFieldName }).choose(action),
    ]);
  },

  addStatisticalCode(name, number, action) {
    this.selectActionForStatisticalCode(number, action);
    cy.do([
      Button('Add statistical code').click(),
      TextField('Statistical code').fillIn(`"${name}"`),
    ]);
    waitLoading();
  },

  addStatisticalCodeWithSeveralCodes(firstCode, secondCode, number, action) {
    this.selectActionForStatisticalCode(number, action);
    cy.do([
      Button('Add statistical code').click(),
      TextField({
        name: `profile.mappingDetails.mappingFields[${number}].subfields.0.fields.0.value`,
      }).fillIn(`"${firstCode}"`),
      Button('Add statistical code').click(),
      TextField({
        name: `profile.mappingDetails.mappingFields[${number}].subfields.1.fields.0.value`,
      }).fillIn(`"${secondCode}"`),
    ]);
  },

  addAdministrativeNote: (note, number, action = actions.addTheseToExisting) => {
    // number needs for using this method in filling fields for holdings and item profiles
    const adminNoteFieldName = `profile.mappingDetails.mappingFields[${number}].repeatableFieldAction`;

    cy.do([
      Select({ name: adminNoteFieldName }).focus(),
      Select({ name: adminNoteFieldName }).choose(action),
      Button('Add administrative note').click(),
      TextField('Administrative note').fillIn(`"${note}"`),
    ]);
  },

  addElectronicAccess: (
    relationship,
    uri,
    linkText = '',
    materialsSpecified = '',
    urlPublicNote = '',
  ) => {
    cy.do([
      Select({ name: 'profile.mappingDetails.mappingFields[23].repeatableFieldAction' }).focus(),
      Select({ name: 'profile.mappingDetails.mappingFields[23].repeatableFieldAction' }).choose(
        actions.addTheseToExisting,
      ),
      Button('Add electronic access').click(),
      TextField('Relationship').fillIn(relationship),
      TextField('URI').fillIn(uri),
      TextField('Link text').fillIn(linkText),
      TextField('Materials specified').fillIn(materialsSpecified),
      TextField('URL public note').fillIn(urlPublicNote),
    ]);
    waitLoading();
  },

  addHoldingsStatements: (statement, action = actions.addTheseToExisting) => {
    cy.do([
      Select({ name: 'profile.mappingDetails.mappingFields[16].repeatableFieldAction' }).focus(),
      Select({ name: 'profile.mappingDetails.mappingFields[16].repeatableFieldAction' }).choose(
        action,
      ),
      Button('Add holdings statement').click(),
      TextField('Holdings statement').fillIn(`"${statement}"`),
      TextField('Statement public note').fillIn(`"${statement}"`),
    ]);
  },

  addSuppressFromDiscovery: (suppressFromDiscavery = 'Mark for all affected records') => {
    cy.do([
      suppressFromDiscoverySelect.focus(),
      suppressFromDiscoverySelect.choose(suppressFromDiscavery),
    ]);
    waitLoading();
  },

  addStaffSuppress: (staffSuppress) => {
    cy.do([staffSuppressSelect.focus(), staffSuppressSelect.choose(staffSuppress)]);
  },

  addPreviouslyHeld: (previouslyHeld) => {
    cy.do([previouslyHeldSelect.focus(), previouslyHeldSelect.choose(previouslyHeld)]);
  },

  addNatureOfContentTerms: (value) => {
    const contentTerms = 'profile.mappingDetails.mappingFields[22].repeatableFieldAction';

    cy.do([
      Select({ name: contentTerms }).focus(),
      Select({ name: contentTerms }).choose(actions.addTheseToExisting),
      Button('Add nature of content term').click(),
      TextField('Nature of content term').fillIn(`"${value}"`),
    ]);
    waitLoading();
  },

  fillPermanentLocation: (location) => {
    cy.do(permanentLocationField.fillIn(location));
    waitLoading();
  },

  fillCatalogedDate: (date = catalogedDate) => {
    cy.do(catalogedDateField.fillIn(date));
    waitLoading();
  },

  fillInstanceStatusTerm: (statusTerm = INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED) => {
    cy.do(TextField('Instance status term').fillIn(`"${statusTerm}"`));
    waitLoading();
  },

  fillHoldingsType: (type) => {
    cy.do(TextField('Holdings type').fillIn(`"${type}"`));
    waitLoading();
  },

  fillCallNumberType: (type) => {
    cy.do(TextField('Call number type').fillIn(type));
    waitLoading();
  },

  fillCallNumberPrefix: (prefix) => {
    cy.do(TextField('Call number prefix').fillIn(prefix));
  },

  fillcallNumberSuffix: (prefix) => {
    cy.do(TextField('Call number suffix').fillIn(prefix));
  },

  fillStatus: (itemStatus) => {
    cy.do(TextField('Status').fillIn(`"${itemStatus}"`));
    waitLoading();
  },

  fillPermanentLoanType: (loanType) => {
    cy.do(TextField('Permanent loan type').fillIn(`"${loanType}"`));
    waitLoading();
  },

  fillTemporaryLoanType: (loanType) => {
    cy.do(TextField('Temporary loan type').fillIn(loanType));
    waitLoading();
  },

  fillMaterialType: (type) => {
    cy.do(materialTypeField.fillIn(type));
    waitLoading();
  },

  fillIllPolicy: (policy) => {
    cy.do(TextField('ILL policy').fillIn(`"${policy}"`));
    waitLoading();
  },

  addHoldingsNotes: (type, note, staffOnly) => {
    const holdingsNotesFieldName = 'profile.mappingDetails.mappingFields[22].repeatableFieldAction';
    const selectName =
      'profile.mappingDetails.mappingFields[22].subfields[0].fields[2].booleanFieldAction';

    cy.do([
      Select({ name: holdingsNotesFieldName }).focus(),
      Select({ name: holdingsNotesFieldName }).choose(actions.addTheseToExisting),
      Button('Add holdings note').click(),
      noteTypeField.fillIn(type),
      TextField('Note').fillIn(`"${note}"`),
      Select({ name: selectName }).focus(),
      Select({ name: selectName }).choose(staffOnly),
    ]);
    waitLoading();
  },

  fillBatchGroup: (group) => {
    cy.do(batchGroupField.fillIn(group));
    waitLoading();
  },

  fillPaymentMethod: (method) => {
    cy.do(paymentMethodField.fillIn(method));
    waitLoading();
  },

  addItemNotes: (noteType, note, staffOnly) => {
    const noteFieldName = 'profile.mappingDetails.mappingFields[25].repeatableFieldAction';
    const selectName =
      'profile.mappingDetails.mappingFields[25].subfields[0].fields[2].booleanFieldAction';

    cy.do([
      Select({ name: noteFieldName }).focus(),
      Select({ name: noteFieldName }).choose(actions.addTheseToExisting),
      Button('Add item note').click(),
      noteTypeField.fillIn(noteType),
      TextField('Note').fillIn(note),
      Select({ name: selectName }).focus(),
      Select({ name: selectName }).choose(staffOnly),
    ]);
    waitLoading();
  },

  addCheckInCheckOutNote: (noteType, note, staffOnly) => {
    const noteFieldName = 'profile.mappingDetails.mappingFields[29].repeatableFieldAction';
    const selectName =
      'profile.mappingDetails.mappingFields[29].subfields[0].fields[2].booleanFieldAction';

    cy.do([
      Select({ name: noteFieldName }).focus(),
      Select({ name: noteFieldName }).choose(actions.addTheseToExisting),
      Button('Add check in / check out note').click(),
      loanAndAvailabilityAccordion.find(noteTypeField).fillIn(noteType),
      loanAndAvailabilityAccordion.find(TextField('Note')).fillIn(note),
      Select({ name: selectName }).focus(),
      Select({ name: selectName }).choose(staffOnly),
    ]);
    waitLoading();
  },

  fillCurrency: (currency) => {
    cy.do(currencyField.fillIn(currency));
    waitLoading();
  },

  fillVendorName: (vendorName) => {
    cy.do([
      organizationLookUpButton.click(),
      SearchField({ id: 'input-record-search' }).fillIn(vendorName),
      searchButton.click(),
    ]);
    selectFromResultsList();
  },

  fillInvoiceDate: (date) => {
    cy.do(TextField('Invoice date*').fillIn(date));
    waitLoading();
  },

  addFieldMappingsForMarc: () => {
    cy.do(
      Select({ name: 'profile.mappingDetails.marcMappingOption' }).choose(
        actionsFieldMappingsForMarc.modify,
      ),
    );
  },

  fillModificationSectionWithAdd: ({
    action,
    field,
    ind1,
    ind2,
    subfield,
    data,
    subaction,
    subfieldInd1,
    subfieldData,
  }) => {
    cy.do([
      Select({ name: 'profile.mappingDetails.marcMappingDetails[0].action' }).choose(action),
      TextField({ name: 'profile.mappingDetails.marcMappingDetails[0].field.field' }).fillIn(field),
      TextField({ name: 'profile.mappingDetails.marcMappingDetails[0].field.indicator1' }).fillIn(
        ind1,
      ),
      TextField({ name: 'profile.mappingDetails.marcMappingDetails[0].field.indicator2' }).fillIn(
        ind2,
      ),
      TextField({
        name: 'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subfield',
      }).fillIn(subfield),
      TextArea({
        name: 'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].data.text',
      }).fillIn(data),
    ]);
    // TODO need to wait until row will be filled
    cy.wait(2000);
    if (subaction) {
      cy.do([
        Select({
          name: 'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subaction',
        }).choose(subaction),
        TextField({
          name: 'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].subfield',
        }).fillIn(subfieldInd1),
        TextArea({
          name: 'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].data.text',
        }).fillIn(subfieldData),
      ]);
    }
  },

  fillModificationSectionWithDelete: (action, fieldNumber, number) => {
    cy.do(
      Select({ name: `profile.mappingDetails.marcMappingDetails[${number}].action` }).choose(
        action,
      ),
    );
    cy.do(
      TextField({
        name: `profile.mappingDetails.marcMappingDetails[${number}].field.field`,
      }).fillIn(fieldNumber),
    );
    cy.expect(
      TextField({ name: `profile.mappingDetails.marcMappingDetails[${number}].field.field` }).has({
        value: fieldNumber,
      }),
    );
    cy.wait(1500);
  },

  addNewFieldInModificationSection: () => {
    cy.get('div[class^="tableRow-"]')
      .last()
      .then((elem) => {
        elem[0].querySelector('button[icon="plus-sign"]').click();
      });
  },

  addFormerHoldings: (name, action = actions.addTheseToExisting) => {
    // number needs for using this method in filling fields for holdings and item profiles
    const formerHoldingsFieldName = 'profile.mappingDetails.mappingFields[2].repeatableFieldAction';

    cy.do([
      Select({ name: formerHoldingsFieldName }).focus(),
      Select({ name: formerHoldingsFieldName }).choose(action),
      Button('Add former holdings identifier').click(),
      TextField('Former holdings ID').fillIn(`"${name}"`),
    ]);
    waitLoading();
  },

  addExpenceClass: (fundDistributionSource) => {
    cy.do([
      Select({
        name: 'profile.mappingDetails.mappingFields[26].subfields.0.fields.14.value',
      }).focus(),
      Select({
        name: 'profile.mappingDetails.mappingFields[26].subfields.0.fields.14.value',
      }).choose(fundDistributionSource),
    ]);
    cy.expect(
      Select({ name: 'profile.mappingDetails.mappingFields[26].subfields.0.fields.14.value' }).has({
        error: 'One or more values must be added before the profile can be saved.',
      }),
    );
    cy.do(Button('Add fund distribution').click());
    cy.wait(3000);
    cy.get('#invoice-line-fund-distribution [class*=repeatableFieldItem]')
      .find('button:contains("Accepted values"):last')
      .click();
  },

  verifyExpenseClassesIsPresentedInDropdown: (value) => {
    cy.expect(DropdownMenu({ visible: true }).find(HTML(value)).exists());
  },

  markFieldForProtection: (field) => {
    cy.get('div[class^="mclRow--"]')
      .contains('div[class^="mclCell-"]', field)
      .then((elem) => {
        elem.parent()[0].querySelector('input[type="checkbox"]').click();
      });
    // TODO wait until checkbox will be marked
    cy.wait(2000);
  },

  createMappingProfileViaApi: (nameProfile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: nameProfile,
            incomingRecordType: 'MARC_BIBLIOGRAPHIC',
            existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          },
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createMappingProfileViaApiMarc: (name, incomRecordType, folioRecordType) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name,
            incomRecordType,
            existingRecordType: folioRecordType,
            mappingDetails: {
              marcMappingOption: 'UPDATE',
              name: 'marcAuthority',
              recordType: 'MARC_AUTHORITY',
            },
          },
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  acquisitionMethodsDropdownListIsVisible: () => {
    const acquisitionMethodSection = HTML({
      className: including('col-'),
      text: including('Acquisition method'),
    });
    cy.do(acquisitionMethodSection.find(Dropdown()).open());
    Object.values(ACQUISITION_METHOD_NAMES_IN_MAPPING_PROFILES).forEach((method) => {
      cy.expect(DropdownMenu().find(Button(method)).exists());
    });
  },

  checkErrorMessageIsPresented: (textFieldName) => {
    const fieldName = TextField(textFieldName);

    cy.do(fieldName.click());
    cy.expect(fieldName.has({ error: 'Please enter a value' }));
  },

  checkCalloutMessage: (message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
  },
};
