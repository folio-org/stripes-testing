import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Callout,
  Checkbox,
  Dropdown,
  DropdownMenu,
  Form,
  IconButton,
  Label,
  ListItem,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  Option,
  Pane,
  Popover,
  SearchField,
  Select,
  TextArea,
  TextField,
} from '../../../../../../interactors';
import {
  ACQUISITION_METHOD_NAMES_IN_MAPPING_PROFILES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INCOMING_RECORD_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  LOCATION_NAMES,
} from '../../../../constants';
import getRandomPostfix from '../../../../utils/stringTools';

const saveButton = Button('Save as profile & Close');
const searchButton = Button('Search');
const addDonorButton = Button('Add donor');
const organizationLookUpButton = Button('Organization look-up');
const organizationModal = Modal('Select Organization');
const addDonorsModal = Modal('Add donors');
const staffSuppressSelect = Select('Staff suppress');
const suppressFromDiscoverySelect = Select('Suppress from discovery');
const previouslyHeldSelect = Select('Previously held');
const loanAndAvailabilityAccordion = Accordion('Loan and availability');
const orderInformationAccordion = Accordion('Order information');
const locationAccordion = Accordion('Location');
const physicalResourceDetailsAccordion = Accordion('Physical resource details');
const electronicResourceDetailsAccordion = Accordion({ id: 'e-resources-details' });
const eResourcesDetailsAccordion = Accordion('E-resources details');
const nameField = TextField({ name: 'profile.name' });
const searchField = TextField({ id: 'input-record-search' });
const permanentLocationField = TextField('Permanent');
const catalogedDateField = TextField('Cataloged date');
const titleField = TextField('Title*');
const incomingRecordTypeField = Select({ name: 'profile.incomingRecordType' });
const currencyField = TextField('Currency*');
const vendor = TextField('Vendor*');
const purchaseOrderLinesLimit = TextField('Purchase order lines limit setting');
const noteTypeField = TextField('Note type');
const noteField = TextField('Note');
const relationshipField = TextField('Relationship');
const uriField = TextField('URI');
const linkTextField = TextField('Link text');
const materialsSpecifiedField = TextField('Materials specified');
const urlPublicNoteField = TextField('URL public note');
const reEncumberField = TextField('Re-encumber');
const purchaseOrderStatus = TextField('Purchase order status*');
const mustAcknoledgeReceivingNoteField = TextField('Must acknowledge receiving note');
const publicationDateField = TextField('Publication date');
const publisherField = TextField('Publisher');
const editionField = TextField('Edition');
const internalNoteField = TextArea('Internal note');
const acquisitionMethodField = TextField('Acquisition method*');
const orderFormatField = TextField('Order format*');
const orderTypetField = TextField('Order type*');
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
const mappingProfilesForm = Form({ id: 'mapping-profiles-form' });
const recordTypeselect = Select({ name: 'profile.existingRecordType' });
const closeButton = Button('Close');
const closeWithoutSavingButton = Button('Close without saving');
const linkProfileButton = Button('Link Profile');

const requiredFields = {
  'Purchase order status': purchaseOrderStatus,
  Vendor: vendor,
  'Order type': orderTypetField,
  Title: titleField,
  'Acquisition method': acquisitionMethodField,
  'Order format': orderFormatField,
  'Receiving workflow': receivingWorkflowField,
  Currency: currencyField,
};

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

const materialType = '"book"';
const permanentLoanType = '"Can circulate"';
const status = '"In process"';
const holdingsType = 'Holdings';
const itemType = 'Item';
const catalogedDate = '###TODAY###';
const defaultMappingProfile = {
  name: `autotest${FOLIO_RECORD_TYPE.INSTANCE}${getRandomPostfix()}`,
  typeValue: FOLIO_RECORD_TYPE.INSTANCE,
  location: `"${LOCATION_NAMES.ANNEX_UI}"`,
  material: materialType,
  loan: permanentLoanType,
  statusField: status,
  fillProfile: '',
};

const save = () => {
  // TODO need to wait until profile to be filled
  cy.wait(3000);
  cy.do(saveButton.click());
  cy.wait(1500);
};
const selectOrganizationByName = (organizationName) => {
  cy.do(organizationLookUpButton.click());
  cy.expect(organizationModal.exists());
  cy.do([
    organizationModal.find(searchField).fillIn(organizationName),
    organizationModal.find(searchButton).click(),
  ]);
  cy.expect(MultiColumnListCell(including(organizationName)).exists());
  cy.do(
    MultiColumnListCell({ columnIndex: 0, row: 0, content: including(organizationName) }).click(),
  );
};

const selectFromResultsList = (rowNumber = 0) => cy.do(organizationModal.find(MultiColumnListRow({ index: rowNumber })).click());

const addContributor = (profile) => {
  if (profile.contributor) {
    cy.do(Button('Add contributor').click());
    cy.wait(1500);
    cy.do([
      TextField('Contributor').focus(),
      TextField('Contributor').fillIn(profile.contributor),
      TextField('Contributor type').focus(),
      TextField('Contributor type').fillIn(`"${profile.contributorType}"`),
    ]);
  }
};

const addProductId = (profile) => {
  if (profile.productId) {
    cy.do(Button('Add product ID and product ID type').click());
    cy.wait(1500);
    cy.do([
      TextField('Product ID').focus(),
      TextField('Product ID').fillIn(profile.productId),
      TextField('Product ID type').focus(),
      TextField('Product ID type').fillIn(`"${profile.productIDType}"`),
    ]);
  }
  if (profile.qualifier) {
    cy.do([TextField('Qualifier').focus(), TextField('Qualifier').fillIn(profile.qualifier)]);
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
    cy.do(Button('Add fund distribution').click());
    cy.wait(1500);
    cy.do([
      TextField('Fund ID').focus(),
      TextField('Fund ID').fillIn(profile.fundId),
      TextField('Expense class').focus(),
      TextField('Expense class').fillIn(profile.expenseClass),
      TextField('Value').focus(),
      TextField('Value').fillIn(`"${profile.value}"`),
      Accordion('Fund distribution').find(Button('%')).click(),
    ]);
  }
};

const addLocation = (profile) => {
  if (profile.locationName) {
    cy.do(locationAccordion.find(Button('Add location')).click());
    cy.wait(1500);
    cy.do(TextField('Name (code)').fillIn(profile.locationName));
  }
  if (profile.locationQuantityElectronic) {
    cy.do([
      locationAccordion.find(quantityElectronicField).focus(),
      locationAccordion.find(quantityElectronicField).fillIn(profile.locationQuantityElectronic),
    ]);
  }
  if (profile.locationQuantityPhysical) {
    cy.do([
      locationAccordion.find(quantityPhysicalField).focus(),
      locationAccordion.find(quantityPhysicalField).fillIn(profile.locationQuantityPhysical),
    ]);
  }
};

const addDonor = (profile) => {
  if (profile.donor) {
    for (let i = 0; i < profile.donor.length; i++) {
      if (profile.donor[i].existingStatus === true) {
        cy.do(addDonorButton.click());
        cy.expect(Button('Donor look-up').exists());
        cy.do(
          Button({
            id: `profile.mappingDetails.mappingFields[44].subfields.${i}.fields.0.value-plugin`,
          }).click(),
        );
        cy.expect(addDonorsModal.exists());
        cy.do(
          addDonorsModal
            .find(TextField({ id: 'input-record-search' }))
            .fillIn(profile.donor[i].value),
        );
        cy.wait(1000);
        cy.do(addDonorsModal.find(searchButton).click());
        cy.expect(addDonorsModal.find(HTML(including('1 record found'))).exists());
        cy.do(MultiColumnListCell({ content: profile.donor[i].value }).click());
      } else {
        cy.do([
          addDonorButton.click(),
          TextField({
            name: `profile.mappingDetails.mappingFields[44].subfields.${i}.fields.0.value`,
          }).fillIn(profile.donor[i].value),
        ]);
      }
    }
  }
};

const addVendor = (profile) => {
  cy.wait(1000);
  cy.do([
    orderInformationAccordion.find(organizationLookUpButton).click(),
    organizationModal.find(searchField).fillIn(profile.vendor),
    organizationModal.find(searchButton).click(),
  ]);
  cy.expect(MultiColumnListCell(including(profile.vendor)).exists());
  cy.do(MultiColumnListCell({ columnIndex: 0, row: 0, content: profile.vendor }).click());
};

const addMaterialSupplier = (profile) => {
  if (profile.materialSupplier) {
    cy.do([
      physicalResourceDetailsAccordion.find(organizationLookUpButton).click(),
      organizationModal.find(searchField).fillIn(profile.materialSupplier),
      organizationModal.find(searchButton).click(),
      MultiColumnListCell({ columnIndex: 0, row: 0, content: profile.materialSupplier }).click(),
    ]);
  }
};

const addAccessProvider = (profile) => {
  if (profile.accessProvider) {
    cy.do([
      Accordion('E-resources details').find(organizationLookUpButton).click(),
      organizationModal.find(searchField).fillIn(profile.accessProvider),
      organizationModal.find(searchButton).click(),
      MultiColumnListCell({ columnIndex: 0, row: 0, content: profile.accessProvider }).click(),
    ]);
  }
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
  cy.wait(1500);
};
const fillSummaryForMarcAuthInMappingProfile = (specialMappingProfile = defaultMappingProfile) => {
  cy.do([
    nameField.fillIn(specialMappingProfile.name),
    incomingRecordTypeField.choose(incomingRecordType.marcAuth),
    existingRecordType.choose(specialMappingProfile.typeValue),
  ]);
  cy.wait(1500);
};
const fillFolioRecordType = (profile) => {
  cy.do(existingRecordType.choose(profile.typeValue));
  cy.wait(1500);
};
const fillInvoiceLineDescription = (description) => {
  cy.do(Accordion('Invoice line information').find(TextField('Description*')).fillIn(description));
};
const fillSummaryDescription = (text) => {
  cy.do(Accordion('Summary').find(TextArea('Description')).fillIn(text));
};
const fillMaterialType = (type) => cy.do(materialTypeField.fillIn(type));
const fillStatus = (itemStatus) => cy.do(TextField('Status').fillIn(itemStatus));
const fillPermanentLoanType = (loanType) => cy.do(TextField('Permanent loan type').fillIn(`"${loanType}"`));
const fillInstanceStatusTerm = (statusTerm = INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED) => cy.do(TextField('Instance status term').fillIn(`"${statusTerm}"`));
const fillHoldingsType = (type) => {
  cy.wait(1000);
  cy.do(TextField('Holdings type').fillIn(`"${type}"`));
};
const selectAdminNotesAction = (numberOfmappingField, action = actions.addTheseToExisting) => {
  // number needs for using this method in filling fields for holdings and item profiles
  const adminNoteFieldName = `profile.mappingDetails.mappingFields[${numberOfmappingField}].repeatableFieldAction`;

  cy.do([
    Select({ name: adminNoteFieldName }).focus(),
    Select({ name: adminNoteFieldName }).choose(action),
  ]);
};
const selectActionForStatisticalCode = (number, action = actions.addTheseToExisting) => {
  // number needs for using this method in filling fields for holdings and item profiles
  const statisticalCodeFieldName = `profile.mappingDetails.mappingFields[${number}].repeatableFieldAction`;

  cy.do([
    Select({ name: statisticalCodeFieldName }).focus(),
    Select({ name: statisticalCodeFieldName }).choose(action),
  ]);
};
const addStatisticalCode = (name, number, action) => {
  selectActionForStatisticalCode(number, action);
  cy.do(Button('Add statistical code').click());
  cy.wait(1500);
  cy.do(TextField('Statistical code').fillIn(`"${name}"`));
};
const addItemNotes = (noteType, note, staffOnly) => {
  const noteFieldName = 'profile.mappingDetails.mappingFields[25].repeatableFieldAction';
  const selectName =
    'profile.mappingDetails.mappingFields[25].subfields[0].fields[2].booleanFieldAction';

  cy.do([
    Select({ name: noteFieldName }).focus(),
    Select({ name: noteFieldName }).choose(actions.addTheseToExisting),
    Button('Add item note').click(),
  ]);
  cy.wait(1000);
  cy.do([
    Select({ name: selectName }).focus(),
    Select({ name: selectName }).choose(staffOnly),
    noteTypeField.focus(),
    noteTypeField.fillIn(noteType),
    noteField.focus(),
    noteField.fillIn(note),
  ]);
};

export default {
  incomingRecordType,
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
  addDonor,
  addVendor,
  addMaterialSupplier,
  addAccessProvider,
  addVolume,
  selectFromResultsList,
  fillSummaryInMappingProfile,
  fillSummaryForMarcAuthInMappingProfile,
  fillSummaryDescription,
  fillInvoiceLineDescription,
  fillFolioRecordType,
  fillMaterialType,
  fillPermanentLoanType,
  fillStatus,
  fillInstanceStatusTerm,
  fillHoldingsType,
  selectOrganizationByName,
  selectAdminNotesAction,
  addStatisticalCode,
  selectActionForStatisticalCode,
  save,
  addItemNotes,
  waitLoading: () => {
    cy.expect(mappingProfilesForm.exists());
  },

  fillInstanceMappingProfile: (profile) => {
    // Summary section
    fillSummaryInMappingProfile(profile);
    if (profile.catalogedDate) {
      cy.do(catalogedDateField.fillIn(profile.catalogedDate));
    }
    if (profile.instanceStatusTerm) {
      fillInstanceStatusTerm(profile.instanceStatusTerm);
    }
    if (profile.statisticalCode) {
      addStatisticalCode(profile.statisticalCode, 8);
    }
    save();
    cy.expect(saveButton.absent());
  },

  fillHoldingsMappingProfile: (profile) => {
    // Summary section
    fillSummaryInMappingProfile(profile);
    if (profile.permanentLocation) {
      cy.do(permanentLocationField.fillIn(profile.permanentLocation));
    }
    if (profile.holdingsType) {
      fillHoldingsType(profile.holdingsType);
    }
    if (profile.callNumberType) {
      cy.do(TextField('Call number type').fillIn(`"${profile.callNumberType}"`));
    }
    if (profile.callNumber) {
      cy.do(TextField('Call number').fillIn(profile.callNumber));
    }
    if (profile.relationship) {
      cy.get('[name="profile.mappingDetails.mappingFields[23].repeatableFieldAction"]').select(
        'Add these to existing',
      );
      cy.do([
        Button('Add electronic access').click(),
        relationshipField.fillIn(`"${profile.relationship}"`),
      ]);
    }
    if (profile.uri) {
      cy.do(uriField.fillIn(profile.uri));
    }
    if (profile.linkText) {
      cy.do(linkTextField.fillIn(profile.linkText));
    }
    save();
    cy.expect(saveButton.absent());
  },

  fillItemMappingProfile: (profile) => {
    // Summary section
    fillSummaryInMappingProfile(profile);
    if (profile.materialType) {
      fillMaterialType(profile.materialType);
    }
    if (profile.permanentLoanType) {
      fillPermanentLoanType(profile.permanentLoanType);
    }
    if (profile.status) {
      fillStatus(`"${profile.status}"`);
    }
    if (profile.statisticalCode) {
      addStatisticalCode(profile.statisticalCode, 6);
    }
    if (profile.noteType) {
      addItemNotes(profile.noteType, profile.note, profile.staffOnly);
    }
    save();
    cy.expect(saveButton.absent());
  },

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
          relationshipField.fillIn(specialMappingProfile.electronicAccess.relationship),
          uriField.fillIn(specialMappingProfile.electronicAccess.uri),
          linkTextField.fillIn(specialMappingProfile.electronicAccess.linkText),
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
      cy.wait(1500);
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
        cy.wait(1500);
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
    cy.wait(1500);
    cy.get('#mapping-profiles-form').find('textarea[name="profile.description"]').clear();
    cy.wait(1000);
    if (profile.description) {
      fillSummaryDescription(profile.description);
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
    addMaterialSupplier(profile);
    if (profile.createInventory) {
      cy.do(
        physicalResourceDetailsAccordion
          .find(TextField('Create inventory'))
          .fillIn(`"${profile.createInventory}"`),
      );
    }
    if (profile.createInventoryElectronic) {
      cy.do(
        electronicResourceDetailsAccordion
          .find(TextField('Create inventory'))
          .fillIn(`"${profile.createInventoryElectronic}"`),
      );
    }
    if (profile.materialType) {
      cy.do(
        physicalResourceDetailsAccordion
          .find(materialTypeField)
          .fillIn(`"${profile.materialType}"`),
      );
    }
    if (profile.materialTypeElectronic) {
      cy.do(
        electronicResourceDetailsAccordion
          .find(materialTypeField)
          .fillIn(`"${profile.materialTypeElectronic}"`),
      );
    }
    addVolume(profile);
    if (profile.accessProvider) {
      cy.do(TextField('Access provider').fillIn(`"${profile.accessProvider}"`));
    }
    addDonor(profile);
  },

  fillTextFieldInAccordion: (accordionName, fieldName, value) => {
    cy.do(Accordion(accordionName).find(TextField(fieldName)).fillIn(value));
  },
  addName: (name) => cy.do(nameField.fillIn(name)),
  addIncomingRecordType: (type) => cy.do(incomingRecordTypeField.choose(type)),
  addFolioRecordType: (folioType) => {
    cy.do(existingRecordType.choose(folioType));
    cy.wait(1500);
  },
  fillTemporaryLocation: (location) => cy.do(TextField('Temporary').fillIn(location)),
  fillDigitizationPolicy: (policy) => cy.do(TextField('Digitization policy').fillIn(policy)),
  fillCallNumber: (number) => cy.do(TextField('Call number').fillIn(number)),
  fillNumberOfPieces: (number) => cy.do(TextField('Number of pieces').fillIn(number)),
  fillBarcode: (barcode) => cy.do(TextField('Barcode').fillIn(barcode)),
  fillItemIdentifier: (identifier) => cy.do(TextField('Item identifier').fillIn(identifier)),
  fillAccessionNumber: (number) => cy.do(TextField('Accession number').fillIn(number)),
  fillCopyNumber: (number) => cy.do(TextField('Copy number').fillIn(number)),
  fillVendorInvoiceNumber: (number) => cy.do(TextField('Vendor invoice number*').fillIn(number)),
  fillQuantity: (quantity) => cy.do(TextField('Quantity*').fillIn(quantity)),
  fillSubTotal: (number) => cy.do(TextField('Sub-total*').fillIn(number)),
  fillPurchaseOrderStatus: (orderStatus) => cy.do(purchaseOrderStatus.fillIn(`"${orderStatus}"`)),
  fillMaterialTypeForElectronicResource: (type) => {
    cy.do(eResourcesDetailsAccordion.find(TextField('Material type')).fillIn(type));
  },
  fillMaterialTypeForPhysicalResource: (type) => {
    cy.do(physicalResourceDetailsAccordion.find(TextField('Material type')).fillIn(type));
  },
  fillOrderFormat: (format) => cy.do(orderFormatField.fillIn(format)),
  fillCreateInventoryForElectronicResource: (inventory) => {
    cy.do(eResourcesDetailsAccordion.find(TextField('Create inventory')).fillIn(inventory));
  },
  fillCreateInventoryForPhysicalResource: (inventory) => {
    cy.do(physicalResourceDetailsAccordion.find(TextField('Create inventory')).fillIn(inventory));
  },

  fillMappingProfileForUpdatesMarc: (specialMappingProfile = defaultMappingProfile) => {
    fillSummaryInMappingProfile(specialMappingProfile);
    cy.do(
      Select({ name: 'profile.mappingDetails.marcMappingOption' }).choose(
        actionsFieldMappingsForMarc.update,
      ),
    );
  },

  fillMappingProfileForUpdatesMarcAuthority: (specialMappingProfile = defaultMappingProfile) => {
    fillSummaryForMarcAuthInMappingProfile(specialMappingProfile);
    cy.do(
      Select({ name: 'profile.mappingDetails.marcMappingOption' }).choose(
        actionsFieldMappingsForMarc.update,
      ),
    );
  },

  addStatisticalCodeWithSeveralCodes(firstCode, secondCode, number, action) {
    selectActionForStatisticalCode(number, action);
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

  addAdministrativeNote: (note, numberOfmappingField, action) => {
    selectAdminNotesAction(numberOfmappingField, action);
    cy.do(Button('Add administrative note').click());
    cy.wait(1000);
    cy.do(TextField('Administrative note').fillIn(`"${note}"`));
  },

  changedExistingAdminNote(notes, numberOfmappingField) {
    for (let i = 0; i < notes.length; i++) {
      const subfieldIndex = i;
      const adminNoteNextFieldName = `profile.mappingDetails.mappingFields[${numberOfmappingField}].subfields.${subfieldIndex}.fields.0.value`;

      cy.do(TextField({ name: `${adminNoteNextFieldName}` }).fillIn(notes[i]));
    }
  },

  addAdminNoteAndValidateCorrectValue(notes, numberOfmappingField) {
    selectAdminNotesAction(numberOfmappingField);
    for (let i = 0; i < notes.length; i++) {
      const subfieldIndex = i;
      const adminNoteNextFieldName = `profile.mappingDetails.mappingFields[${numberOfmappingField}].subfields.${subfieldIndex}.fields.0.value`;

      cy.do([
        Button('Add administrative note').click(),
        TextField({ name: `${adminNoteNextFieldName}` }).fillIn(notes[i]),
      ]);
      cy.expect(
        TextField({ name: `${adminNoteNextFieldName}` }).has({
          error: 'Non-MARC value must use quotation marks',
        }),
      );
    }
  },

  addElectronicAccess: (
    typeValue,
    relationship,
    uri,
    linkText = '',
    materialsSpecified = '',
    urlPublicNote = '',
  ) => {
    cy.do([Button('Add electronic access').click()]);
    cy.wait(1500);
    cy.do([
      relationshipField.focus(),
      relationshipField.fillIn(relationship),
      uriField.focus(),
      uriField.fillIn(uri),
      linkTextField.focus(),
      linkTextField.fillIn(linkText),
      materialsSpecifiedField.focus(),
      materialsSpecifiedField.fillIn(materialsSpecified),
      urlPublicNoteField.focus(),
      urlPublicNoteField.fillIn(urlPublicNote),
    ]);
    if (typeValue === 'Holdings') {
      cy.do([
        Select({ name: 'profile.mappingDetails.mappingFields[23].repeatableFieldAction' }).focus(),
        Select({ name: 'profile.mappingDetails.mappingFields[23].repeatableFieldAction' }).choose(
          actions.addTheseToExisting,
        ),
      ]);
    }
    if (typeValue === 'Item') {
      cy.do([
        Select({ name: 'profile.mappingDetails.mappingFields[32].repeatableFieldAction' }).focus(),
        Select({ name: 'profile.mappingDetails.mappingFields[32].repeatableFieldAction' }).choose(
          actions.addTheseToExisting,
        ),
      ]);
    }
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
    ]);
    cy.wait(1000);
    cy.do(TextField('Nature of content term').fillIn(value));
  },

  fillPermanentLocation: (location) => cy.do(permanentLocationField.fillIn(location)),
  fillCatalogedDate: (date = catalogedDate) => {
    cy.do(catalogedDateField.fillIn(date));
    cy.wait(1500);
  },
  fillCallNumberType: (type) => cy.do(TextField('Call number type').fillIn(type)),
  fillCallNumberPrefix: (prefix) => cy.do(TextField('Call number prefix').fillIn(prefix)),
  fillcallNumberSuffix: (sufix) => cy.do(TextField('Call number suffix').fillIn(sufix)),
  fillTemporaryLoanType: (loanType) => cy.do(TextField('Temporary loan type').fillIn(loanType)),
  fillIllPolicy: (policy) => cy.do(TextField('ILL policy').fillIn(`"${policy}"`)),
  fillBatchGroup: (group) => cy.do(batchGroupField.fillIn(group)),
  fillPaymentMethod: (method) => cy.do(paymentMethodField.fillIn(method)),
  fillCurrency: (currency) => cy.do(currencyField.fillIn(currency)),
  fillInvoiceDate: (date) => cy.do(TextField('Invoice date*').fillIn(date)),

  addHoldingsNotes: (type, note, staffOnly) => {
    const holdingsNoteTypeFieldName =
      'profile.mappingDetails.mappingFields[22].repeatableFieldAction';
    const selectName =
      'profile.mappingDetails.mappingFields[22].subfields[0].fields[2].booleanFieldAction';

    cy.do([
      Select({ name: holdingsNoteTypeFieldName }).focus(),
      Select({ name: holdingsNoteTypeFieldName }).choose(actions.addTheseToExisting),
      Button('Add holdings note').click(),
    ]);
    cy.wait(1000);
    cy.do([
      Select({ name: selectName }).focus(),
      Select({ name: selectName }).choose(staffOnly),
      noteField.focus(),
      noteField.fillIn(`"${note}"`),
      noteTypeField.focus(),
      noteTypeField.fillIn(type),
    ]);
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
      loanAndAvailabilityAccordion.find(noteField).fillIn(note),
      Select({ name: selectName }).focus(),
      Select({ name: selectName }).choose(staffOnly),
    ]);
  },

  fillVendorName: (vendorName) => {
    cy.do([
      organizationLookUpButton.click(),
      Modal('Select Organization')
        .find(SearchField({ id: 'input-record-search' }))
        .fillIn(vendorName),
      Modal('Select Organization').find(searchButton).click(),
    ]);
    selectFromResultsList();
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
    ]);
    cy.wait(1000);
    cy.do(TextField('Former holdings ID').fillIn(`"${name}"`));
  },

  addExpenseClass: (fundDistributionSource) => {
    cy.do([
      Select({
        name: 'profile.mappingDetails.mappingFields[27].subfields.0.fields.14.value',
      }).focus(),
      Select({
        name: 'profile.mappingDetails.mappingFields[27].subfields.0.fields.14.value',
      }).choose(fundDistributionSource),
    ]);
    cy.expect(
      Select({ name: 'profile.mappingDetails.mappingFields[27].subfields.0.fields.14.value' }).has({
        error: 'One or more values must be added before the profile can be saved.',
      }),
    );
    cy.do(Button('Add fund distribution').click());
    cy.wait(3000);
    cy.get('#invoice-line-fund-distribution [class*=repeatableFieldItem]')
      .find('button:contains("Accepted values"):last')
      .click();
  },

  addFormerIdentifier: (value, action = actions.addTheseToExisting) => {
    cy.do([
      Select({ name: 'profile.mappingDetails.mappingFields[5].repeatableFieldAction' }).focus(),
      Select({ name: 'profile.mappingDetails.mappingFields[5].repeatableFieldAction' }).choose(
        action,
      ),
      Button('Add former identifier').click(),
      TextField('Former Identifier').fillIn(`"${value}"`),
    ]);
  },

  addFieldToMarcBibUpdate({ field, ind1, ind2, subfield }) {
    cy.do([
      Accordion({ id: 'edit-field-mappings-for-marc-updates' }).find(Button('Add field')).click(),
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
    ]);
  },

  fillMissingPieces: (value) => cy.do(TextField('Missing pieces').fillIn(value)),

  verifyExpenseClassesIsPresentedInDropdown: (value) => {
    cy.expect(DropdownMenu({ visible: true }).find(HTML(value)).exists());
  },

  markFieldForProtection: (field) => {
    cy.get('div[class^="mclRow--"]')
      .find('div[class^="mclCell-"]')
      .contains(field)
      .then((elem) => {
        elem.parent()[0].querySelector('input[type="checkbox"]').click();
      });
    // TODO wait until checkbox will be marked
    cy.wait(2000);
  },

  createModifyMarcBibMappingProfileViaApi: (profile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: profile.name,
            incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            mappingDetails: {
              name: 'marcBib',
              recordType: 'MARC_BIBLIOGRAPHIC',
              marcMappingDetails: [
                {
                  order: 0,
                  field: {
                    subfields: [
                      {
                        subaction: null,
                        data: {
                          text: profile.updatingText,
                        },
                        subfield: profile.subfield,
                      },
                    ],
                    field: profile.fieldNumber,
                    indicator2: profile.indicator2,
                  },
                  action: 'ADD',
                },
              ],
              marcMappingOption: 'MODIFY',
            },
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createInstanceMappingProfileViaApi: (profile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: profile.name,
            incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          },
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createHoldingsMappingProfileViaApi: (profile) => {
    // eslint-disable-next-line no-unused-vars
    let locationId;

    if (profile.permanentLocation === LOCATION_NAMES.MAIN_LIBRARY_UI) {
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY}"` }).then((res) => {
        locationId = res.id;
      });
    }
    if (profile.permanentLocation === LOCATION_NAMES.ANNEX_UI) {
      cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX}"` }).then((res) => {
        locationId = res.id;
      });
    }
    if (profile.permanentLocation === LOCATION_NAMES.ONLINE_UI) {
      cy.getLocations({ query: `name="${LOCATION_NAMES.ONLINE}"` }).then((res) => {
        locationId = res.id;
      });
    }

    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: profile.name,
            incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
            mappingDetails: {
              name: 'holdings',
              recordType: 'HOLDINGS',
              mappingFields: [
                {
                  name: 'permanentLocationId',
                  enabled: true,
                  path: 'holdings.permanentLocationId',
                  value: `"${profile.permanentLocation}"`,
                  subfields: [],
                  acceptedValues: {
                    locationId: profile.permanentLocation,
                  },
                },
              ],
            },
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createItemMappingProfileViaApi: (profile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: profile.name,
            incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.ITEM,
            mappingDetails: {
              name: 'item',
              recordType: 'ITEM',
              mappingFields: [
                {
                  name: 'materialType.id',
                  enabled: true,
                  path: 'item.materialType.id',
                  value: `"${profile.materialType}"`,
                  subfields: [],
                  acceptedValues: { '1a54b431-2e4f-452d-9cae-9cee66c9a892': profile.materialType },
                },
                {
                  name: 'permanentLoanType.id',
                  enabled: true,
                  path: 'item.permanentLoanType.id',
                  value: `"${profile.permanentLoanType}"`,
                  subfields: [],
                  acceptedValues: {
                    '2b94c631-fca9-4892-a730-03ee529ffe27': profile.permanentLoanType,
                  },
                },
                {
                  name: 'status.name',
                  enabled: true,
                  path: 'item.status.name',
                  value: `"${profile.status}"`,
                  subfields: [],
                },
              ],
            },
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createMappingProfileForUpdateMarcBibViaApi: (profile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: profile.name,
            incomingRecordType: 'MARC_BIBLIOGRAPHIC',
            existingRecordType: 'MARC_BIBLIOGRAPHIC',
            description: '',
            mappingDetails: {
              name: 'marcBib',
              recordType: 'MARC_BIBLIOGRAPHIC',
              marcMappingDetails: [],
              marcMappingOption: 'UPDATE',
            },
          },
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createMappingProfileForUpdateMarcAuthViaApi: ({ name }) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name,
            incomingRecordType: 'MARC_AUTHORITY',
            existingRecordType: 'MARC_AUTHORITY',
            description: '',
            mappingDetails: {
              name: 'marcAuthority',
              recordType: 'MARC_AUTHORITY',
              marcMappingOption: 'UPDATE',
              mappingFields: [
                {
                  name: 'discoverySuppress',
                  enabled: true,
                  path: 'marcAuthority.discoverySuppress',
                  value: null,
                  booleanFieldAction: 'IGNORE',
                  subfields: [],
                },
                {
                  name: 'hrid',
                  enabled: true,
                  path: 'marcAuthority.hrid',
                  value: '',
                  subfields: [],
                },
              ],
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

  checkNewMatchProfileFormIsOpened: () => {
    cy.expect(Pane('New field mapping profile').exists());
  },

  checkPreviouslyPopulatedDataIsDisplayed: (profile) => {
    cy.expect([
      nameField.has({ value: profile.name }),
      incomingRecordTypeField.has({ value: profile.incomingRecordType }),
      existingRecordType.has({ value: including(profile.recordType) }),
      TextArea({ name: 'profile.description' }).has({ value: profile.description }),
    ]);
  },

  checkOrganizationsAddedToFields: (profile) => {
    cy.expect([
      TextField('Vendor*').has({ value: `"${profile.vendor}"` }),
      TextField('Material supplier').has({ value: `"${profile.materialSupplier}"` }),
      TextField('Access provider').has({ value: `"${profile.accessProvider}"` }),
    ]);
  },

  verifyFieldsMarkedWithAsterisks(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(requiredFields[label].has(conditions));
    });
  },

  verifyFOLIORecordTypeOptionExists(type) {
    cy.expect(recordTypeselect.find(Option(type)).exists());
  },

  clickClose: () => cy.do(closeButton.click()),

  confirmCloseWithoutSaving: () => cy.do(closeWithoutSavingButton.click()),

  verifyAcquisitionsUnitsInfoMessage: (message) => {
    cy.do(
      Label('Acquisitions units')
        .find(IconButton({ icon: 'info' }))
        .click(),
    );
    cy.expect(Popover({ content: including(message) }).exists());
  },

  verifyInfoIconClickable: (accordionName, fieldLabel) => {
    cy.get('#accordion-toggle-button-location').scrollIntoView();
    cy.do(
      Accordion(accordionName)
        .find(Label(fieldLabel))
        .find(IconButton({ icon: 'info' }))
        .click(),
    );
    cy.expect(Popover().exists());
  },

  verifyFieldValue: (accordionName, fieldName, value) => {
    cy.expect(Accordion(accordionName).find(TextField(fieldName)).has({ value }));
  },

  verifyFieldEnabled: (accordionName, fieldName) => {
    cy.expect(Accordion(accordionName).find(TextField(fieldName)).has({ disabled: false }));
  },

  verifyFieldEmptyAndDisabled: (accordionName, fieldName) => {
    cy.expect(
      Accordion(accordionName).find(TextField(fieldName)).has({ value: '', disabled: true }),
    );
  },

  verifyRowFieldValue: (rowIndex, accordionName, fieldName, value) => {
    cy.expect(
      Accordion(accordionName)
        .find(ListItem({ index: rowIndex }))
        .find(TextField(fieldName))
        .has({ value }),
    );
  },

  verifyRowFieldEmptyAndDisabled: (rowIndex, accordionName, fieldName) => {
    cy.expect(
      Accordion(accordionName)
        .find(ListItem({ index: rowIndex }))
        .find(TextField(fieldName))
        .has({ value: '', disabled: true }),
    );
  },

  verifyCheckboxEnabled: (accordionName, fieldName) => {
    cy.expect(Accordion(accordionName).find(Checkbox(fieldName)).has({ disabled: false }));
  },

  verifyCheckboxEmptyAndDisabled: (accordionName, fieldName) => {
    cy.expect(Accordion(accordionName).find(Checkbox(fieldName)).has({ disabled: true }));
  },

  verifyOrganizationLookUpButtonEnabled: (accordionName) => {
    cy.expect(Accordion(accordionName).find(organizationLookUpButton).has({ disabled: false }));
  },

  verifyOrganizationLookUpButtonDisabled: (accordionName) => {
    cy.expect(Accordion(accordionName).find(organizationLookUpButton).has({ disabled: true }));
  },

  verifyAddLocationButtonEnabled: () => {
    cy.expect(locationAccordion.find(Button('Add location')).has({ disabled: false }));
  },

  addAdditionalProductInfo: (product) => {
    cy.do([
      Button('Add product ID and product ID type').click(),
      TextField({
        name: 'profile.mappingDetails.mappingFields[26].subfields.1.fields.0.value',
      }).fillIn(product.id),
      TextField({
        name: 'profile.mappingDetails.mappingFields[26].subfields.1.fields.1.value',
      }).fillIn(product.qualifier),
      TextField({
        name: 'profile.mappingDetails.mappingFields[26].subfields.1.fields.2.value',
      }).fillIn(`"${product.idType}"`),
    ]);
  },

  clickAddLocationButton: () => {
    cy.do([locationAccordion.find(Button('Add location')).click()]);
  },

  isPurchaseOrderStatusFieldFocused: (value) => {
    purchaseOrderStatus.has({ focused: value });
  },

  verifyAddVolumeButtonDisabled: () => {
    cy.expect(physicalResourceDetailsAccordion.find(Button('Add volume')).has({ disabled: true }));
  },

  verifyDefaultPurchaseOrderLinesLimit(value) {
    cy.expect(purchaseOrderLinesLimit.has({ value }));
  },

  verifyPermanentFieldInfoMessage: (message) => {
    cy.do(
      Label('Permanent')
        .find(Button({ icon: 'info' }))
        .triggerClick(),
    );
    cy.expect(Popover({ content: including(message) }).exists());
    cy.do(
      Label('Permanent')
        .find(Button({ icon: 'info' }))
        .triggerClick(),
    );
    cy.expect(Popover({ content: including(message) }).absent());
  },

  verifyProductIdTypeDropdown: (...names) => {
    cy.do(Button('Add product ID and product ID type').click());
    cy.get('#item-details').find('button:contains("Accepted values"):last').click();
    names.forEach((name) => {
      cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).exists()]);
    });
  },

  verifyPurchaseOrderStatusInfoMessage: (message) => {
    cy.get('[name="profile.name"]').scrollIntoView();
    cy.do(
      Label('Purchase order status*')
        .find(IconButton({ icon: 'info' }))
        .click(),
    );
    cy.expect(Popover({ content: including(message) }).exists());
  },

  verifyElectronicalResourcesCreateInventoryInfoMessage: (message) => {
    cy.get('#accordion-toggle-button-location').scrollIntoView();
    cy.do(
      electronicResourceDetailsAccordion
        .find(Label('Create inventory').find(IconButton({ icon: 'info' })))
        .click(),
    );
    cy.expect(Popover({ content: including(message) }).exists());
  },

  verifyPhysicalResourceCreateInventoryInfoMessage: (message) => {
    cy.get('#accordion-toggle-button-location').scrollIntoView();
    cy.do(
      Accordion({ id: 'physical-resource-details' })
        .find(Label('Create inventory').find(IconButton({ icon: 'info' })))
        .click(),
    );
    cy.expect(Popover({ content: including(message) }).exists());
  },

  verifyPaymentStatusDropdownOptions: (...names) => {
    cy.get('#po-line-details')
      .find('label:contains("Payment status") + div button[aria-haspopup]')
      .click();
    names.forEach((name) => {
      cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).exists()]);
    });
    cy.get('#po-line-details')
      .find('label:contains("Payment status") + div button[aria-haspopup]')
      .click();
  },

  verifyFolioRecordTypeOptions: (options) => {
    options.forEach((option) => {
      cy.expect(recordTypeselect.has({ allOptionsText: including(option) }));
    });
  },

  selectPaymentStatusFromDropdown: (name) => {
    cy.get('#po-line-details')
      .find('label:contains("Payment status") + div button[aria-haspopup]')
      .click();
    cy.do(
      DropdownMenu({ visible: true })
        .find(Button(`${name}`))
        .click(),
    );
  },

  fillDiscountAmount: (amount) => {
    cy.do(TextField('Discount').fillIn(amount));
  },

  selectDiscountType: (type) => {
    cy.do(
      Accordion('Cost details')
        .find(Button(`${type}`))
        .click(),
    );
  },

  selectFundDistributionType: (type) => {
    cy.do(
      Accordion('Fund distribution')
        .find(Button(`${type}`))
        .click(),
    );
  },

  clickLinkProfileButton() {
    cy.do(linkProfileButton.click());
  },

  createInstanceMappingProfileForUpdateViaApi: (profile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: profile.name,
            incomingRecordType: 'MARC_BIBLIOGRAPHIC',
            existingRecordType: 'INSTANCE',
            description: '',
            mappingDetails: {
              name: 'instance',
              recordType: 'INSTANCE',
              mappingFields: [
                {
                  name: 'discoverySuppress',
                  enabled: true,
                  path: 'instance.discoverySuppress',
                  value: '',
                  subfields: [],
                },
                {
                  name: 'staffSuppress',
                  enabled: true,
                  path: 'instance.staffSuppress',
                  value: '',
                  subfields: [],
                },
                {
                  name: 'previouslyHeld',
                  enabled: true,
                  path: 'instance.previouslyHeld',
                  value: '',
                  subfields: [],
                },
                { name: 'hrid', enabled: false, path: 'instance.hrid', value: '', subfields: [] },
                {
                  name: 'source',
                  enabled: false,
                  path: 'instance.source',
                  value: '',
                  subfields: [],
                },
                {
                  name: 'catalogedDate',
                  enabled: true,
                  path: 'instance.catalogedDate',
                  value: profile.catalogedDate,
                  subfields: [],
                },
                {
                  name: 'statusId',
                  enabled: true,
                  path: 'instance.statusId',
                  value: `"${profile.statusTerm}"`,
                  subfields: [],
                  acceptedValues: { '52a2ff34-2a12-420d-8539-21aa8d3cf5d8': 'Batch Loaded' },
                },
                {
                  name: 'administrativeNotes',
                  enabled: true,
                  path: 'instance.administrativeNotes[]',
                  value: '',
                  subfields: [
                    {
                      order: 0,
                      path: 'instance.administrativeNotes[]',
                      fields: [
                        {
                          name: 'administrativeNote',
                          enabled: true,
                          path: 'instance.administrativeNotes[]',
                          value: `"${profile.administrativeNote}"`,
                        },
                      ],
                    },
                  ],
                  repeatableFieldAction: 'EXTEND_EXISTING',
                },
              ],
            },
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createHoldingsMappingProfileForUpdateViaApi: (profile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/mappingProfiles',
        body: {
          profile: {
            name: profile.name,
            incomingRecordType: 'MARC_BIBLIOGRAPHIC',
            existingRecordType: 'HOLDINGS',
            description: '',
            mappingDetails: {
              name: 'holdings',
              recordType: 'HOLDINGS',
              mappingFields: [
                {
                  name: 'administrativeNotes',
                  enabled: true,
                  path: 'holdings.administrativeNotes[]',
                  value: '',
                  subfields: [
                    {
                      order: 0,
                      path: 'holdings.administrativeNotes[]',
                      fields: [
                        {
                          name: 'administrativeNote',
                          enabled: true,
                          path: 'holdings.administrativeNotes[]',
                          value: `"${profile.adminNote}"`,
                        },
                      ],
                    },
                  ],
                  repeatableFieldAction: 'EXTEND_EXISTING',
                },
              ],
            },
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
};
