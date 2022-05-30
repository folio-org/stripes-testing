import HTML from './baseHTML';

export default HTML.extend('form')
  .selector('form')
  .filters({
    id: (el) => el.getAttribute('id')
  });