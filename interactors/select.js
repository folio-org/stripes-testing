import { Select as SelectInteractor, createInteractor } from '@bigtest/interactor';

export default createInteractor('select')({
  ...SelectInteractor().specification,
  filters: {
    errorClass: (el) => el.className.contains('error--'),
    ...SelectInteractor().specification.filters,
  }
});
