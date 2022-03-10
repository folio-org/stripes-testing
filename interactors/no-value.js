import { createInteractor } from '@interactors/html';

export default createInteractor('no value')
  .selector('[data-test-no-value]')
  .filters({
    ariaValue: (el) => el.querySelector('span[class^="sr-only"]').textContent,
    emptyScreenValue: (el) => el.querySelector('span[aria-hidden]').textContent === '-',
  });
