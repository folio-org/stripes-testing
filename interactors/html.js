import { createInteractor, focused } from '@bigtest/interactor';

export default createInteractor('element')({
  selector: '*',
  locator: (el) => el.textContent,
  filters: {
    id: (el) => el.id,
    focused
  }
});
