/* EditableList Interactor
*  This interactor helps with tests involving the Editable List - used commonly within the ControlledVocab smart component.
*
*  // Ex: Asserting a column header is present:
*  EditableList().find(ColumnHeader('name')).exists();
*
*  // Asserting editing is disabled on rows:
*  EditableList().has({ editDisabled: true });
*
*  // Filling in a text field:
*  EditableListRow().find(TextField(including('name'))).fillIn('test');
*/

import { including } from '@interactors/html';
import HTML from './baseHTML';
import { MultiColumnListRow, MultiColumnList } from './multi-column-list';
import Button from './button';

export const ColumnHeader = HTML.extend('column header')
  .selector('[role=columnheader]');

export const EditableListRow = MultiColumnListRow.extend('editable list row')
  .selector('[class^=editListRow-]')
  .filters({
    index: {
      apply: el => [...el.closest('[role=rowgroup]').querySelectorAll('[class^=editListRow-]')].indexOf(el),
      default: 0,
    },
    saveDisabled: Button({ text: 'Save', disabled: true }).exists()
  })
  .actions({
    edit: ({ find }) => find(Button({ ariaLabel: including('Edit') })).click(),
    cancel: ({ find }) => find(Button(/cancel/i)).click(),
    save: ({ find }) => find(Button(/save/i)).click(),
    delete: ({ find }) => find(Button({ ariaLabel: including('Delete') })).click()
  });

export const EditableList = MultiColumnList.extend('editable list')
  .selector('form')
  .filters({
    rowCount: (el) => el.querySelectorAll('[class^=editListRow-]').length,
    addDisabled: Button({ text: including('+'), disabled: true }).exists(),
    editDisabled: Button({ icon: 'edit', disabled: false }).absent(),
    deleteDisabled: Button({ icon: 'trash', disabled: false }).absent(),
    addButton: Button(including('+')).exists(),
    editButtons: Button({ icon: 'edit' }).exists(),
    deleteButtons: Button({ icon: 'trash' }).exists(),
  })
  .actions({
    add: ({ find }) => find(Button(including('+'))).click()
  });
