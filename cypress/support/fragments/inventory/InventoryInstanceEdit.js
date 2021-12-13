import { Button } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const closeButton = Button({ icon: 'times' });

export default {
  close:() => cy.do(closeButton.click()),
  // TODO: add ID and redesign to interactors
  waitLoading:() => cy.xpath('//form[contains(@class, "instanceForm")]/div/section', getLongDelay()).should('be.visible')
};
