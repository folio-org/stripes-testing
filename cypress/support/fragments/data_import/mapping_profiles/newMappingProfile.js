import { TextField, Button, Select } from '../../../../../interactors';
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
      cy.do([
        TextField('Material type').fillIn(materialType),
        // TODO create waiter
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1200),
        TextField('Permanent loan type').fillIn(permanentLoanType),
        TextField('Status').fillIn(status),
      ]);
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

  fillMappingProfileForUpdate:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
      Select({ name:'profile.incomingRecordType' }).choose(marcBib),
      Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
    ]);
    if (specialMappingProfile.typeValue === folioRecordTypeValue.instance) {
      cy.do([
        TextField('Cataloged date').fillIn(catalogedDate),
        TextField('Instance status term').fillIn(instanceStatusTerm)]);
      cy.get('[name="profile.mappingDetails.mappingFields[8].repeatableFieldAction"]').select('Add these to existing');
      cy.do([
        Button('Add statistical code').click(),
        TextField('Statistical code').fillIn('"Serial status: ASER - Active serial"'),
      ]);
    } else if (specialMappingProfile.typeValue === holdingsType) {
      cy.do([TextField('Permanent').fillIn('"Online (E)"'),
        TextField('Holdings type').fillIn('"electronic"'),
        TextField('Call number type').fillIn('"Library of Congress classification"'),
        TextField('Call number').fillIn('050$a " " 050$b'),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[22].repeatableFieldAction"]').select('Add these to existing');
      cy.do([
        Button('Add electronic access').click(),
        TextField('Relationship').fillIn('"Resource"'),
        TextField('URI').fillIn('856$u'),
      ]);
    } else if (specialMappingProfile.typeValue === itemType) {
      cy.do([
        TextField('Material type').fillIn('"electronic resource"'),
        TextField('Permanent loan type').fillIn('"Can circulate"'),
        TextField('Status').fillIn('"Available"'),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[24].repeatableFieldAction"]').select('Add these to existing');
      cy.do([
        Button('Add item note').click(),
        TextField('Note type').fillIn('"Electronic bookplate"'),
        TextField('Note').fillIn('"Smith Family Foundation"'),
      ]);
      cy.get('[name="profile.mappingDetails.mappingFields[24].subfields[0].fields[2].booleanFieldAction"]').select('Mark for all affected records');
    }
    cy.do(Button('Save as profile & Close').click());
  }
};
