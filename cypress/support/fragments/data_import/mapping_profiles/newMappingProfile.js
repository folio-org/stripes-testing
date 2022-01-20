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
  statisticalCode: '"ARL (Collection stats): books - Book, print (books)"',
  isUpdate: true
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

  fillInstanceMappingProfileForCreate:(specialInstanceMappingProfile = defaultInstanceMappingProfile) => {
    cy.do([
      TextField({ name: 'profile.name' }).fillIn(specialInstanceMappingProfile.name),
      Select({ name: 'profile.incomingRecordType' }).choose(specialInstanceMappingProfile.incomingRecordType),
      Select({ name: 'profile.existingRecordType' }).choose(specialInstanceMappingProfile.typeValue),
    ]);
    if ('isUpdate' in specialInstanceMappingProfile) {
      cy.do([
        TextField('Cataloged date').fillIn(specialInstanceMappingProfile.catalogedDate),
        TextField('Instance status term').fillIn(specialInstanceMappingProfile.instanceStatusTerm),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[8].repeatableFieldAction"]').select(specialInstanceMappingProfile.statisticalCodes);
      cy.do([
        Button('Add statistical code').click(),
        TextField('Statistical code').fillIn(specialInstanceMappingProfile.statisticalCode),
      ]);
    }
    cy.do(Button('Save as profile & Close').click());
  },

  fillHoldingsMappingProfileForCreate:(specialHoldingsMappingProfile = defaultHoldingsMappingProfile) => {
    cy.do([
      TextField({ name: 'profile.name' }).fillIn(specialHoldingsMappingProfile.name),
      Select({ name: 'profile.incomingRecordType' }).choose(specialHoldingsMappingProfile.incomingRecordType),
      Select({ name: 'profile.existingRecordType' }).choose(specialHoldingsMappingProfile.typeValue),
      TextField('Permanent').fillIn(specialHoldingsMappingProfile.permanentLocation.value1),
    ]);
    if ('isUpdate' in specialHoldingsMappingProfile) {
      cy.do([
        TextField('Permanent').fillIn(specialHoldingsMappingProfile.permanentLocation.value2),
        TextField('Holdings type').fillIn(specialHoldingsMappingProfile.holdingsType),
        TextField('Call number type').fillIn(specialHoldingsMappingProfile.callNumberType),
        TextField('Call number').fillIn(specialHoldingsMappingProfile.callNnumber),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[22].repeatableFieldAction"]').select(specialHoldingsMappingProfile.electronicAccess);
      cy.do([
        Button('Add electronic access').click(),
        TextField('Relationship').fillIn(specialHoldingsMappingProfile.relationship),
        TextField('URI').fillIn(specialHoldingsMappingProfile.uri),
      ]);
    }
    cy.do(Button('Save as profile & Close').click());
  },

  fillItemMappingProfileForCreate:(specialItemMappingProfile = defaultItemMappingProfile) => {
    cy.do([
      TextField({ name: 'profile.name' }).fillIn(specialItemMappingProfile.name),
      Select({ name: 'profile.incomingRecordType' }).choose(specialItemMappingProfile.incomingRecordType),
      Select({ name: 'profile.existingRecordType' }).choose(specialItemMappingProfile.typeValue),
      TextField('Material type').fillIn(specialItemMappingProfile.materialType.value1),
      // TODO create waiter
      cy.wait(1500),
      TextField('Permanent loan type').fillIn(specialItemMappingProfile.permanentLoanType.value1),
      TextField('Status').fillIn(specialItemMappingProfile.status.value1),
    ]);
    if ('isUpdate' in specialItemMappingProfile) {
      cy.do([
        TextField('Material type').fillIn(specialItemMappingProfile.materialType.value2),
        TextField('Permanent loan type').fillIn(specialItemMappingProfile.permanentLoanType.value2),
        TextField('Status').fillIn(specialItemMappingProfile.status.value2),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[24].repeatableFieldAction"]').select(specialItemMappingProfile.itemNotes);
      cy.do([
        Button('Add item note').click(),
        TextField('Note type').fillIn(specialItemMappingProfile.noteType),
        TextField('Note').fillIn(specialItemMappingProfile.note),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[24].subfields[0].fields[2].booleanFieldAction"]').select(specialItemMappingProfile.staffOnly);
    }
    cy.do(Button('Save as profile & Close').click());
  },
};
