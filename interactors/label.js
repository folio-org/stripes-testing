import HTML from './baseHTML';

export default HTML.extend('label')
  .selector('label')
  .locator((el) => el.textContent)
  .filters({
    for: (el) => el.htmlFor,
  });
