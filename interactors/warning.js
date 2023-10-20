import HTML from './baseHTML';

export default HTML.extend('alert')
  .selector('[role=alert]')
  .filters({
    message: (el) => el.querySelector('[class^=content-]').textContent,
  });
