import HTML from './baseHTML';

function legend(element) {
  const legendEl = element.querySelector('legend');
  return legendEl ? legendEl.textContent.trim() : '';
}

export const FieldSet = HTML.extend('fieldset')
  .selector('fieldset')
  .locator(legend)
  .filters({
    // related with common checks of accordion elements(disabled for example)
    textareaNames: (el) => [...el.querySelectorAll('textarea')].map((textarea) => textarea.getAttribute('name')),
    selectNames: (el) => [...el.querySelectorAll('select')].map((select) => select.getAttribute('name')),
    buttonIds: (el) => [...el.querySelectorAll('div[class^=content-] button')]
      .map((button) => button.getAttribute('id'))
      .filter((id) => id),
    inputNames: (el) => [...el.querySelectorAll('input:not([type=checkbox])')].map((input) => input.getAttribute('name')),
    checkboxLabels: (el) => [...el.querySelectorAll('div[class^=checkbox-]>label')].map((input) => input.textContent),
    feildsCount: (el) => [...el.children].length,
    error: (el) => el.querySelector('[class*=feedbackError-]').textContent,
  });

export const FieldInFieldset = HTML.extend('fieldInfieldset')
  .selector('fieldset>div')
  .filters({
    fieldByIndex: (el) => [...el.parentElement.children].indexOf(el),
  });
