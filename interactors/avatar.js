import HTML from './baseHTML';

export default HTML.extend('avatar')
  .selector('[data-test-avatar]')
  .locator(el => el.querySelector('img').src)
  .filters(
    {
      placeholder: (element) => element.querySelector('svg') || '',
      image: (element) => element.querySelector('img') || ''
    }
  );
