import HTML from './baseHTML';

export default HTML.extend('callout')
  .selector('[class^=calloutBase-]')
  .locator((el) => el.textContent)
  .filters({
    id: (el) => el.id,
    type: (el) => ['success', 'error', 'warning', 'info']
      .filter((t) => el.className.includes(t))[0]
  });
