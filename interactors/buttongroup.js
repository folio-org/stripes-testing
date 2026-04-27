import { Button } from '@interactors/html';
import HTML from './baseHTML';

export default HTML.extend('button group')
  .selector('[class^=buttonGroup-]')
  .filters({
    buttonCount: (el) => el.querySelectorAll('button, a').length,
    selectedTab: (el) => {
      const selected = el.querySelector('[aria-selected="true"]');
      return selected ? selected.textContent.trim() : null;
    },
  })
  .actions({
    click: ({ find }, label) => find(Button(label)).perform((el) => el.click()),
  });
