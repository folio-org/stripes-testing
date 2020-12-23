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

export default createInteractor('dropdown')({
  selector: 'div[class*=dropdown]',
  locator: el => el.querySelector('[aria-haspopup]').textContent,
  filters: {
    open: el => el.querySelector('[aria-haspopup]').getAttribute('aria-expanded') === 'true',
    visible: el => [el, el.querySelector(['[aria-haspopup]'])].every(isVisible),
  },
  actions: {
    focus: interactor => interactor.find(DropdownTrigger()).focus(),
    toggle: interactor => interactor.find(DropdownTrigger()).click(),
    choose: async (interactor, value) => {
      await interactor.find(DropdownTrigger()).click();
      await DropdownMenu({ visible: true }).find(ButtonInteractor(value)).click();
    },
  }
});
