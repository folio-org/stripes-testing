import HTML from './baseHTML';

export default HTML.extend('image')
  .selector('img')
  .filters({
    alt: (el) => el.getAttribute('alt'),
  });
