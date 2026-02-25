import TopMenu from '../../../support/fragments/topMenu';
import oaSearchAndFilter from '../../../support/fragments/oa/oaSearchAndFilter';
import oaNewPublicationRequest from '../../../support/fragments/oa/oaNewPublicationRequest';

describe('fse-oa - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.oaPath,
      waiter: oaSearchAndFilter.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC196024 - verify that Open access page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'oa', 'mod-oa', 'TC196024'] },
    () => {
      // check that new publication request page can be opened
      oaNewPublicationRequest.openNewPublicationRequest();
    },
  );
});
