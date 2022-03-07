import { createInteractor } from '@interactors/html';

export default createInteractor('no value')
  .selector('[data-test-no-value]')
  // .locator((el) => el.querySelector('[data-test-no-value]').textContent)
  .filters({
    ariaValue: (el) => el.querySelector('span[class^="sr-only"]').textContent,
    emptyScreenValue: (el) => el.querySelector('span[aria-hidden]').textContent === '-',
  });
