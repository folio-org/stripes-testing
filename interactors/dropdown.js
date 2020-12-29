import { createInteractor } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';

import ButtonInteractor from './button';

const DropdownTrigger = createInteractor('dropdown trigger')({
  selector: '[aria-haspopup]',
  filters: ButtonInteractor().specification.filters,
  actions: ButtonInteractor().specification.actions,
});

const DropdownMenu = createInteractor('dropdown menu')({
  selector: 'div[class*=DropdownMenu]',
  filters: {
    visible: isVisible,
  }
});

const label = el => el.querySelector('[aria-haspopup]').textContent;

const open = el => el.querySelector('[aria-haspopup]').getAttribute('aria-expanded') === 'true';

// todo: 'visible' should ensure the DropdownMenu is visible as well,
// once filters support interactor composition
const visible = el => [el, el.querySelector(['[aria-haspopup]'])].every(isVisible);

const control = (shouldOpen = true) => async interactor => {
  let isOpen;
  await interactor.perform(el => { isOpen = open(el); });
  if (isOpen !== shouldOpen) {
    await interactor.toggle();
  }
};

export default createInteractor('dropdown')({
  selector: 'div[class*=dropdown]',
  locator: label,
  filters: { label, open, visible },
  actions: {
    focus: interactor => interactor.find(DropdownTrigger()).focus(),
    toggle: interactor => interactor.find(DropdownTrigger()).click(),
    open: control(true),
    close: control(false),
    choose: async (interactor, value) => {
      await interactor.open();
      await DropdownMenu({ visible: true }).find(ButtonInteractor(value)).click();
      await interactor.close();
    },
  }
});
