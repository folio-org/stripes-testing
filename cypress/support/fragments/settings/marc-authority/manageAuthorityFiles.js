/* eslint-disable no-unused-vars */
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  Form,
  KeyValue,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  Pane,
  PaneHeader,
  SearchField,
  Section,
  Select,
  TextArea,
  TextField,
  including,
} from '../../../../../interactors';

const manageAuthorityFilesPane = Pane('Manage authority files');
const newButton = manageAuthorityFilesPane.find(
  Button({ id: 'clickable-add-authority-source-files' }),
);
const firstRow = manageAuthorityFilesPane.find(MultiColumnListRow({ ariaRowIndex: 2 }));
const nameTextField = TextField({ placeholder: 'name' });
const prefixTextField = TextField({ placeholder: 'codes' });
const HridStartsWithTextField = TextField({ placeholder: 'startNumber' });
const baseUrlTextField = TextField({ placeholder: 'baseUrl' });
const activeCheckbox = Checkbox({ ariaLabel: 'Active' });
const sourceCell = MultiColumnListCell({ columnIndex: 5 });
const lastUpdatedCell = MultiColumnListCell({ columnIndex: 6 });
const cancelButton = Button('Cancel');
const savelButton = Button('Save');
const tableHeaderTexts = [
  'Name*',
  'Prefix*',
  'HRID starts with*',
  'Base URL',
  'Active',
  'Source',
  'Last updated by',
];

export default {
  waitLoading: () => {
    cy.expect(newButton.has({ disabled: false }));
    cy.wait(1000);
  },

  clickNewButton: () => {
    cy.do(newButton.click());
  },

  verifyEditableRowAdded: () => {
    cy.expect(firstRow.find(nameTextField).has({ value: '' }));
    cy.expect(firstRow.find(prefixTextField).has({ value: '' }));
    cy.expect(firstRow.find(HridStartsWithTextField).has({ value: '' }));
    cy.expect(firstRow.find(baseUrlTextField).has({ value: '' }));
    cy.expect(firstRow.find(activeCheckbox).has({ checked: false }));
    cy.expect(firstRow.find(sourceCell).has({ content: 'Local' }));
    cy.expect(firstRow.find(lastUpdatedCell).has({ content: '-' }));
    cy.expect(firstRow.find(cancelButton).has({ disabled: false }));
    cy.expect(firstRow.find(savelButton).has({ disabled: false }));
  },

  verifyTableHeaders() {
    tableHeaderTexts.forEach((headerText) => {
      cy.expect(manageAuthorityFilesPane.find(MultiColumnListHeader(headerText)).exists());
    });
  },
};
