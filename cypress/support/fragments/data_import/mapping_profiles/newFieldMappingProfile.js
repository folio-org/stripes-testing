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
  SearchField
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const saveButton = Button('Save as profile & Close');
const organizationModal = Modal('Select Organization');
const adminNoteFieldName = 'profile.mappingDetails.mappingFields[9].repeatableFieldAction';
const marcBib = 'MARC Bibliographic';
const incomingRecordType = {
  marcBib: 'MARC Bibliographic',
  edifact: 'EDIFACT invoice',
};
const folioRecordTypeValue = {
  instance: 'Instance',
  holdings: 'Holdings',
  item: 'Item',
  invoice: 'Invoice',
  marcBib: 'MARC Bibliographic'
};
const organization = {
  gobiLibrary: 'GOBI Library Solutions',
  harrassowitz: 'Otto Harrassowitz GmbH & Co. KG',
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
const instanceStatusTerm = '"Batch Loaded"';
const defaultMappingProfile = {
  name: `autotest${folioRecordTypeValue.instance}${getRandomPostfix()}`,
  typeValue: folioRecordTypeValue.instance,
  location: permanentLocation,
  material: materialType,
  loan: permanentLoanType,
  statusField: status,
  fillProfile:''
};

const fieldMappingsForMarc = {
  update: 'Updates',
  modify: 'Modifications'
};

const selectOrganizationByName = (organizationName) => {
  cy.do([
    organizationModal.find(TextField({ id: 'input-record-search' })).fillIn(organizationName),
    organizationModal.find(Button('Search')).click(),
    organizationModal.find(HTML(including('1 record found'))).exists(),
    MultiColumnListCell(organizationName).click({ row: 0, columnIndex: 0 }),
  ]);
};

const selectFromResultsList = (rowNumber = 0) => {
  cy.do(organizationModal.find(MultiColumnListRow({ index: rowNumber })).click());
};

export default {
  folioRecordTypeValue,
  permanentLocation,
  materialType,
  permanentLoanType,
  statusField: status,
  organization,
  instanceStatusTerm,
  catalogedDate,
  selectFromResultsList,

  fillMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === holdingsType) {
      if (specialMappingProfile.permanentLocation) {
        cy.do(TextField('Permanent').fillIn(specialMappingProfile.permanentLocation));
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
      cy.do(TextField('Material type').fillIn(materialType));
      cy.do(TextField('Permanent loan type').fillIn(permanentLoanType));
      cy.wait('@getType');
      // wait accepted values to be filled
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1800);
      cy.do(TextField('Status').fillIn(status));
    } else if (specialMappingProfile.typeValue === folioRecordTypeValue.instance) {
      if ('update' in specialMappingProfile) {
        cy.do([
          TextField('Cataloged date').fillIn(catalogedDate),
          TextField('Instance status term').fillIn(instanceStatusTerm),
        ]);
        // wait accepted values to be filled
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1800);
      } else {
        cy.do(TextField('Cataloged date').fillIn(catalogedDate));
      }
    }
    cy.do(saveButton.click());
  },

  fillMappingProfileForUpdate:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    specialMappingProfile.fillProfile();
    cy.do(saveButton.click());
    cy.expect(saveButton.absent());
  },

  fillMappingProfileForInvoice:(specialMappingProfileName = defaultMappingProfile.name, organizationName) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfileName),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.edifact),
      Select({ name:'profile.existingRecordType' }).choose(folioRecordTypeValue.invoice),
      TextArea({ name:'profile.description' }).fillIn(''),
      TextField('Batch group*').fillIn('"FOLIO"'),
      Button('Organization look-up').click()
    ]);
    selectOrganizationByName(organizationName);
    cy.do([
      TextField('Payment method*').fillIn('"Cash"'),
      saveButton.click(),
    ]);
  },

  fillMappingProfileForMatch:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === holdingsType) {
      cy.do(TextField('Holdings type').fillIn('"Monograph"'));
      // wait accepted values to be filled
      cy.wait(1500);
      cy.do(TextField('Permanent').fillIn('980$a'));
      cy.do(TextField('Call number type').fillIn('"Library of Congress classification"'));
      // wait accepted values to be filled
      cy.wait(1500);
      cy.do(TextField('Call number').fillIn('980$b " " 980$c'));
    } else if (specialMappingProfile.typeValue === itemType) {
      cy.do(TextField('Barcode').fillIn('981$b'));
      cy.do(TextField('Copy number').fillIn('981$b'));
      cy.do(TextField('Status').fillIn(status));
    } else if (specialMappingProfile.typeValue === folioRecordTypeValue.instance) {
      if ('update' in specialMappingProfile) {
        cy.do([
          TextField('Cataloged date').fillIn(catalogedDate),
          TextField('Instance status term').fillIn(instanceStatusTerm),
        ]);
        // wait accepted values to be filled
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1800);
      }
    }
    cy.do(saveButton.click());
  },

  fillMappingProfileForUpdatesMarc:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue),
      Select({ name:'profile.mappingDetails.marcMappingOption' }).choose(fieldMappingsForMarc.update),
    ]);
  },

  fillSummaryInMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue),
    ]);
  },

  addStatisticalCode:(name) => {
    cy.do(Select({ name:'profile.mappingDetails.mappingFields[8].repeatableFieldAction' }).choose(actions.addTheseToExisting));
    cy.do(Button('Add statistical code').click());
    cy.do(TextField('Statistical code').fillIn(name));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  addAdministrativeNote:(note) => {
    cy.do(Select({ name: adminNoteFieldName }).choose('Add these to existing'));
    cy.do(Button('Add administrative note').click());
    cy.do(TextField('Administrative note').fillIn(note));
  },

  addElectronicAccess:(relationship, uri, linkText = '') => {
    cy.do([
      Select({ name:'profile.mappingDetails.mappingFields[23].repeatableFieldAction' }).choose(actions.addTheseToExisting),
      Button('Add electronic access').click(),
      TextField('Relationship').fillIn(relationship),
      TextField('URI').fillIn(uri),
      TextField('Link text').fillIn(linkText),
    ]);
  },

  addName:(name) => {
    cy.do(TextField({ name:'profile.name' }).fillIn(name));
  },

  addIncomingRecordType:(type) => {
    cy.do(Select({ name:'profile.incomingRecordType' }).choose(type));
  },

  addFolioRecordType:(folioType) => {
    cy.do(Select({ name:'profile.existingRecordType' }).choose(folioType));
  },

  saveProfile:() => {
    cy.do(saveButton.click());
  },

  fillCatalogedDate:() => {
    cy.do(TextField('Cataloged date').fillIn(catalogedDate));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillInstanceStatusTerm:(statusTerm = instanceStatusTerm) => {
    cy.do(TextField('Instance status term').fillIn(statusTerm));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  // fill fields of holdings mapping profile
  fillHoldingsType:(type) => {
    cy.do(TextField('Holdings type').fillIn(type));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillPermanentLocation:(location) => {
    cy.do(TextField('Permanent').fillIn(location));
  },

  fillCallNumberType:(type) => {
    cy.do(TextField('Call number type').fillIn(type));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillCallNumber:(number) => {
    cy.do(TextField('Call number').fillIn(number));
  },

  fillBarcode:(barcode) => {
    cy.do(TextField('Barcode').fillIn(barcode));
  },

  fillCopyNumber:(number) => {
    cy.do(TextField('Copy number').fillIn(number));
  },

  fillStatus:(itemStatus) => {
    cy.do(TextField('Status').fillIn(itemStatus));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillPermanentLoanType:(loanType) => {
    cy.do(TextField('Permanent loan type').fillIn(loanType));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillMaterialType:(type = materialType) => {
    cy.do(TextField('Material type').fillIn(type));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  addItemNotes:(noteType, note, staffOnly) => {
    cy.do(Select({ name:'profile.mappingDetails.mappingFields[25].repeatableFieldAction' }).choose(actions.addTheseToExisting));
    cy.do(Button('Add item note').click());
    cy.do(TextField('Note type').fillIn(noteType));
    cy.do(TextField('Note').fillIn(note));
    cy.do(Select({ name:'profile.mappingDetails.mappingFields[25].subfields[0].fields[2].booleanFieldAction' }).choose(staffOnly));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  addSuppressFromDiscovery:() => {
    cy.do(Select({ name:'profile.mappingDetails.mappingFields[0].booleanFieldAction' }).choose('Mark for all affected records'));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillBatchGroup:(group) => {
    cy.do(TextField('Batch group*').fillIn(group));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillVendorInvoiceNumber:(number) => {
    cy.do(TextField('Vendor invoice number*').fillIn(number));
  },

  fillPaymentMethod:(method) => {
    cy.do(TextField('Payment method*').fillIn(method));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillCurrency:(currency) => {
    cy.do(TextField('Currency*').fillIn(currency));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillDescription:(text) => {
    cy.do(TextField('Description*').fillIn(text));
  },

  fillQuantity:(quantity) => {
    cy.do(TextField('Quantity*').fillIn(quantity));
  },

  fillSubTotal:(number) => {
    cy.do(TextField('Sub-total*').fillIn(number));
  },

  fillVendorName:(vendorName) => {
    cy.do(Button('Organization look-up').click());
    cy.do(SearchField({ id: 'input-record-search' }).fillIn(vendorName));
    cy.do(Button('Search').click());
    selectFromResultsList();
  },

  fillInvoiceDate:(date) => {
    cy.do(TextField('Invoice date*').fillIn(date));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
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
  }
};
