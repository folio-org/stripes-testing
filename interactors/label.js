import HTML from './baseHTML';

export default HTML.extend('label')
  .selector('label, div[class^=label-], span[class^=label-]')
  .locator((el) => el.textContent)
  .filters({
    for: (el) => el.htmlFor,
  });
