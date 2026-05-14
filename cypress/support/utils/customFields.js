import { CUSTOM_FIELD_ENTITY_TYPES, CUSTOM_FIELD_TYPES } from '../constants';
import getRandomPostfix from './stringTools';

const displayInAccordion = 'default';
const getFieldName = (description, testNumber) => `AT_${testNumber}_${description}_${getRandomPostfix()}`;

export const generateCheckboxCustomFieldData = ({ data = {}, testNumber }) => ({
  id: null,
  visible: true,
  required: false,
  helpText: '',
  type: CUSTOM_FIELD_TYPES.SINGLE_CHECKBOX,
  checkboxField: {
    default: false,
  },
  displayInAccordion,
  entityType: CUSTOM_FIELD_ENTITY_TYPES.USER,
  name: getFieldName('CB', testNumber),
  ...data,
});

export const generateDatePickerCustomFieldData = ({ data = {}, testNumber }) => ({
  id: null,
  name: getFieldName('DP', testNumber),
  visible: true,
  required: false,
  helpText: '',
  type: CUSTOM_FIELD_TYPES.DATE_PICKER,
  displayInAccordion,
  entityType: CUSTOM_FIELD_ENTITY_TYPES.USER,
  ...data,
});

export const generateMultiSelectCustomFieldData = ({ data = {}, testNumber }) => ({
  id: null,
  name: getFieldName('MS', testNumber),
  visible: true,
  required: false,
  helpText: '',
  type: CUSTOM_FIELD_TYPES.MULTI_SELECT_DROPDOWN,
  displayInAccordion,
  selectField: {
    multiSelect: true,
    options: {
      values: [
        {
          value: 'MultiSelectOption1',
          id: 'opt_0',
          default: false,
        },
        {
          id: 'opt_1',
          default: false,
          value: 'MultiSelectOption2',
        },
      ],
    },
  },
  entityType: CUSTOM_FIELD_ENTITY_TYPES.USER,
  ...data,
});

export const generateRadioButtonCustomFieldData = ({ data = {}, testNumber }) => {
  return {
    id: null,
    name: getFieldName('RB', testNumber),
    visible: true,
    helpText: '',
    type: CUSTOM_FIELD_TYPES.RADIO_BUTTON,
    displayInAccordion,
    selectField: {
      multiSelect: false,
      options: {
        values: [
          {
            id: 'opt_0',
            value: 'RadioButtonOption1',
            default: false,
          },
          {
            id: 'opt_1',
            value: 'RadioButtonOption2',
            default: false,
          },
        ],
      },
    },
    entityType: CUSTOM_FIELD_ENTITY_TYPES.USER,
    ...data,
  };
};

export const generateSingleSelectCustomFieldData = ({ data = {}, testNumber }) => ({
  id: null,
  name: getFieldName('SS', testNumber),
  visible: true,
  required: false,
  helpText: '',
  type: CUSTOM_FIELD_TYPES.SINGLE_SELECT_DROPDOWN,
  displayInAccordion,
  selectField: {
    multiSelect: false,
    options: {
      values: [
        {
          id: 'opt_0',
          value: 'SingleSelectOption1',
          default: false,
        },
        {
          id: 'opt_1',
          value: 'SingleSelectOption2',
          default: true,
        },
      ],
    },
  },
  entityType: CUSTOM_FIELD_ENTITY_TYPES.USER,
  ...data,
});

export const generateTextAreaCustomFieldData = ({ data = {}, testNumber }) => ({
  id: null,
  name: getFieldName('TA', testNumber),
  visible: true,
  required: false,
  helpText: '',
  type: CUSTOM_FIELD_TYPES.TEXTBOX_LONG,
  displayInAccordion,
  entityType: CUSTOM_FIELD_ENTITY_TYPES.USER,
  ...data,
});

export const generateTextFieldCustomFieldData = ({ data = {}, testNumber }) => ({
  id: null,
  name: getFieldName('TF', testNumber),
  visible: true,
  required: false,
  helpText: '',
  type: CUSTOM_FIELD_TYPES.TEXTBOX_SHORT,
  displayInAccordion,
  entityType: CUSTOM_FIELD_ENTITY_TYPES.USER,
  ...data,
});
