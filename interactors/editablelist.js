// import baseHTML as HTML from './baseHTML';
import { MultiColumnListRow, MultiColumnList } from './multi-column-list';
import { Button } from './button';

export const EditableListRow = MultiColumnListRow.extend('editable list row')
  .selector('[class^=editListRow-]')
  .actions({
    edit: ({ find }) => find(Button(/edit/)).click(),
    cancel: ({ find }) => find(Button(/cancel/)).click(),
    save: ({ find }) => find(Button(/save/)).click(),
    delete: ({ find }) => find(Button(/delete/)).click(),
  });

export const EditableList = MultiColumnList.extend('editable list')
  .selector('form')
  .filters({
    rowCount: (el) => el.querySelectorAll('[class^=editListRow-]').length
  })
  .actions({
    add: ({ find }) => find(Button(/Add/)).click()
  });
