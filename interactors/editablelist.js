// import baseHTML as HTML from './baseHTML';
import { MultiColumnListRow, MultiColumnList } from './multi-column-list';
import Button from './button';

export const EditableListRow = MultiColumnListRow.extend('editable list row')
  .selector('[class^=editListRow-]')
  .filters({
    index: el => [...el.closest('[role=rowgroup]').querySelectorAll('[class^=editListRow-]')].indexOf(el)
  })
  .actions({
    edit: ({ find }) => find(Button(/edit/i)).click(),
    cancel: ({ find }) => find(Button(/cancel/i)).click(),
    save: ({ find }) => find(Button(/save/i)).click(),
    delete: ({ find }) => find(Button(/delete/i)).click(),
  });

export const EditableList = MultiColumnList.extend('editable list')
  .selector('form')
  .filters({
    rowCount: (el) => el.querySelectorAll('[class^=editListRow-]').length
  })
  .actions({
    add: ({ find }) => find(Button(/add/i)).click()
  });
