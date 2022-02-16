import { TextField, Button, Select, TextArea } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const marcBib = 'MARC Bibliographic';

const folioRecordTypeValue = {
  instance: 'Instance',
  holdings: 'Holdings',
  item: 'Item',
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

const mappingProfileFieldsForModify = {
  marcMappingOption: 'Modifications',
  action: 'Add',
  addFieldNumber: '947',
  subfieldInFirstField: 'a',
  subaction: 'Add subfield',
  subfieldTextInFirstField: 'Test',
  subfieldInSecondField: 'b',
  subfieldTextInSecondField: 'Addition',
};

export default {
  folioRecordTypeValue,

  permanentLocation,

  materialType,

  permanentLoanType,

  statusField: status,

  fillMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === holdingsType) {
      cy.do(TextField('Permanent').fillIn(permanentLocation));
    } else if (specialMappingProfile.typeValue === itemType) {
      cy.intercept(
        {
          method: 'GET',
          url: 'loan-types?*',
        }
      ).as('getType');
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
    cy.do(Button('Save as profile & Close').click());
  },

  fillInstanceMappingProfile() {
    cy.do([
      TextField('Cataloged date').fillIn(catalogedDate),
      TextField('Instance status term').fillIn(instanceStatusTerm)]);
    cy.get('[name="profile.mappingDetails.mappingFields[8].repeatableFieldAction"]').select('Add these to existing');
    // wait for data to be loaded
    cy.intercept(
      {
        method: 'GET',
        url: '/statistical-code-types?*',
      }
    ).as('getTypes');
    cy.do(Button('Add statistical code').click());
    cy.wait('@getTypes');
    cy.do(TextField('Statistical code').fillIn('"ARL (Collection stats): books - Book, print (books)"'));
  },

  fillHoldingsMappingProfile() {
    // wait for data to be loaded
    cy.intercept(
      {
        method: 'GET',
        url: '/locations?*',
      }
    ).as('getField');
    cy.do(TextField('Permanent').fillIn('"Online (E)"'));
    cy.wait('@getField');
    cy.do(TextField('Holdings type').fillIn('"Electronic"'));
    cy.do(TextField('Call number type').fillIn('"Library of Congress classification"'));
    cy.do(TextField('Call number').fillIn('050$a " " 050$b'));
    cy.get('[name="profile.mappingDetails.mappingFields[22].repeatableFieldAction"]').select('Add these to existing');
    cy.do(Button('Add electronic access').click());
    cy.do(TextField('Relationship').fillIn('"Resource"'));
    cy.do(TextField('URI').fillIn('856$u'));
  },

  fillItemMappingProfile() {
    // wait for data to be loaded
    cy.intercept(
      {
        method: 'GET',
        url: '/loan-types?*',
      }
    ).as('getType');
    cy.wait('@getType');
    cy.do(TextField('Material type').fillIn('"electronic resource"'));
    cy.do(TextField('Permanent loan type').fillIn(permanentLoanType));
    cy.do(TextField('Status').fillIn('"Available"'));
    cy.get('[name="profile.mappingDetails.mappingFields[24].repeatableFieldAction"]').select('Add these to existing');
    // wait for data to be loaded
    cy.intercept(
      {
        method: 'GET',
        url: '/item-note-types?*',
      }
    ).as('getType');
    cy.do(Button('Add item note').click());
    cy.wait('@getType');
    cy.do(TextField('Note type').fillIn('"Electronic bookplate"'));
    cy.do(TextField('Note').fillIn('"Smith Family Foundation"'));
    cy.get('[name="profile.mappingDetails.mappingFields[24].subfields[0].fields[2].booleanFieldAction"]').select('Mark for all affected records');
  },

  fillMappingProfileForUpdate:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    specialMappingProfile.fillProfile();
    cy.do(Button('Save as profile & Close').click());
    cy.expect(Button('Save as profile & Close').absent());
  },

  fillModifyMappingProfile(specialMappingProfile = defaultMappingProfile, properties = mappingProfileFieldsForModify) {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(marcBib),
      Select({ name:'profile.existingRecordType' }).choose(marcBib),
      Select({ name:'profile.mappingDetails.marcMappingOption' }).choose(properties.marcMappingOption),
      Select({ name:'profile.mappingDetails.marcMappingDetails[0].action' }).choose(properties.action),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.field' }).fillIn(properties.addFieldNumber),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subfield' }).fillIn(properties.subfieldInFirstField),
      Select({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].subaction' }).choose(properties.subaction),
      TextArea({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[0].data.text' }).fillIn(properties.subfieldTextInFirstField),
      TextField({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].subfield' }).fillIn(properties.subfieldInSecondField),
      TextArea({ name:'profile.mappingDetails.marcMappingDetails[0].field.subfields[1].data.text' }).fillIn(properties.subfieldTextInSecondField),
      Button('Save as profile & Close').click(),
    ]);
    cy.expect(Button('Save as profile & Close').absent());
  },
};
