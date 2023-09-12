import { HTML } from '@interactors/html';
import IconButtonInteractor from './icon-button';

export const MessageBannerTypes = {
  success: 'success',
  default: 'default',
  error: 'error',
  warning: 'warning',
};

export default HTML.extend('MessageBanner')
  .selector('[data-test-message-banner]')
  .filters({
    type: (el) => MessageBannerTypes.keys().filter((t) => el.className.includes(t))[0],
  })
  .actions({
    dismiss: ({ find }) => find(IconButtonInteractor({ icon: 'times' })).click(),
  });
