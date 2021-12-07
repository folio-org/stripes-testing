import HTML from './baseHTML';

// TODO: rewrite to special id
export const quickMarcEditorRowSelector = 'div[id=quick-marc-editor-pane-content]>div>div>div[class*=quickMarcEditorRow]';
export const quickMarcEditorTagInRowSelector = 'input[name*=".tag"]';
export const quickMarcEditorDeleteIconInRowSelector = 'div[id=quick-marc-editor-pane-content]>div>div>div[class*=quickMarcEditorRow]';


export default HTML.extend('quickMarcEditorRow')
  .selector(quickMarcEditorRowSelector)
  .filters({
    index:  el => [...el.parentElement.children].indexOf(el),
  });
