import { Button } from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

export default {
  close:() => {
    cy.do(Button({ icon: 'times' }).click());
    eHoldingsPackages.waitLoading();
  }
};
