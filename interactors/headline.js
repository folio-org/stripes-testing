import HTML from './baseHTML';

export default HTML.extend('headline')
  .selector('[class^="headline-"]')
  .locator(el => el.textContent);
