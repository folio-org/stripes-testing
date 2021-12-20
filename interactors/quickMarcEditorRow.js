import HTML from './baseHTML';

export const quickMarcEditorRowSelector = 'div[id=quick-marc-editor-rows]>div[class*=quickMarcEditorRow]';
export const quickMarcEditorTagInRowSelector = 'input[name*=".tag"]';
export const quickMarcEditorDeleteIconInRowSelector = 'button[icon=trash]';

export default HTML.extend('quickMarcEditorRow')
  .selector(quickMarcEditorRowSelector)
  .filters({
    index:  el => [...el.parentElement.children].indexOf(el),
    tagValue: el => el.querySelector(quickMarcEditorTagInRowSelector).getAttribute('value')
  });
