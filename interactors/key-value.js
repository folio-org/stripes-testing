import { createInteractor } from '@interactors/html';

export default createInteractor('key value')
  .selector('[class^=kvRoot]')
  .locator((el) => el.querySelector('[class^=kvLabel]').textContent)
  .filters({
    value: (el) => el.querySelector('[class^=kvValue]').textContent,
    subValue: (el) => el.querySelector('[class^=kvSub]').textContent
  });
