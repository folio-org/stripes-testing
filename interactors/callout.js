import HTML from './baseHTML';
import IconButton from './icon-button';
import Button from './button';

export const calloutTypes = {
  success: 'success',
  info: 'info',
  error: 'error',
  warning: 'warning',
};

export default HTML.extend('callout')
  .selector('[class^=calloutBase-], [class^=toast-]')
  .locator((el) => el.textContent)
  .filters({
    id: (el) => el.id,
    textContent: (el) => el.querySelector('[class^=message-]').textContent,
    type: (el) => ['success', 'info', 'error', 'warning'].filter((t) => el.className.includes(t))[0],
  })
  .actions({
    dismiss: ({ find }) => find(IconButton('times')).click(),
    dismissToast: ({ find }) => find(Button({ dataTestID: 'toast-close-btn' })).click(),
  });
