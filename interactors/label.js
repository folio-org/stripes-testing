import HTML from './baseHTML';

export default HTML.extend('label')
  .selector('label')
  .locator((el) => el.innerText)
  .filters({
    for: (el) => el.htmlFor,
  });
