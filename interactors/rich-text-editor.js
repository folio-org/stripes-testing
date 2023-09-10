import { HTML } from '@interactors/html';

function label(el) {
  return el.querySelector('label').textContent;
}

export default HTML.extend('rich text editor')
  .selector('[class^=inputGroup],[class^="quill editor"]')
  .locator(label)
  .filters({
    value: (element) => element.querySelector('.ql-editor').textContent,
  })
  .actions({
    fillIn: ({ perform }, value) => perform((element) => {
      const editor = element.querySelector('.ql-editor');
      if (editor) {
        editor.textContent = '';
        editor.textContent = value;
      }
    }),
  });
