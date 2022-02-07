import HTML from './baseHTML';


function label(element) {
  const labelEl = element.querySelector('legend');
  return labelEl ? labelEl.textContent.trim() : '';
}

export default HTML.extend('fieldset')
  .selector('fieldset')
  .locator(label)
  .filters({
    // related with common checks of accordion elements(disabled for example)
    textareaNames: el => [...el.querySelectorAll('textarea')].map(textarea => textarea.getAttribute('name')),
    selectNames: el => [...el.querySelectorAll('select')].map(select => select.getAttribute('name')),
    // TODO: add special unique attribute to each delete button
    // buttonAriaLabels: el => [...el.querySelectorAll('div[class^=content-] button')].map(button => button.getAttribute('aria-label')),
    buttonIds: el => [...el.querySelectorAll('div[class^=content-] button')].map(button => button.getAttribute('id')).filter(id => id),
    //buttonContainsText: el => [...el.querySelectorAll('div[class^=content-] button')].map(button => button.textContent).filter(id => id),
    inputNames: el => [...el.querySelectorAll('input:not([type=checkbox])')].map(input => input.getAttribute('name')),
  });
