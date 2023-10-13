import HTML from './baseHTML';

const textContent = (el) => el.querySelector('[class^=content-]').textContent;

export default HTML.extend('popover').selector('[class^=popover-]').locator(textContent).filters({
  textContent,
});
