import { TextField, Button, Select } from '../../../../../interactors';

const profileName = {
  instanceName: 'Instance',
  holdingsName: 'Holdings',
  itemName: 'Item',
};

const incomingRecordTypeValue = {
  marcBib: 'MARC Bibliographic',
};

const folioRecordTypeValue = {
  instance: 'Instance',
  holdings: 'Holdings',
  item: 'Item',
};

const permanentLocation = {
  location: '"Annex (KU/CC/DI/A)"',
};

const materialType = {
  materialType: '"book"',
};

const permanentLoanType = {
  type: '"Can circulate"',
};

const statusField = {
  status: '"In process"',
};

const defaultMappingProfile = {
  name: 'autotest FAT-742: ' + profileName.instanceName + ' mapping profile',
  typeValue: folioRecordTypeValue.instance,
  location: permanentLocation,
  material: materialType,
  loan: permanentLoanType,
  status: statusField,
};

export default {
  folioRecordTypeValue,

  permanentLocation,

  materialType,

  permanentLoanType,

  statusField,

  fillMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(incomingRecordTypeValue.marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === 'Holdings') {
      cy.do([
        TextField('Permanent').fillIn(specialMappingProfile.location),
        Button('Save as profile & Close').click(),
      ]);
    } else if (specialMappingProfile.typeValue === 'Item') {
      cy.do([
        TextField('Material type').fillIn(specialMappingProfile.material),
        // TODO create waiter
        cy.wait(5000),
        TextField('Permanent loan type').fillIn(specialMappingProfile.loan),
        TextField('Status').fillIn(specialMappingProfile.status),
        Button('Save as profile & Close').click(),
      ]);
    } else {
      cy.do(Button('Save as profile & Close').click());
    }
  }
};
