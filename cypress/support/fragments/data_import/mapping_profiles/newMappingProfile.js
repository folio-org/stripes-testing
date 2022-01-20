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

export default {
  fillInstanceMappingProfileForCreate:(specialMappingProfile = defaultInstanceMappingProfile) => {
    cy.do([
      TextField({ name: 'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name: 'profile.incomingRecordType' }).choose(specialMappingProfile.incomingRecordType),
      Select({ name: 'profile.existingRecordType' }).choose(specialMappingProfile.typeValue),
    ]);
    if (specialMappingProfile.isUpdate in specialMappingProfile) {
      cy.do([
        TextField('Cataloged date').fillIn(specialMappingProfile.catalogedDate),
        TextField('Instance status term').fillIn(specialMappingProfile.instanceStatusTerm),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[8].repeatableFieldAction"]').select('"Add these to existing"');
      cy.do([
        Button('Add statistical code').click(),
        TextField('Statistical code').fillIn(specialMappingProfile.statisticalCode),
      ]);
    }
    cy.do(Button('Save as profile & Close').click());
  },
};
