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
  Checkbox
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import { FOLIO_RECORD_TYPE, INSTANCE_STATUS_TERM_NAMES, EXISTING_RECORDS_NAMES } from '../../../constants';

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
const nameField = TextField({ name:'profile.name' });
const searchField = TextField({ id: 'input-record-search' });
const permanentLocationField = TextField('Permanent');
const catalogedDateField = TextField('Cataloged date');
const titleField = TextField('Title*');
const incomingRecordTypeField = Select({ name:'profile.incomingRecordType' });
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
const existingRecordType = Select({ name:'profile.existingRecordType' });
const approvedCheckbox = Checkbox({ name:'profile.mappingDetails.mappingFields[1].booleanFieldAction' });

const incomingRecordType = {
  marcBib: 'MARC Bibliographic',
  edifact: 'EDIFACT invoice',
};
const organization = {
  gobiLibrary: 'GOBI Library Solutions',
  harrassowitz: 'Otto Harrassowitz GmbH & Co. KG',
  ebsco:'EBSCO SUBSCRIPTION SERVICES'
};
const actions = {
  addTheseToExisting: 'Add these to existing',
  deleteAllExistingValues: 'Delete all existing values',
  deleteAllExistingAndAddThese: 'Delete all existing and add these',
  findAndRemoveThese: 'Find and remove these'
};
const actionsFieldMappingsForMarc = {
  modify: 'Modifications',
  update: 'Updates'
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
  fillProfile:''
};

const selectOrganizationByName = (organizationName) => {
  cy.do([
    organizationModal.find(searchField).fillIn(organizationName),
    organizationModal.find(searchButton).click(),
    organizationModal.find(HTML(including('1 record found'))).exists(),
    MultiColumnListCell(organizationName).click({ row: 0, columnIndex: 0 }),
  ]);
};

const waitLoading = () => {
  // wait will be add uuid for acceptedValues
  cy.wait(1000);
};

const selectFromResultsList = (rowNumber = 0) => cy.do(organizationModal.find(MultiColumnListRow({ index: rowNumber })).click());

const addContributor = (profile) => {
  cy.do([Button('Add contributor').click(),
    TextField('Contributor').fillIn(profile.contributor),
    TextField('Contributor type').fillIn(`"${profile.contributorType}"`)
  ]);
};

const addProductId = (profile) => {
  cy.do([Button('Add product ID and product ID type').click(),
    TextField('Product ID').fillIn(profile.productId),
    TextField('Qualifier').fillIn(profile.qualifier),
    TextField('Product ID type').fillIn(`"${profile.productIDType}"`)
  ]);
};

const addVendorReferenceNumber = (profile) => {
  cy.do([Button('Add vendor reference number').click(),
    TextField('Vendor reference number').fillIn(profile.vendorReferenceNumber),
    TextField('Vendor reference type').fillIn(`"${profile.vendorReferenceType}"`)
  ]);
};

const addFundDistriction = (profile) => {
  cy.do([Button('Add fund distribution').click(),
    TextField('Fund ID').fillIn(profile.fundId),
    TextField('Expense class').fillIn(profile.expenseClass),
    TextField('Value').fillIn(`"${profile.value}"`),
    Accordion('Fund distribution').find(Button('%')).click()
  ]);
};

const addLocation = (profile) => {
  cy.do([
    locationAccordion.find(Button('Add location')).click(),
    TextField('Name (code)').fillIn(profile.locationName)
  ]);
  if(profile.locationQuantityElectronic){
    cy.do(locationAccordion.find(quantityElectronicField).fillIn(profile.locationQuantityElectronic));
  }
  if(profile.locationQuantityPhysical){
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
    MultiColumnListCell(profile.vendor).click({ row: 0, columnIndex: 0 })
  ]);
};

const addVolume = (profile) => {
  cy.do([
    physicalResourceDetailsAccordion.find(Button('Add volume')).click(),
    TextField('Volume').fillIn(profile.volume)
  ]);
};

const getDefaultInstanceMappingProfile = (name) => {
  const defaultInstanceMappingProfile = {
    profile: {
      name,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
    }
  };
  return defaultInstanceMappingProfile;
};
const getDefaultHoldingsMappingProfile = (name, permLocation) => {
  const defaultHoldingsMappingProfile = {
    profile: {
      name,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      mappingDetails: { name: 'holdings',
        recordType: 'HOLDINGS',
        mappingFields: [
          { name: 'permanentLocationId',
            enabled: true,
            path: 'holdings.permanentLocationId',
            value: `"${permLocation}"` }] }
    }
  };
  return defaultHoldingsMappingProfile;
};
const getDefaultItemMappingProfile = (name) => {
  const defaultItemMappingProfile = {
    profile: {
      name,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
      mappingDetails: { name: 'item',
        recordType: 'ITEM',
        mappingFields: [
          { name: 'materialType.id',
            enabled: true,
            path: 'item.materialType.id',
            value: '"book"',
            acceptedValues: { '1a54b431-2e4f-452d-9cae-9cee66c9a892': 'book' } },
          { name: 'permanentLoanType.id',
            enabled: true,
            path: 'item.permanentLoanType.id',
            value: '"Can circulate"',
            acceptedValues: { '2b94c631-fca9-4892-a730-03ee529ffe27': 'Can circulate' } },
          { name: 'status.name',
            enabled: true,
            path: 'item.status.name',
            value: '"Available"' },
          { name: 'permanentLocation.id',
            enabled: 'true',
            path: 'item.permanentLocation.id',
            value: `"${permanentLocation}"`,
            acceptedValues: { 'fcd64ce1-6995-48f0-840e-89ffa2288371' : 'Main Library (KU/CC/DI/M)' } }] }
    }
  };
  return defaultItemMappingProfile;
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
  organization,
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

  fillMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      nameField.fillIn(specialMappingProfile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === holdingsType) {
      if (specialMappingProfile.permanentLocation) {
        cy.do(permanentLocationField.fillIn(specialMappingProfile.permanentLocation));
      }

      if (specialMappingProfile.electronicAccess) {
        cy.get('[name="profile.mappingDetails.mappingFields[23].repeatableFieldAction"]')
          .select(specialMappingProfile.electronicAccess.action);
        cy.do([
          Button('Add electronic access').click(),
          TextField('Relationship').fillIn(specialMappingProfile.electronicAccess.relationship),
          TextField('URI').fillIn(specialMappingProfile.electronicAccess.uri),
          TextField('Link text').fillIn(specialMappingProfile.electronicAccess.linkText),
        ]);
      }

      if (specialMappingProfile.discoverySuppress) {
        cy.get('[name="profile.mappingDetails.mappingFields[0].booleanFieldAction"]')
          .select(specialMappingProfile.discoverySuppress);
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
    cy.do(saveButton.click());
  },

  fillMappingProfileForUpdate:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      nameField.fillIn(specialMappingProfile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(specialMappingProfile.typeValue)
    ]);
    specialMappingProfile.fillProfile();
    cy.do(saveButton.click());
    cy.expect(saveButton.absent());
  },

  fillMappingProfileForInvoice:(profile) => {
    cy.do([
      nameField.fillIn(profile.name),
      incomingRecordTypeField.choose(profile.incomingRecordType),
      existingRecordType.choose(profile.existingRecordType),
      TextArea({ name:'profile.description' }).fillIn(''),
      batchGroupField.fillIn(profile.batchGroup),
      organizationLookUpButton.click()
    ]);
    selectOrganizationByName(profile.organizationName);
    cy.do([
      paymentMethodField.fillIn(profile.paymentMethod),
      saveButton.click(),
    ]);
  },

  fillMappingProfileForMatch:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      nameField.fillIn(specialMappingProfile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === holdingsType) {
      cy.do(TextField('Holdings type').fillIn('"Monograph"'));
      // wait accepted values to be filled
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
    cy.do(saveButton.click());
  },

  fillPEMixOrderMappingProfile:(profile) => {
    cy.do([
      nameField.fillIn(profile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(profile.typeValue),
      purchaseOrderStatus.fillIn(`"${profile.orderStatus}"`),
      orderInformationAccordion.find(approvedCheckbox).click()
    ]);
    addVendor(profile);
    cy.do([
      titleField.fillIn(profile.title),
      acquisitionMethodField.fillIn(`"${profile.acquisitionMethod}"`),
      orderFormatField.fillIn(`"${profile.orderFormat}"`),
      receivingWorkflowField.fillIn(`"${profile.receivingWorkflow}"`),
      physicalUnitPrice.fillIn(`"${profile.physicalUnitPrice}"`),
      quantityPhysicalField.fillIn(`"${profile.quantityPhysical}"`),
      currencyField.fillIn(`"${profile.currency}"`),
      electronicUnitPriceField.fillIn(`"${profile.electronicUnitPrice}"`),
      quantityElectronicField.fillIn(`"${profile.quantityElectronic}"`),
      locationAccordion.find(Button('Add location')).click(),
      TextField('Name (code)').fillIn(`"${profile.locationName}"`),
      locationAccordion.find(quantityPhysicalField).fillIn(`"${profile.locationQuantityPhysical}"`),
      locationAccordion.find(quantityElectronicField).fillIn(`"${profile.locationQuantityElectronic}"`)
    ]);
  },

  fillElectronicOrderMappingProfile:(profile) => {
    waitLoading();
    cy.do([
      nameField.fillIn(profile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(profile.typeValue),
      purchaseOrderStatus.fillIn(`"${profile.orderStatus}"`),
      orderInformationAccordion.find(approvedCheckbox).click()
    ]);
    addVendor(profile);
    cy.do([
      reEncumberField.fillIn(`"${profile.reEncumber}"`),
      titleField.fillIn(profile.title),
      mustAcknoledgeReceivingNoteField.fillIn(`"${profile.mustAcknowledgeReceivingNote}"`),
      publicationDateField.fillIn(profile.publicationDate),
      publisherField.fillIn(profile.publisher),
      editionField.fillIn(profile.edition),
      internalNoteField.fillIn(profile.internalNote),
      acquisitionMethodField.fillIn(`"${profile.acquisitionMethod}"`),
      orderFormatField.fillIn(`"${profile.orderFormat}"`),
      receiptStatusField.fillIn(`"${profile.receiptStatus}"`),
      paymentStatusField.fillIn(`"${profile.paymentStatus}"`),
      selectorField.fillIn(profile.selector),
      cancellationRestrictionField.fillIn(`"${profile.cancellationRestriction}"`),
      rushField.fillIn(profile.rush),
      receivingWorkflowField.fillIn(`"${profile.receivingWorkflow}"`),
      accountNumberField.fillIn(profile.accountNumber),
      TextArea('Instructions to vendor').fillIn(profile.instructionsToVendor),
      electronicUnitPriceField.fillIn(profile.electronicUnitPrice),
      quantityElectronicField.fillIn(profile.quantityElectronic),
      currencyField.fillIn(`"${profile.currency}"`),
      TextField('Access provider').fillIn(`"${profile.accessProvider}"`)
    ]);
    addContributor(profile);
    addProductId(profile);
    addVendorReferenceNumber(profile);
    addFundDistriction(profile);
    addLocation(profile);
    waitLoading();
  },

  fillPhysicalOrderMappingProfile:(profile) => {
    cy.do([
      nameField.fillIn(profile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(profile.typeValue),
      purchaseOrderStatus.fillIn(`"${profile.orderStatus}"`),
      orderInformationAccordion.find(approvedCheckbox).click()
    ]);
    addVendor(profile);
    cy.do([
      reEncumberField.fillIn(`"${profile.reEncumber}"`),
      titleField.fillIn(profile.title),
      mustAcknoledgeReceivingNoteField.fillIn(`"${profile.mustAcknowledgeReceivingNote}"`),
      publicationDateField.fillIn(profile.publicationDate),
      publisherField.fillIn(profile.publisher),
      editionField.fillIn(profile.edition),
      internalNoteField.fillIn(profile.internalNote),
      acquisitionMethodField.fillIn(`"${profile.acquisitionMethod}"`),
      orderFormatField.fillIn(`"${profile.orderFormat}"`),
      receiptStatusField.fillIn(`"${profile.receiptStatus}"`),
      paymentStatusField.fillIn(`"${profile.paymentStatus}"`),
      selectorField.fillIn(profile.selector),
      cancellationRestrictionField.fillIn(`"${profile.cancellationRestriction}"`),
      rushField.fillIn(profile.rush),
      receivingWorkflowField.fillIn(`"${profile.receivingWorkflow}"`),
      accountNumberField.fillIn(profile.accountNumber),
      physicalUnitPrice.fillIn(profile.physicalUnitPrice),
      quantityPhysicalField.fillIn(profile.quantityPhysical),
      currencyField.fillIn(`"${profile.currency}"`),
      physicalResourceDetailsAccordion.find(organizationLookUpButton).click(),
      organizationModal.find(searchField).fillIn(profile.materialSupplier),
      organizationModal.find(searchButton).click(),
      organizationModal.find(HTML(including('1 record found'))).exists(),
      MultiColumnListCell(profile.vendor).click({ row: 0, columnIndex: 0 }),
      physicalResourceDetailsAccordion.find(TextField('Create inventory')).fillIn(`"${profile.createInventory}"`),
      physicalResourceDetailsAccordion.find(materialTypeField).fillIn(`"${profile.materialType}"`)
    ]);
    addContributor(profile);
    addProductId(profile);
    addVendorReferenceNumber(profile);
    addFundDistriction(profile);
    addLocation(profile);
    addVolume(profile);
    waitLoading();
  },

  addName:(name) => cy.do(TextField({ name:'profile.name' }).fillIn(name)),
  addIncomingRecordType:(type) => cy.do(Select({ name:'profile.incomingRecordType' }).choose(type)),
  addFolioRecordType:(folioType) => cy.do(Select({ name:'profile.existingRecordType' }).choose(folioType)),
  saveProfile:() => cy.do(saveButton.click()),
  fillTemporaryLocation:(location) => cy.do(TextField('Temporary').fillIn(location)),
  fillDigitizationPolicy:(policy) => cy.do(TextField('Digitization policy').fillIn(policy)),
  fillCallNumber:(number) => cy.do(TextField('Call number').fillIn(number)),
  fillNumberOfPieces:(number) => cy.do(TextField('Number of pieces').fillIn(number)),
  fillBarcode:(barcode) => cy.do(TextField('Barcode').fillIn(barcode)),
  fillItemIdentifier:(identifier) => cy.do(TextField('Item identifier').fillIn(identifier)),
  fillAccessionNumber:(number) => cy.do(TextField('Accession number').fillIn(number)),
  fillCopyNumber:(number) => cy.do(TextField('Copy number').fillIn(number)),
  fillVendorInvoiceNumber:(number) => cy.do(TextField('Vendor invoice number*').fillIn(number)),
  fillDescription:(text) => cy.do(TextField('Description*').fillIn(text)),
  fillQuantity:(quantity) => cy.do(TextField('Quantity*').fillIn(quantity)),
  fillSubTotal:(number) => cy.do(TextField('Sub-total*').fillIn(number)),

  fillMappingProfileForUpdatesMarc:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      nameField.fillIn(specialMappingProfile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(specialMappingProfile.typeValue),
      Select({ name:'profile.mappingDetails.marcMappingOption' }).choose(actionsFieldMappingsForMarc.update)
    ]);
  },

  fillSummaryInMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      nameField.fillIn(specialMappingProfile.name),
      incomingRecordTypeField.choose(incomingRecordType.marcBib),
      existingRecordType.choose(specialMappingProfile.typeValue)
    ]);
  },

  addStatisticalCode:(name, number, action = actions.addTheseToExisting) => {
    // number needs for using this method in filling fields for holdings and item profiles
    const statisticalCodeFieldName = `profile.mappingDetails.mappingFields[${number}].repeatableFieldAction`;

    cy.do([
      Select({ name: statisticalCodeFieldName }).focus(),
      Select({ name: statisticalCodeFieldName }).choose(action),
      Button('Add statistical code').click(),
      TextField('Statistical code').fillIn(`"${name}"`)
    ]);
    waitLoading();
  },

  addAdministrativeNote:(note, number, action = actions.addTheseToExisting) => {
    // number needs for using this method in filling fields for holdings and item profiles
    const adminNoteFieldName = `profile.mappingDetails.mappingFields[${number}].repeatableFieldAction`;

    cy.do([
      Select({ name: adminNoteFieldName }).focus(),
      Select({ name: adminNoteFieldName }).choose(action),
      Button('Add administrative note').click(),
      TextField('Administrative note').fillIn(`"${note}"`)
    ]);
  },

  addElectronicAccess:(relationship, uri, linkText = '') => {
    cy.do([
      Select({ name:'profile.mappingDetails.mappingFields[23].repeatableFieldAction' }).focus(),
      Select({ name:'profile.mappingDetails.mappingFields[23].repeatableFieldAction' }).choose(actions.addTheseToExisting),
      Button('Add electronic access').click(),
      TextField('Relationship').fillIn(`"${relationship}"`),
      TextField('URI').fillIn(uri),
      TextField('Link text').fillIn(linkText)
    ]);
    waitLoading();
  },

  addHoldingsStatements:(statement, action = actions.addTheseToExisting) => {
    cy.do([
      Select({ name:'profile.mappingDetails.mappingFields[16].repeatableFieldAction' }).focus(),
      Select({ name:'profile.mappingDetails.mappingFields[16].repeatableFieldAction' }).choose(action),
      Button('Add holdings statement').click(),
      TextField('Holdings statement').fillIn(`"${statement}"`),
      TextField('Statement public note').fillIn(`"${statement}"`)
    ]);
  },

  addSuppressFromDiscovery:(suppressFromDiscavery = 'Mark for all affected records') => {
    cy.do([
      suppressFromDiscoverySelect.focus(),
      suppressFromDiscoverySelect.choose(suppressFromDiscavery)
    ]);
    waitLoading();
  },

  addStaffSuppress:(staffSuppress) => {
    cy.do([
      staffSuppressSelect.focus(),
      staffSuppressSelect.choose(staffSuppress)
    ]);
  },

  addPreviouslyHeld:(previouslyHeld) => {
    cy.do([
      previouslyHeldSelect.focus(),
      previouslyHeldSelect.choose(previouslyHeld)
    ]);
  },

  addNatureOfContentTerms:(value) => {
    const contentTerms = 'profile.mappingDetails.mappingFields[22].repeatableFieldAction';

    cy.do([
      Select({ name: contentTerms }).focus(),
      Select({ name: contentTerms }).choose(actions.addTheseToExisting),
      Button('Add nature of content term').click(),
      TextField('Nature of content term').fillIn(`"${value}"`)
    ]);
    waitLoading();
  },

  fillPermanentLocation:(location) => {
    cy.do(permanentLocationField.fillIn(location));
    waitLoading();
  },

  fillCatalogedDate:(date = catalogedDate) => {
    cy.do(catalogedDateField.fillIn(date));
    waitLoading();
  },

  fillInstanceStatusTerm:(statusTerm = INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED) => {
    cy.do(TextField('Instance status term').fillIn(`"${statusTerm}"`));
    waitLoading();
  },

  fillHoldingsType:(type) => {
    cy.do(TextField('Holdings type').fillIn(`"${type}"`));
    waitLoading();
  },

  fillCallNumberType:(type) => {
    cy.do(TextField('Call number type').fillIn(type));
    waitLoading();
  },

  fillStatus:(itemStatus) => {
    cy.do(TextField('Status').fillIn(`"${itemStatus}"`));
    waitLoading();
  },

  fillPermanentLoanType:(loanType) => {
    cy.do(TextField('Permanent loan type').fillIn(`"${loanType}"`));
    waitLoading();
  },

  fillTemporaryLoanType:(loanType) => {
    cy.do(TextField('Temporary loan type').fillIn(loanType));
    waitLoading();
  },

  fillMaterialType:(type) => {
    cy.do(materialTypeField.fillIn(type));
    waitLoading();
  },

  fillIllPolicy:(policy) => {
    cy.do(TextField('ILL policy').fillIn(`"${policy}"`));
    waitLoading();
  },

  addHoldingsNotes:(type, note, staffOnly) => {
    const holdingsNotesFieldName = 'profile.mappingDetails.mappingFields[22].repeatableFieldAction';
    const selectName = 'profile.mappingDetails.mappingFields[22].subfields[0].fields[2].booleanFieldAction';

    cy.do([
      Select({ name:holdingsNotesFieldName }).focus(),
      Select({ name:holdingsNotesFieldName }).choose(actions.addTheseToExisting),
      Button('Add holdings note').click(),
      noteTypeField.fillIn(type),
      TextField('Note').fillIn(`"${note}"`),
      Select({ name:selectName }).focus(),
      Select({ name:selectName }).choose(staffOnly)
    ]);
    waitLoading();
  },

  fillBatchGroup:(group) => {
    cy.do(batchGroupField.fillIn(group));
    waitLoading();
  },

  fillPaymentMethod:(method) => {
    cy.do(paymentMethodField.fillIn(method));
    waitLoading();
  },

  addItemNotes:(noteType, note, staffOnly) => {
    const noteFieldName = 'profile.mappingDetails.mappingFields[25].repeatableFieldAction';
    const selectName = 'profile.mappingDetails.mappingFields[25].subfields[0].fields[2].booleanFieldAction';

    cy.do([
      Select({ name:noteFieldName }).focus(),
      Select({ name:noteFieldName }).choose(actions.addTheseToExisting),
      Button('Add item note').click(),
      noteTypeField.fillIn(noteType),
      TextField('Note').fillIn(note),
      Select({ name:selectName }).focus(),
      Select({ name:selectName })
        .choose(staffOnly)
    ]);
    waitLoading();
  },

  addCheckInCheckOutNote:(noteType, note, staffOnly) => {
    const noteFieldName = 'profile.mappingDetails.mappingFields[29].repeatableFieldAction';
    const selectName = 'profile.mappingDetails.mappingFields[29].subfields[0].fields[2].booleanFieldAction';

    cy.do([
      Select({ name:noteFieldName }).focus(),
      Select({ name:noteFieldName }).choose(actions.addTheseToExisting),
      Button('Add check in / check out note').click(),
      loanAndAvailabilityAccordion.find(noteTypeField).fillIn(noteType),
      loanAndAvailabilityAccordion.find(TextField('Note')).fillIn(note),
      Select({ name:selectName }).focus(),
      Select({ name:selectName })
        .choose(staffOnly)
    ]);
    waitLoading();
  },

  fillCurrency:(currency) => {
    cy.do(currencyField.fillIn(currency));
    waitLoading();
  },

  fillVendorName:(vendorName) => {
    cy.do([
      organizationLookUpButton.click(),
      SearchField({ id: 'input-record-search' }).fillIn(vendorName),
      searchButton.click()
    ]);
    selectFromResultsList();
  },

  fillInvoiceDate:(date) => {
    cy.do(TextField('Invoice date*').fillIn(date));
    waitLoading();
  },

  addFieldMappingsForMarc:() => {
    cy.do(Select({ name:'profile.mappingDetails.marcMappingOption' }).choose(actionsFieldMappingsForMarc.modify));
  },

  fillModificationSectionWithAdd:(action, fieldNumber, subfieldInFirstField = '*', subaction, subfieldTextInFirstField, subfieldInSecondField, subfieldTextInSecondField) => {
    cy.do([
      Select({ name:'profile.mappingDetails.marcMappingDetails[0].action' }).choose(action),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.field' }).fillIn(fieldNumber),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subfield' }).fillIn(subfieldInFirstField),
      Select({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subaction' }).choose(subaction),
      TextArea({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].data.text' }).fillIn(subfieldTextInFirstField),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].subfield' }).fillIn(subfieldInSecondField),
      TextArea({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].data.text' }).fillIn(subfieldTextInSecondField)
    ]);
  },

  fillModificationSectionWithDelete:(action, fieldNumber, number) => {
    cy.do([
      Select({ name:`profile.mappingDetails.marcMappingDetails[${number}].action` }).choose(action),
      TextField({ name:`profile.mappingDetails.marcMappingDetails[${number}].field.field` }).fillIn(fieldNumber)
    ]);
  },

  addNewFieldInModificationSection:() => {
    cy.get('div[class^="tableRow-"]').last().then(elem => {
      elem[0].querySelector('button[icon="plus-sign"]').click();
    });
  },

  addFormerHoldings:(name, action = actions.addTheseToExisting) => {
    // number needs for using this method in filling fields for holdings and item profiles
    const formerHoldingsFieldName = 'profile.mappingDetails.mappingFields[2].repeatableFieldAction';

    cy.do([
      Select({ name: formerHoldingsFieldName }).focus(),
      Select({ name: formerHoldingsFieldName }).choose(action),
      Button('Add former holdings identifier').click(),
      TextField('Former holdings ID').fillIn(`"${name}"`)
    ]);
    waitLoading();
  },

  markFieldForProtection:(field) => {
    cy.get('div[class^="mclRow--"]').contains('div[class^="mclCell-"]', field).then(elem => {
      elem.parent()[0].querySelector('input[type="checkbox"]').click();
    });
  },

  createMappingProfileViaApi:(nameProfile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: { profile: {
          name: nameProfile,
          incomingRecordType: 'MARC_BIBLIOGRAPHIC',
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
        } },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createMappingProfileViaApiMarc: (name, incomingRecordType, folioRecordType) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'data-import-profiles/mappingProfiles',
      body: {
        profile: {
          name: name,
          incomingRecordType: incomingRecordType,
          existingRecordType: folioRecordType,
          mappingDetails: {
            marcMappingOption: "UPDATE",
            name: "marcAuthority",
            recordType: "MARC_AUTHORITY"
          }
        }
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ response }) => {
      return response;
    });
  },
};
