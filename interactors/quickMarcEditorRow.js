import HTML from './baseHTML';

export default HTML.extend('quickMarkEditorRow')
  .selector('div[id=quick-marc-editor-pane-content]>div>div>div[class*=quickMarcEditorRow]')
  .filters({
    index:  el => [...el.parentElement.children].indexOf(el)
  });
