import HTML from './baseHTML';

// TODO: rewrite to special id
export const quickMarcEditorRowSelector = 'div[id=quick-marc-editor-pane-content]>div>div>div[class*=quickMarcEditorRow]';
export const quickMarcEditorTagInRowSelector = 'input[name*=".tag"]';
export const quickMarcEditorDeleteIconInRowSelector = 'button[icon=trash]';
export const quickMarcEditorRowContentSelector = 'div[class*=quickMarcEditorRowContent] textarea';


export default HTML.extend('quickMarcEditorRow')
  .selector(quickMarcEditorRowSelector)
  .filters({
    index:  el => [...el.parentElement.children].indexOf(el),
    tagValue: el => el.querySelector(quickMarcEditorTagInRowSelector).getAttribute('value'),
    tagElement: el => el.find()
  });
