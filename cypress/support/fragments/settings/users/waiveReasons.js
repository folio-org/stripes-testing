import { Section } from '../../../../../interactors';

const rootPaneset = Section({ id:'controlled-vocab-pane' });

export default {
  waitLoading:() => cy.expect(rootPaneset.exists()),
};
