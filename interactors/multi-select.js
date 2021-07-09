import { HTML } from '@bigtest/interactor';
import Button from './button';

export const MultiSelectOption = HTML.extend('multi select option')
  .selector('[class^=multiSelectOption-]')
  .locator(el => el.querySelector('[class^=optionSegment-]').textContent || '');

export default HTML.extend('multi select')
  .selector('[class^=multiSelectControlWrapper-]')
  .actions({
    click: ({ find }) => find(Button({ ariaLabel: 'open menu' })).click()
  });
