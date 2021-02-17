import { HTML } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';

import ButtonInteractor from './button';

const DropdownTrigger = HTML.extend('dropdown trigger')
  .selector('[aria-haspopup]');

const DropdownMenu = HTML.extend('dropdown menu')
  .selector('div[class*=DropdownMenu]');

const label = el => el.querySelector('[aria-haspopup]').textContent;

const open = el => el.querySelector('[aria-haspopup]').getAttribute('aria-expanded') === 'true';

const visible = el => [el, el.querySelector(['[aria-haspopup]'])].every(isVisible);

const control = (shouldOpen = true) => async interactor => {
  let isOpen;
  await interactor.perform(el => { isOpen = open(el); });
  if (isOpen !== shouldOpen) {
    await interactor.toggle();
  }
};

export default HTML.extend('dropdown')
  .selector('div[class*=dropdown]')
  .locator(label)
  .filters({ label, open, visible })
  .actions({
    focus: ({ find }) => find(DropdownTrigger()).focus(),
    toggle: ({ find }) => find(DropdownTrigger()).click(),
    open: control(true),
    close: control(false),
    choose: async (interactor, value) => {
      await interactor.open();
      await DropdownMenu({ visible: true }).find(ButtonInteractor(value)).click();
      await interactor.close();
    },
  });
