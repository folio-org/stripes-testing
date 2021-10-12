import HTML from './baseHTML';

const color = (element) => element.className;

export default HTML.extend('badge')
  .selector('[class^=badge-]')
  .locator(element => element.querySelector('[class^=label-]').innerText)
  .filters({
    color,
    value: (element) => element.querySelector('[class^=label-]').innerText
  });
