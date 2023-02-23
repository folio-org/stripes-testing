import { TextField, Button, Select, Checkbox, Modal, Accordion } from '../../../../../interactors';
import modalSelectTransformations from './modalSelectTransformations';

const outputFormat = 'MARC';
const holdingsMarcField = '901';
const itemMarcField = '902';
const subfield = '$a';

const addTransformationsButton = Button('Add transformations');
const fieldName = TextField({ name:'name' });
const outputFormatSelect = Select({ name:'outputFormat' });
const sourceCheckbox = Checkbox('Source record storage (entire record)');
const itemCheckbox = Checkbox('Item');

export default {
  fillMappingProfile:(profileName) => {
    cy.do([
      fieldName.fillIn(profileName),
      outputFormatSelect.choose(outputFormat),
      sourceCheckbox.click(),
      Checkbox('Holdings').click(),
      itemCheckbox.click(),
      addTransformationsButton.click()
    ]);
    modalSelectTransformations.searchItemTransformationsByName('Holdings - HRID');
    modalSelectTransformations.selectTransformations(holdingsMarcField, subfield);
    cy.do(addTransformationsButton.click());
    cy.expect(Modal('Select transformations').absent());
    modalSelectTransformations.searchItemTransformationsByName('Item - HRID');
    modalSelectTransformations.selectTransformations(itemMarcField, subfield);
  },

  fillMappingProfileForItemHrid:(profileName) => {
    cy.do([
      fieldName.fillIn(profileName),
      outputFormatSelect.choose(outputFormat),
      sourceCheckbox.click(),
      itemCheckbox.click(),
      addTransformationsButton.click()
    ]);
    modalSelectTransformations.searchItemTransformationsByName('Item - HRID');
    modalSelectTransformations.selectTransformations(itemMarcField, subfield);
  },

  createFieldMappingProfileViaApi: (nameProfile) => {
    return cy.okapiRequest({
        method: 'POST',
        path: 'data-export/mapping-profiles',
        body: {
            transformations: [],
            recordTypes: ['SRS'],
            outputFormat: 'MARC',
            name: nameProfile
        },
        isDefaultSearchParamsRequired: false,
    }).then(({ response }) => { return response; });
},
createFieldMappingProfile(name, recordType) {
    cy.do([
        Button('New').click(),
        TextField('Name*').fillIn(name),
        Checkbox(recordType).click(),
        Accordion('Transformations').find(Button('Add transformations')).click(),
    ])
},
};
