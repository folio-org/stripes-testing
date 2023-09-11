import { HTML as BaseHTML } from '@interactors/html';

export default BaseHTML.filters({
  element: (element) => element,
  role: (element) => element.getAttribute('role'),
});
