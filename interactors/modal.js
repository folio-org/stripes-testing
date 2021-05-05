import { HTML } from '@bigtest/interactor';
import Button from './button';

function title(el) { return el.querySelector('[class^=modalHeader]').textContent; }

export default HTML.extend('modal')
  .selector('[class^=modal-]')
  .locator(title)
  .filters({
    title,
  })
  .actions({
    dismiss: (interactor) => interactor.find(Button({ ariaLabel: 'Dismiss modal' })).click(),
  });
