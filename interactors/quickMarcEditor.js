import HTML from './baseHTML';

export default HTML.extend('quickMarkEditor')
  .selector('section[id=quick-marc-editor-pane]')
  .filters({
    // rowsCount: el => el.querySelectorAll('div[class*=quickMarcEditorRow]').length
    rowsCount: (el) => Array.from(el.querySelectorAll('div[class*=quickMarcEditorRow]')).length,
    rows: (el) => Array.from(el.querySelectorAll('div[class*=quickMarcEditorRow]'))

  });
