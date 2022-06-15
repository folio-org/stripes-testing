import HTML from './baseHTML';

export default HTML.extend('alert')
  .selector('div[role=alert]')
  .locator(element => element.querySelector('[role=alert]').textContent)
  .filters({
    value: (element) => element.querySelector('[role=alert]').textContent
  });
