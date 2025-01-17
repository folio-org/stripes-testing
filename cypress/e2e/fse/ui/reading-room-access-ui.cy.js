import TopMenu from '../../../support/fragments/topMenu';
import ReadingRoom from '../../../support/fragments/reading-room/readingRoom';

describe('fse-reading-room-access - UI for productions tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.readingRoom,
      waiter: ReadingRoom.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195705 - verify that reading-room page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['ramsons', 'fse', 'ui', 'reading-room'] },
    () => {
      ReadingRoom.checkFieldsDisplayed();
    },
  );
});
