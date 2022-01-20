import { TextField, Button, Select } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const folioRecordTypeValue = {
  instance: 'Instance',
  holdings: 'Holdings',
  item: 'Item',
};

const defaultInstanceMappingProfile = {
  name: `autotest_${folioRecordTypeValue.instance}${getRandomPostfix()}`,
  incomingRecordType: 'MARC Bibliographic',
  typeValue: folioRecordTypeValue.instance,
  catalogedDate: '###TODAY###',
  instanceStatusTerm: '"Batch Loaded"',
  statisticalCodes: 'Add these to existing',
  statisticalCode: '"ARL (Collection stats): books - Book, print (books)"'
};

const defaultHoldingsMappingProfile = {
  name: `autotest${folioRecordTypeValue.holdings}${getRandomPostfix()}`,
  incomingRecordType: 'MARC Bibliographic',
  typeValue: folioRecordTypeValue.holdings,
  permanentLocation: { value1: '"Annex (KU/CC/DI/A)"', value2: '"Online (E)"' },
  holdingsType: '"electronic"',
  callNumberType: '"Library of Congress classification"',
  callNnumber: '050$a " " 050$b',
  electronicAccess: 'Add these to existing',
  relationship: '"Resource"',
  uri: '856$u'
};

const defaultItemMappingProfile = {
  name: `autotest${folioRecordTypeValue.item}${getRandomPostfix()}`,
  incomingRecordType: 'MARC Bibliographic',
  typeValue: folioRecordTypeValue.item,
  materialType: { value1: '"book"', value2: '"electronic resource"' },
  itemNotes: 'Add these to existing',
  noteType: '"Electronic bookplate"',
  note: '"Smith Family Foundation"',
  staffOnly: 'Mark for all affected records',
  permanentLoanType: { value1: '"Can circulate"', value2: '"Can circulate"' },
  status: { value1: '"In process"', value2: '"Available"' }
};

export default {

  folioRecordTypeValue,

  fillInstanceMappingProfileForCreate:(specialMappingProfile = defaultInstanceMappingProfile) => {
    cy.do([
      TextField({ name: 'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name: 'profile.incomingRecordType' }).choose('MARC Bibliographic'),
      Select({ name: 'profile.existingRecordType' }).choose(specialMappingProfile.typeValue),
    ]);
    if ('isUpdate' in specialMappingProfile) {
      cy.do([
        TextField('Cataloged date').fillIn(specialMappingProfile.catalogedDate),
        TextField('Instance status term').fillIn(specialMappingProfile.instanceStatusTerm),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[8].repeatableFieldAction"]').select(specialMappingProfile.statisticalCodes);
      cy.do([
        Button('Add statistical code').click(),
        TextField('Statistical code').fillIn(specialMappingProfile.statisticalCode),
      ]);
    }
    cy.do(Button('Save as profile & Close').click());
  },

  fillHoldingsMappingProfileForCreate:(specialMappingProfile = defaultHoldingsMappingProfile) => {
    cy.do([
      TextField({ name: 'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name: 'profile.incomingRecordType' }).choose(specialMappingProfile.incomingRecordType),
      Select({ name: 'profile.existingRecordType' }).choose(specialMappingProfile.typeValue),
      TextField('Permanent').fillIn(specialMappingProfile.permanentLocation.value1),
    ]);
    if ('isUpdate' in specialMappingProfile) {
      cy.do([
        TextField('Permanent').fillIn(specialMappingProfile.permanentLocation.value2),
        TextField('Holdings type').fillIn(specialMappingProfile.holdingsType),
        TextField('Call number type').fillIn(specialMappingProfile.callNumberType),
        TextField('Call number').fillIn(specialMappingProfile.callNnumber),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[22].repeatableFieldAction"]').select(specialMappingProfile.electronicAccess);
      cy.do([
        Button('Add electronic access').click(),
        TextField('Relationship').fillIn(specialMappingProfile.relationship),
        TextField('URI').fillIn(specialMappingProfile.uri),
      ]);
    }
    cy.do(Button('Save as profile & Close').click());
  },

  fillItemMappingProfileForCreate:(specialMappingProfile = defaultItemMappingProfile) => {
    cy.do([
      TextField({ name: 'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name: 'profile.incomingRecordType' }).choose(specialMappingProfile.incomingRecordType),
      Select({ name: 'profile.existingRecordType' }).choose(specialMappingProfile.typeValue),
      TextField('Material type').fillIn(specialMappingProfile.materialType.value1),
      // TODO create waiter
      cy.wait(1500),
      TextField('Permanent loan type').fillIn(specialMappingProfile.permanentLoanType.value1),
      TextField('Status').fillIn(specialMappingProfile.status.value1),
    ]);
    if ('isUpdate' in specialMappingProfile) {
      cy.do([
        TextField('Material type').fillIn(specialMappingProfile.materialType.value2),
        TextField('Permanent loan type').fillIn(specialMappingProfile.permanentLoanType.value2),
        TextField('Status').fillIn(specialMappingProfile.status.value2),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[24].repeatableFieldAction"]').select(specialMappingProfile.itemNotes);
      cy.do([
        Button('Add item note').click(),
        TextField('Note type').fillIn(specialMappingProfile.noteType),
        TextField('Note').fillIn(specialMappingProfile.note),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[24].subfields[0].fields[2].booleanFieldAction"]').select(specialMappingProfile.staffOnly);
    }
    cy.do(Button('Save as profile & Close').click());
  },
};
