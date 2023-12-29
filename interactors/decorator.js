import HTML from './baseHTML';

export default HTML.extend('decorator')
  .selector('[class^=decorator-]')
  .locator((el) => el.querySelector('[class^=headline-]')?.textContent);
