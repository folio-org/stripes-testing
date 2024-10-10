import HTML from './baseHTML';

export default HTML.extend('image')
  .selector('img')
  .filters({
    alt: (el) => el.getAttribute('alt'),
    testId: (el) => el.getAttribute('data-testid'),
    src: (el) => el.getAttribute('src'),
  });
