import HTML from './baseHTML';

export default HTML.extend('marcBibSourceView')
  .selector('section[id=quick-marc-editor-pane]')
  .filters({
    rowsCount: (el) => Array.from(el.querySelectorAll('div>div>div>div')).length,
    rows: (el) => Array.from(el.querySelectorAll('div[class*=quickMarcEditorRow]'))

  });
