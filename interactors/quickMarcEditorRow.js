import HTML from './baseHTML';

export default HTML.extend('quickMarcEditorRow')
  .selector('div[id=quick-marc-editor-pane-content]>div>div>div[class*=quickMarcEditorRow]')
  .filters({
    index:  el => [...el.parentElement.children].indexOf(el),
    required: el => ['LDR', '001', '005', '008', '999'].includes(el.querySelector('input[name*=".tag"]').getAttribute('value'))
  });
