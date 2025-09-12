import HTML from './baseHTML';

export default HTML.extend('icon')
  .selector('[class^=icon-]')
  .filters({
    warning: (el) => Array.from(el.classList).some((className) => className.startsWith('status-warn')),
  });
