import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import { Pane } from '../../../interactors';
import devTeams from '../../support/dictionary/devTeams';

describe('circulation-log', () => {
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  // TODO: think about redesign and moving checking inside another test
  it(
    'C15483 Select and open the Circulation log app (firebird)',
    { tags: [TestTypes.smoke, devTeams.firebird] },
    () => {
      cy.visit(TopMenu.circulationLogPath);

      cy.expect(Pane({ title: 'Circulation log' }).exists());
    },
  );
});
