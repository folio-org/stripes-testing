import HTML from './baseHTML';

export default HTML.extend('section')
  .selector('section')
  .filters({
    id: (el) => el.getAttribute('id'),
    mark: (el) => el.querySelector('mark').textContent,
  })
  .actions({
    focus: ({ perform }) => perform((el) => el.querySelector('section').focus()),
  });
