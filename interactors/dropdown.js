import { HTML } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';

import ButtonInteractor from './button';

const DropdownTrigger = HTML.extend('dropdown trigger')
  .selector('[aria-haspopup]');

const DropdownMenu = HTML.extend('dropdown menu')
  .selector('div[class*=overlay] div[class*=DropdownMenu]');

const label = el => {
  const node = el.querySelector('[aria-haspopup]');
  return node ? node.getAttribute('aria-label') || node.textContent : null;
};

const open = el => el.querySelector('[aria-haspopup]').getAttribute('aria-expanded') === 'true';

const visible = el => [el, el.querySelector(['[aria-haspopup]'])].every(isVisible);

const control = (shouldOpen = true) => async interactor => {
  let isOpen;
  await interactor.perform(el => {
    isOpen = open(el);
  });
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
    // if clicking a menu item will remove the present dropdown from the DOM,
    // then don't close it. (it doesn't exist, so it can't be closed, and trying
    // to interact with a non-existent item will just cause a test failure.)
    choose: async (interactor, value, ignoreClose = false) => {
      await interactor.open();
      await DropdownMenu({ visible: true })
        .find(ButtonInteractor(value))
        .click();
      if (!ignoreClose) {
        await interactor.close();
      }
    },
  });
