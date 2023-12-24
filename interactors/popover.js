import HTML from './baseHTML';

export default HTML.extend('popover')
  .selector('[class^=popover-]')
  .filters({
    content: (el) => el.querySelector('[class^=content-]').textContent,
  });
