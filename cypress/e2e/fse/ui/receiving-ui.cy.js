import TopMenu from '../../../support/fragments/topMenu';
import Receiving from '../../../support/fragments/receiving/receiving';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import Modals from '../../../support/fragments/modals';

describe('fse-receiving - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.receivingPath,
      waiter: Receiving.verifyPageDisplayed,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
    // change session locale to English (temporary action, won't affect tenant settings)
    Localization.selectAmericanEnglish();
    // close service point modal if it appears switching locale
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `TC195378 - verify that receiving page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'receiving', 'TC195378'] },
    () => {
      Receiving.verifySearchAndActionsAvailable();
    },
  );
});
