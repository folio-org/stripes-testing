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
        cy.wait(1500),
        TextField('Permanent loan type').fillIn(permanentLoanType),
        TextField('Status').fillIn(status),
      ]);
    }
    cy.do(Button('Save as profile & Close').click());
  }
};
