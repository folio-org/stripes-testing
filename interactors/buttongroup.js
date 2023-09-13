import { Button } from '@interactors/html';
import HTML from './baseHTML';

export default HTML.extend('button group')
  .selector('[class^=buttonGroup-]')
  .filters({
    buttonCount: (el) => el.querySelectorAll('button, a').length,
  })
  .actions({
    click: ({ find }, label) => find(Button(label)).perform((el) => el.click()),
  });
