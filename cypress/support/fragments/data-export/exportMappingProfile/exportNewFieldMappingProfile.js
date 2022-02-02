import { TextField, Button, Select, Checkbox } from '../../../../../interactors';
import modalSelectTransformations from './modalSelectTransformations';

const outputFormat = 'MARC';

const defaultMappingProfile = {
  name: '',
  outputFormat: 'MARC',
  folioRecordType: '',
};

const addTransformationsButton = Button('Add transformations');

export default {
  fillMappingProfile:(specialMappingProfile = defaultMappingProfile) => {
    cy.do([TextField({ name:'name' }).fillIn(specialMappingProfile.name),
      Select({ name:'outputFormat' }).choose(outputFormat),
      Checkbox('Source record storage (entire record)').click(),
      Checkbox('Holdings').click(),
      Checkbox('Item').click(),
      addTransformationsButton.click(),
    ]);
    modalSelectTransformations.searchItemTransformationsByName('Holdings - HRID');
    modalSelectTransformations.selectHoldingsTransformations();
    cy.do(addTransformationsButton.click());
    modalSelectTransformations.searchItemTransformationsByName('Item - HRID');
    modalSelectTransformations.selectItemTransformations();
    cy.do(Button('Save & close').click());
    cy.expect(Button('Save & close').absent());
  },
};
