import HTML from './baseHTML';

export default HTML.extend('section')
  .selector('section')
  .filters({
    id: (el) => el.getAttribute('id'),
    label: (el) => el.querySelector('[class^=labelArea-]').textContent,
    expanded: (el) => el.querySelector('[class^=content-wrap]').className.includes('expanded'),
    mark: (el) => el.querySelector('mark').textContent,
    error: (el) => el.querySelector('[class^=feedbackError]').textContent,
  })
  .actions({
    focus: ({ perform }) => perform((el) => el.querySelector('section').focus()),
  });
