import TopMenu from '../../../support/fragments/topMenu';
import Marigold from '../../../support/fragments/linked-data/marigold';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import Modals from '../../../support/fragments/modals';

describe('fse-marigold - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.linkedDataEditor,
      waiter: Marigold.waitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `FDOPS-6443 - Verify Marigold search returns results for LINKED_DATA instance from ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'ui', 'marigold', 'FDOPS-6443'] },
    () => {
      cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
      cy.getLinkedDataWorks('title=*').then(({ body }) => {
        if (!body.content?.length) {
          cy.log('No linked data works found; skipping Marigold search verification');
          return;
        }
        const title = body.content[0].titles[0].value;
        SearchAndFilter.verifyActiveButtons(false);
        SearchAndFilter.searchResourceByTitle(title);
        SearchAndFilter.checkSearchResultsByTitle(title);
      });
    },
  );
});
