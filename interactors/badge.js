import HTML from './baseHTML';

const color = (element, value) => element.className.includes(value) || '';


export default HTML.extend('badge')
  .selector('[class^=badge-]')
  .locator(element => element.querySelector('[class^=label-]').textContent)
  .filters({
    color,
    value: (element) => element.querySelector('[class^=label-]').textContent
  });
