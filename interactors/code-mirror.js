import HTML from './baseHTML';

const content = (el) => el.textContent;

const HintItem = HTML.extend('code mirror hint item').selector('.CodeMirror-hint').locator(content);

export const CodeMirrorHint = HTML.extend('code mirror hint')
  .selector('.CodeMirror-hints')
  .actions({
    clickItem: (interactor, itemContent) => {
      return interactor.find(HintItem(itemContent)).click();
    },
  });

const getCodeMirrorInstance = (el) => el.querySelector('.CodeMirror').CodeMirror;

export default HTML.extend('code mirror')
  .selector('.react-codemirror2')
  .actions({
    focus: ({ perform }) => perform((el) => el.querySelector('.CodeMirror').CodeMirror.focus()),
    async fillIn(interactor, value) {
      await interactor.focus();
      await interactor.perform((el) => getCodeMirrorInstance(el).replaceRange(value, { line: Infinity }));
    },
    async clear(interactor) {
      await interactor.focus();
      await interactor.perform((el) => getCodeMirrorInstance(el).setValue(''));
    },
  });
