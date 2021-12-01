import HTML from './baseHTML';


export default HTML.extend('quickMarkEditorRow')
  .selector('div[id=quick-marc-editor-pane-content]>div>div>div[class*=quickMarcEditorRow]')
  // .selector('div[id=quick-marc-editor-pane-content')
  .filters({
    rowsCount: el => Array.from(el.querySelectorAll('div[class*=quickMarcEditorRow]')).lengtht,
    // rowsCount: (el) => el.querySelectorAll('div[class*=quickMarcEditorRow]').length
    index:  el => [...el.parentElement.children].indexOf(el)
  });
