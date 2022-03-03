import { PaneHeader } from '../../../../../interactors';



export default {
  waitLoading:() => cy.expect(PaneHeader({id: ''})),
};
