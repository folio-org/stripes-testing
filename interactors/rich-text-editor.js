import { HTML } from '@interactors/html';

function label(el) {
  return el.querySelector('label').textContent;
}

export default HTML.extend('rich text editor')
  .selector('[class*="editor---"]')
  .locator(label)
  .filters({
    value: (element) => element.querySelector('[class*="contenteditable"]').innerHTML,
    id: (el) => el.id,
  })
  .actions({
    fillIn: ({ perform }, value) => perform((element) => {
      const editor = element.querySelector('[class*="contenteditable"]');
      if (editor) {
        editor.innerHTML = '';
        editor.innerHTML = value;
      }
    }),
  });
