import HTML from './baseHTML';

export const cardStyles = {
  default: 'default',
  positive: 'positive',
  negative: 'negative',
};

export default HTML.extend('card')
  .selector('[class^=card-]')
  .locator((el) => el.querySelector('[class^=body]').textContent)
  .filters({
    headerStart: (el) => el.querySelector('[class^=headerStart-]').textContent,
    headerEnd: (el) => el.querySelector('[class^=headerEnd-]').textContent,
    style: (el) => cardStyles.keys().filter((s) => el.className.includes(s))[0],
  });
