import TopMenu from '../../../support/fragments/topMenu';
import { Lists } from '../../../support/fragments/lists/lists';

describe('fse-lists - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.listsPath,
      waiter: Lists.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195764 - verify that lists page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'lists'] },
    () => {
      // check filters displayed
      Lists.filtersWaitLoading();
    },
  );
});
