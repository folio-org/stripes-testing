import { Pane } from '../../../interactors';
import TopMenu from '../../support/fragments/topMenu';

describe('Circulation log', () => {
  beforeEach('login', () => {
    cy.loginAsAdmin();
  });

  // TODO: think about redesign and moving checking inside another test
  it(
    'C15483 Select and open the Circulation log app (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      cy.visit(TopMenu.circulationLogPath);

      cy.expect(Pane({ title: 'Circulation log' }).exists());
    },
  );
});
