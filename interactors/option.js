import HTML from './baseHTML';

export default HTML.extend('option')
  .selector('option')
  .filters({
    id: (el) => el.getAttribute('id'),
    value: (el) => el.getAttribute('value')
  });
