import { TextField, Button, Select, TextArea, Modal, HTML, including, MultiColumnListCell } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const saveButton = Button('Save as profile & Close');
const organizationModal = Modal('Select Organization');

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

const permanentLocation = {
  annex: '"Annex (KU/CC/DI/A)"',
  _980$a: '980$a'
};

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
  location: permanentLocation.annex,
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

export default {
  folioRecordTypeValue,
  permanentLocation,
  materialType,
  permanentLoanType,
  statusField: status,
  organization,
  instanceStatusTerm,
  catalogedDate,

  fillMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === holdingsType) {
      if (specialMappingProfile.permanentLocation) {
        cy.do(TextField('Permanent').fillIn(specialMappingProfile.permanentLocation.annex));
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

  fillInstanceMappingProfile() {
    cy.do([
      TextField('Cataloged date').fillIn(catalogedDate),
      TextField('Instance status term').fillIn(instanceStatusTerm)]);
    cy.get('[name="profile.mappingDetails.mappingFields[8].repeatableFieldAction"]').select('Add these to existing');
    // wait for data to be loaded
    cy.intercept('/statistical-code-types?*').as('getTypes');
    cy.do(Button('Add statistical code').click());
    cy.wait('@getTypes');
    cy.do(TextField('Statistical code').fillIn('"ARL (Collection stats): books - Book, print (books)"'));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  fillHoldingsMappingProfile() {
    // wait for data to be loaded
    cy.intercept('/locations?*').as('getField');
    cy.do(TextField('Permanent').fillIn('"Online (E)"'));
    cy.wait('@getField');
    cy.do(TextField('Holdings type').fillIn('"Electronic"'));
    cy.do(TextField('Call number type').fillIn('"Library of Congress classification"'));
    cy.do(TextField('Call number').fillIn('050$a " " 050$b'));
    cy.get('[name="profile.mappingDetails.mappingFields[23].repeatableFieldAction"]').select('Add these to existing');
    cy.do(Button('Add electronic access').click());
    cy.do(TextField('Relationship').fillIn('"Resource"'));
    cy.do(TextField('URI').fillIn('856$u'));
  },

  fillItemMappingProfile() {
    // wait for data to be loaded
    cy.intercept('/loan-types?*').as('getType');
    cy.wait('@getType');
    cy.do(TextField('Material type').fillIn('"electronic resource"'));
    cy.do(TextField('Permanent loan type').fillIn(permanentLoanType));
    cy.do(TextField('Status').fillIn('"Available"'));
    cy.get('[name="profile.mappingDetails.mappingFields[25].repeatableFieldAction"]').select('Add these to existing');
    // wait for data to be loaded
    cy.intercept('/item-note-types?*').as('getType');
    cy.do(Button('Add item note').click());
    cy.wait('@getType');
    cy.do(TextField('Note type').fillIn('"Electronic bookplate"'));
    cy.do(TextField('Note').fillIn('"Smith Family Foundation"'));
    cy.get('[name="profile.mappingDetails.mappingFields[25].subfields[0].fields[2].booleanFieldAction"]').select('Mark for all affected records');
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

  fillModifyMappingProfile(specialMappingProfileName = defaultMappingProfile.name, properties) {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfileName),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(marcBib),
      Select({ name:'profile.mappingDetails.marcMappingOption' }).choose(properties.marcMappingOption),
      Select({ name:'profile.mappingDetails.marcMappingDetails[0].action' }).choose(properties.action),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.field' }).fillIn(properties.addFieldNumber),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subfield' }).fillIn(properties.subfieldInFirstField),
      Select({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subaction' }).choose(properties.subaction),
      TextArea({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].data.text' }).fillIn(properties.subfieldTextInFirstField),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].subfield' }).fillIn(properties.subfieldInSecondField),
      TextArea({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].data.text' }).fillIn(properties.subfieldTextInSecondField),
      saveButton.click(),
    ]);
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
    cy.do(Select({ name:'profile.mappingDetails.mappingFields[8].repeatableFieldAction' }).choose('Add these to existing'));
    cy.do(Button('Add statistical code').click());
    cy.do(TextField('Statistical code').fillIn(name));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  addNote:(note) => {
    cy.do(Select({ name:'profile.mappingDetails.mappingFields[9].repeatableFieldAction' }).choose('Add these to existing'));
    cy.do(Button('Add administrative note').click());
    cy.do(TextField('Administrative note').fillIn(note));
  },

<<<<<<< HEAD
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
=======
  // fill fields of instance mapping profile
  fillCatalogedDate:() => {
    cy.do(TextField('Cataloged date').fillIn(catalogedDate));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  fillInstanceStatusTerm:() => {
    cy.do(TextField('Instance status term').fillIn(instanceStatusTerm));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  // fill fields of holdings mapping profile
  fillHoldingsType:(type) => {
    cy.do(TextField('Holdings type').fillIn(type));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  fillPermanentLocation:(location) => {
    cy.do(TextField('Permanent').fillIn(location));
  },

  fillCallNumberType:(type) => {
    cy.do(TextField('Call number type').fillIn(type));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  fillCallNumber:(number) => {
    cy.do(TextField('Call number').fillIn(number));
  },

  // fill fields of item mapping profile
  fillBarcode:(barcode) => {
    cy.do(TextField('Barcode').fillIn(barcode));
  },

  fillCopyNumber:(number) => {
    cy.do(TextField('Copy number').fillIn(number));
  },

  fillStatus:(itemStatus) => {
    cy.do(TextField('Status').fillIn(itemStatus));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  fillPermanentLoanType:(loanType) => {
    cy.do(TextField('Permanent loan type').fillIn(loanType));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
  },

  fillMaterialType:() => {
    cy.do(TextField('Material type').fillIn(materialType));
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
>>>>>>> 3a5287a31b96149cc130d84548b123fec1c2f226
  }
};
