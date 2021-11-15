import HTML from './baseHTML';
import IconButton from './icon-button';

export const calloutTypes = {
  success: 'success',
  info: 'info',
  error: 'error',
  warning: 'warning',
};

export default HTML.extend('callout')
  .selector('[class^=calloutBase-]')
  .locator((el) => el.textContent)
  .filters({
    id: (el) => el.id,
    type: (el) => calloutTypes.keys()
      .filter((t) => el.className.includes(t))[0]
  })
  .actions({
    dismiss: ({ find }) => find(IconButton('times')).click()
  });
