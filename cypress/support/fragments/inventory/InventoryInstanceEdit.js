import { Button, Section } from '../../../../interactors';

const closeButton = Button({ icon: 'times' });

export default {
  close:() => cy.do(closeButton.click()),
  waitLoading:() => cy.expect(Section({ id: 'instance-form' }).exists())
};
