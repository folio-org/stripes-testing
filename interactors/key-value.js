import { createInteractor } from '@interactors/html';

export default createInteractor('key value')
  .selector('[class^=kvRoot]')
  .locator((el) => el.querySelector('[class^=kvLabel]').innerText)
  .filters({
    value: (el) => el.querySelector('[class^=kvValue]').innerText,
    subValue: (el) => el.querySelector('[class^=kvSub]').innerText
  });
