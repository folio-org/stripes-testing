import { TextField } from '@interactors/html';

import IconButton from './icon-button';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.textContent : undefined;
};

export default HTML.extend('text area')
  .selector('div[class^=textArea-]')
  .locator(label)
  .filters({
    id: (el) => el.querySelector('textarea').getAttribute('id'),
    ariaLabel: (el) => el.querySelector('textarea').getAttribute('aria-label'),
    cols: (el) => el.querySelector('textarea').getAttribute('cols'),
    label,
    value: (el) => el.querySelector('textarea').value,
    hasValue: (el) => el.querySelector('select').value !== '',
    hasClearIcon: (el) => Boolean(el.querySelector('[class^=textFieldIcon-]')),
    textContent: (el) => el.querySelector('textarea').textContent,
    focused: (el) => el.querySelector('textarea').contains(el.ownerDocument.activeElement),
    warning: (el) => el.querySelector('[class^=feedbackWarning-]').textContent,
    error: (el) => el.querySelector('[class^=feedbackError-]')?.textContent,
    required: (el) => el.querySelector('textarea').getAttribute('aria-required') === 'true',
    valid: (el) => el.querySelector('textarea').getAttribute('aria-invalid') !== 'true',
    name: (el) => el.querySelector('textarea').getAttribute('name'),
    disabled: (el) => el.querySelector('textarea').disabled,
    dataTestID: (el) => el.querySelector('textarea').getAttribute('data-testid'),
    dataActionIndex: (el) => el.querySelector('textarea').getAttribute('data-action-index'),
    width: (el) => el.querySelector('textarea').offsetWidth,
    height: (el) => el.querySelector('textarea').offsetHeight,
  })
  .actions({
    blur: ({ find }) => find(TextField()).perform(dispatchFocusout),
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    focus: ({ find }) => find(TextField()).focus(),
    clear: ({ find }) => find(IconButton({ icon: 'times-circle-solid' })).click(),
    resize: async ({ perform }, newHeight = null, newWidth = null) => {
      return perform((el) => {
        const textareaElement = el.querySelector('textarea');
        const heightString = newHeight !== null ? `height: ${newHeight}px;` : '';
        const widthString = newWidth !== null ? `width: ${newWidth}px;` : '';
        textareaElement.style = `${heightString}${widthString}`;
      });
    },
  });
