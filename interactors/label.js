import HTML from './baseHTML';

export default HTML.extend('label')
  .selector('label, div[class^=label-]')
  .locator((el) => el.textContent)
  .filters({
    text: (el) => el.parentElement.textContent,
    for: (el) => el.htmlFor,
  });
