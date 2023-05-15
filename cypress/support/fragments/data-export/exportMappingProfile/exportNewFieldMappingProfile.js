import { TextField, Button, Select, Checkbox, Modal, Accordion } from '../../../../../interactors';
import modalSelectTransformations from './modalSelectTransformations';

const outputFormat = 'MARC';
const transformations = {
  holdingsHrid: 'Holdings - HRID',
  itemHrid: 'Item - HRID',
  itemId: 'Item - ID'
};

const addTransformationsButton = Button('Add transformations');
const fieldName = TextField({ name:'name' });
const outputFormatSelect = Select({ name:'outputFormat' });
const sourceCheckbox = Checkbox('Source record storage (entire record)');
const itemCheckbox = Checkbox('Item');

export default {
  fillMappingProfile:(profile) => {
    cy.do([
      fieldName.fillIn(profile.name),
      outputFormatSelect.choose(outputFormat),
      sourceCheckbox.click(),
      Checkbox('Holdings').click(),
      itemCheckbox.click(),
      addTransformationsButton.click()
    ]);
    modalSelectTransformations.searchItemTransformationsByName(profile.holdingsTransformation);
    modalSelectTransformations.selectTransformations(profile.holdingsMarcField, profile.subfieldForHoldings);
    cy.do(addTransformationsButton.click());
    cy.expect(Modal('Select transformations').absent());
    modalSelectTransformations.searchItemTransformationsByName(profile.itemTransformation);
    modalSelectTransformations.selectTransformations(profile.itemMarcField, profile.subfieldForItem);
  },

  fillMappingProfileForItemHrid:(profileName, itemMarcField = '902', subfield = '$a') => {
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

  createNewFieldMappingProfileViaApi: (nameProfile) => {
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
  createNewFieldMappingProfile(name, recordType) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(name),
      Checkbox(recordType).click(),
      Accordion('Transformations').find(Button('Add transformations')).click(),
    ]);
  },
};
