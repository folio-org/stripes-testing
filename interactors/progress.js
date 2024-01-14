import HTML from './baseHTML';

export default HTML.extend('progress')
  .selector('[class^=progress-]')
  .filters({
    testId: (el) => el.getAttribute('data-testid'),
    content: (el) => el.parentElement.textContent,
  });
