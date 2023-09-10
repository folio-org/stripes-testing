import HTML from './baseHTML';

export default HTML.extend('avatar')
  .selector('[data-test-avatar]')
  .locator((element) => {
    return element.querySelector('img') ? element.querySelector('img').src : '';
  })
  .filters({
    placeholder: (element) => !!element.querySelector('svg'),
    image: (element) => !!element.querySelector('img'),
  });
