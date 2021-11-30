import HTML from './baseHTML';

export default HTML.extend('quickMarkEditorRow')
  .selector('div[class*=quickMarcEditorRow]')
  // .selector('div[id=quick-marc-editor-pane-content')
  .filters({
    rowsCount: el => Array.from(el.querySelectorAll('div[class*=quickMarcEditorRow]')).length
    // rowsCount: (el) => el.querySelectorAll('div[class*=quickMarcEditorRow]').length
  });
