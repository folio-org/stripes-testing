import HTML from './baseHTML';
import {
  quickMarcEditorRowSelector,
  quickMarcEditorTagInRowSelector,
  quickMarcEditorDeleteIconInRowSelector,
  quickMarcEditorRowContentSelector,
} from './quickMarcEditorRow';

export default HTML.extend('quickMarcEditor')
  .selector('section[id=quick-marc-editor-pane]')
  .filters({
    rowsCount: (el) => [...el.querySelectorAll(quickMarcEditorRowSelector)].length,
    presentedFieldsTags:
      // TODO: clarify how to use apply and default
      // {apply:
      (el) => [...el.querySelectorAll(quickMarcEditorTagInRowSelector)].map((tag) => tag.getAttribute('value')),
    // default: and(['LDR', '001', '005', '008', '999'].map(field => some(field))
    // }
    presentedRowsProperties: (el) => {
      const parsedRows = [];
      el.querySelectorAll(quickMarcEditorRowSelector).forEach((row) => parsedRows.push({
        tag: row.querySelector(quickMarcEditorTagInRowSelector)?.getAttribute('value'),
        content: row.querySelector(quickMarcEditorRowContentSelector)?.textContent,
        isDeleteButtonExist: Boolean(row.querySelector(quickMarcEditorDeleteIconInRowSelector)),
      }));
      return parsedRows;
    },
  });
