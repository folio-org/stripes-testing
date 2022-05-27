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
};

const organization = {
  gobiLibrary: 'GOBI Library Solutions',
  harrassowitz: 'Otto Harrassowitz GmbH & Co. KG',
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

  fillMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordType.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === holdingsType) {
      cy.do(TextField('Permanent').fillIn(permanentLocation));
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
};
