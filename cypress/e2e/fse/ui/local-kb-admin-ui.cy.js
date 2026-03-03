import TopMenu from '../../../support/fragments/topMenu';
import LocalKbAdmin from '../../../support/fragments/local-kbAdmin/localKbAdmin';

describe('fse-local-kbAdmin - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.localKbAdmin,
      waiter: LocalKbAdmin.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195333 - verify that marc local KB admin page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    // TOOD: return 'folio_local-kb-admin' tag later, investigation on the module installation needed
    { tags: ['fse', 'ui', 'local-kb-admin', 'TC195333'] },
    () => {
      LocalKbAdmin.waitLoading();
    },
  );
});
