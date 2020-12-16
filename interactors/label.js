import { createInteractor } from '@bigtest/interactor';

export default createInteractor('label')({
  selector: 'label',
  locator: (el) => el.textContent,
  filters: {
    for: (el) => el.htmlFor,
    id: (el) => el.id,
  }

});
