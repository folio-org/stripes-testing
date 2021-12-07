import { Button, Section } from '../../../../interactors';

const rootElement = Section('form[class*=instanceForm]>div>section');
const closeButton = Button({ icon: 'times' });

export default {
  close:() => cy.do(closeButton.click())
};
