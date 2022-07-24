import { TextField, Button, Select, Checkbox, Modal } from '../../../../../interactors';
import modalSelectTransformations from './modalSelectTransformations';

const outputFormat = 'MARC';

const holdingsMarcField = '901';

const itemMarcField = '902';

const subfield = '$a';

const addTransformationsButton = Button('Add transformations');

export default {
  fillMappingProfile:(profileName) => {
    cy.do([TextField({ name:'name' }).fillIn(profileName),
      Select({ name:'outputFormat' }).choose(outputFormat),
      Checkbox('Source record storage (entire record)').click(),
      Checkbox('Holdings').click(),
      Checkbox('Item').click(),
      addTransformationsButton.click(),
    ]);
    modalSelectTransformations.searchItemTransformationsByName('Holdings - HRID');
    modalSelectTransformations.selectTransformations(holdingsMarcField, subfield);
    cy.do(addTransformationsButton.click());
    cy.expect(Modal('Select transformations').absent());
    modalSelectTransformations.searchItemTransformationsByName('Item - HRID');
    modalSelectTransformations.selectTransformations(itemMarcField, subfield);
    cy.do(Button('Save & close').click());
    cy.expect(Button('Save & close').absent());
  },
};
