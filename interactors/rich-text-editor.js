import { HTML } from '@bigtest/interactor';

function label(el) {
  return el.querySelector('label').innerText;
}

export default HTML.extend('rich text editor')
  .selector('[class^=inputGroup]')
  .locator(label)
  .actions({
    fillIn: ({ perform }, value) => perform(element => {
      const editor = element.querySelector('.ql-editor');
      if (editor) editor.innerHTML = value;
    })
  });
