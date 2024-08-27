import {
  TextField,
  Button,
  Select,
  Checkbox,
  Modal,
  Accordion,
  MultiColumnList,
  MultiColumnListCell,
  Option,
  TextArea,
  HTML,
} from '../../../../../interactors';
import modalSelectTransformations from './modalSelectTransformations';
import { EXPORT_TRANSFORMATION_NAMES } from '../../../constants';

const outputFormat = 'MARC';

const addTransformationsButton = Button('Add transformations');
const fieldName = TextField({ name: 'name' });
const outputFormatSelect = Select({ name: 'outputFormat' });
const newButton = Button('New');
const fieldsSuppressionTextArea = TextArea('Fields suppression');
const saveAndCloseButton = Button('Save & close');
const transformationsAccordion = Accordion('Transformations');

export const CHECKBOX_NAMES = {
  SRS: 'Source record storage (entire record)',
  INVENTORY_INSTANCE: 'Inventory instance (selected fields)',
  HOLDINGS: 'Holdings',
  ITEM: 'Item',
  SUPPRESS_999_FF: 'Suppress 999 ff',
};

const fillInName = (name) => {
  cy.do(fieldName.fillIn(name));
};

export default {
  fillInName,
  fillMappingProfile: (profile) => {
    fillInName(profile.name);
    cy.do([
      fieldName.fillIn(profile.name),
      outputFormatSelect.choose(outputFormat),
      Checkbox(CHECKBOX_NAMES.SRS).click(),
      Checkbox(CHECKBOX_NAMES.HOLDINGS).click(),
      Checkbox(CHECKBOX_NAMES.ITEM).click(),
      addTransformationsButton.click(),
    ]);
    cy.wait(2000);
    modalSelectTransformations.searchItemTransformationsByName(profile.holdingsTransformation);
    modalSelectTransformations.selectTransformations(
      profile.holdingsMarcField,
      profile.subfieldForHoldings,
    );
    cy.do(addTransformationsButton.click());
    cy.expect(Modal('Select transformations').absent());
    modalSelectTransformations.searchItemTransformationsByName(profile.itemTransformation);
    modalSelectTransformations.selectTransformations(
      profile.itemMarcField,
      profile.subfieldForItem,
    );
    cy.wait(2000);
  },

  fillMappingProfileForItemHrid: (profileName, itemMarcField = '902', subfield = 'a') => {
    fillInName(profileName);
    cy.do([
      outputFormatSelect.choose(outputFormat),
      Checkbox(CHECKBOX_NAMES.SRS).click(),
      Checkbox(CHECKBOX_NAMES.ITEM).click(),
      addTransformationsButton.click(),
    ]);
    modalSelectTransformations.searchItemTransformationsByName(
      EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
    );
    modalSelectTransformations.selectTransformations(itemMarcField, subfield);
  },

  createNewFieldMappingProfileViaApi: (nameProfile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-export/mapping-profiles',
        body: {
          transformations: [],
          recordTypes: ['SRS'],
          outputFormat: 'MARC',
          name: nameProfile,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createNewFieldMappingProfileWithTransformationsViaApi: (nameProfile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-export/mapping-profiles',
        body: {
          name: nameProfile,
          transformations: [
            {
              fieldId: 'holdings.hrid',
              path: '$.holdings[*].hrid',
              recordType: 'HOLDINGS',
              transformation: '911  $h',
              enabled: true,
            },
            {
              fieldId: 'item.hrid',
              path: '$.holdings[*].items[*].hrid',
              recordType: 'ITEM',
              transformation: '911  $i',
              enabled: true,
            },
          ],
          recordTypes: ['HOLDINGS', 'ITEM', 'SRS'],
          outputFormat: 'MARC',
          fieldsSuppression: '',
          suppress999ff: false,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createNewFieldMappingProfile(name, recordTypes) {
    this.clickNewButton();
    fillInName(name);
    recordTypes.forEach((recordType) => {
      cy.do(Checkbox(recordType).click());
    });
    this.clickAddTransformationsButton();
  },

  createNewFieldMappingProfileWithoutTransformations(
    name,
    recordType = 'Source record storage (entire record)',
  ) {
    cy.do([TextField('Name*').fillIn(name), Checkbox(recordType).click()]);
  },

  clickAddTransformationsButton() {
    cy.do(Button('Add transformations').click());
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  verifyNewProfileForm() {
    cy.expect([
      Accordion({ label: 'Summary', open: true }).exists(),
      Accordion({ label: 'Transformations', open: true }).exists(),
      Button('Collapse all').has({ disabled: false }),
      Button({ icon: 'times' }).has({ disabled: false }),
      Button('Cancel').has({ disabled: false }),
      Button('Save & close').has({ disabled: true }),
      Accordion('Summary').find(TextField('Name*')).exists(),
      Select('Output format*').find(Option('MARC')).exists(),
      HTML('FOLIO record type').exists(),
      Checkbox('Source record storage (entire record)').has({ checked: false }),
      Checkbox('Inventory instance (selected fields)').has({ checked: false }),
      Checkbox('Holdings').has({ checked: false }),
      Checkbox('Item').has({ checked: false }),
      TextArea('Description').exists(),
      Checkbox('Suppress 999 ff').has({ checked: false }),
      transformationsAccordion.find(Button('Add transformations')).has({ disabled: false }),
      HTML('No transformations found').exists(),
    ]);
    this.verifyFieldsSuppressionTextareaDisabled(true);
  },

  checkCheckbox(...names) {
    names.forEach((name) => {
      cy.wait(2000);
      cy.do(Checkbox(name).click());
    });
  },

  verifyFieldsSuppressionTextareaDisabled(disabled) {
    cy.expect(fieldsSuppressionTextArea.has({ disabled }));
  },

  fillInFieldsSuppressionTextarea(...text) {
    cy.get('textarea[name="fieldsSuppression"]').focus();
    text.forEach((item, index) => {
      if (index === text.length - 1) {
        cy.get('textarea[name="fieldsSuppression"]').type(item);
      } else {
        cy.get('textarea[name="fieldsSuppression"]').type(item).type('{enter}');
      }
    });
  },

  verifyFieldsSuppressionTextareaError(errorText) {
    cy.expect([fieldsSuppressionTextArea.has({ error: errorText })]);
  },

  clickSaveAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  clearFieldsSuppressionTextarea() {
    cy.get('textarea[name="fieldsSuppression"]').focus();
    cy.get('textarea[name="fieldsSuppression"]').type('{selectAll}');
    cy.get('textarea[name="fieldsSuppression"]').type('{backspace}');
  },

  verifyFolioRecordTypeError(error, errorText) {
    if (error) {
      cy.get('[class^="folioRecordTypeContainer"]')
        .find('[class^="error"]')
        .and('contain.text', errorText); // Verify that the element contains the expected text
    } else {
      cy.get('[class^="folioRecordTypeContainer"]').find('[class^="error"]').should('not.exist');
    }
  },

  verifyAddedTransformationTable(
    fieldNameValue,
    fieldValue,
    ind1Value,
    ind2Value,
    subfieldValue,
    rowIndex = 0,
  ) {
    cy.expect([
      transformationsAccordion
        .find(MultiColumnList())
        .find(
          MultiColumnListCell({
            column: 'Field name',
            content: fieldNameValue,
            row: rowIndex,
          }),
        )
        .exists(),
      transformationsAccordion
        .find(MultiColumnList())
        .find(
          MultiColumnListCell({
            column: 'Field',
            content: fieldValue,
            row: rowIndex,
          }),
        )
        .exists(),
      transformationsAccordion
        .find(MultiColumnList())
        .find(
          MultiColumnListCell({
            column: 'In.1',
            content: ind1Value,
            row: rowIndex,
          }),
        )
        .exists(),
      transformationsAccordion
        .find(MultiColumnList())
        .find(
          MultiColumnListCell({
            column: 'In.2',
            content: ind2Value,
            row: rowIndex,
          }),
        )
        .exists(),
      transformationsAccordion
        .find(MultiColumnList())
        .find(
          MultiColumnListCell({
            column: 'Subfield',
            content: subfieldValue,
            row: rowIndex,
          }),
        )
        .exists(),
    ]);
  },
};
