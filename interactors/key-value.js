import { createInteractor } from '@interactors/html';

export default createInteractor('key value')
  .selector('[class^=kvRoot]')
  .locator((el) => el.querySelector('[class^=kvLabel]').textContent)
  .filters({
    value: (el) => el.querySelector('[class^=kvValue]').textContent,
    subValue: (el) => el.querySelector('[class^=kvSub]').textContent,
    dataTestId: (el) => el.getAttribute('data-testid'),
    hasLink: (el) => el.getAttribute('data-test-text-link') === 'true',
  })
  .actions({
    // Use in case when link inside keyValue doesn't have href attribute
    clickLink: ({ perform }) => perform((el) => el.querySelector('[data-testid=text-link]').click()),
  });
