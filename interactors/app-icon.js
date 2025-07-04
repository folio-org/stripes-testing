import HTML from './baseHTML';

export default HTML.extend('app icon')
  .selector('[data-testid*="-app-link"]')
  .filters({
    dataLink: (el) => el.getAttribute('data-link'),
    dataTestId: (el) => el.getAttribute('data-testid'),
  })
  .actions({
    click: ({ perform }) => perform((el) => el.click()),
  });
