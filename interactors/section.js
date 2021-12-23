import HTML from './baseHTML';

export default HTML.extend('section')
  .selector('section')
  .filters({
    id: (el) => el.getAttribute('id'),
    arialLabelledby: (el) => el.getAttribute('aria-labelledby')
  });
