import HTML from './baseHTML';

export default HTML.extend('icon')
  .selector('[class^=icon-]')
  .filters({
    warning: (el) => {
      return Array.from(el.classList).some((className) => className.startsWith('status-warn'));
    },
    info: (el) => {
      return el.querySelector('[class*="icon-info"]') !== null;
    },
    shared: (el) => {
      return Array.from(el.classList).some((className) => className.startsWith('sharedIcon'));
    },
  })
  .actions({
    hoverMouse: ({ perform }) => perform((el) => el.dispatchEvent(new Event('mouseover'))),
    unhoverMouse: ({ perform }) => perform((el) => el.dispatchEvent(new Event('mouseout'))),
  });
