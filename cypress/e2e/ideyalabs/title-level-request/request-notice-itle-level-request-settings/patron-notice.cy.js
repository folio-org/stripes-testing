import titleLevelRequests from '../../../../support/fragments/settings/circulation/titleLevelRequests';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import testTypes from '../../../../support/dictionary/testTypes';

const patronData = {
  notice1: 'Requested item - available',
  notice2: 'Test TLR',
  notice3: 'Requested item - available',
};

describe.skip('Orders: Receiving and Check-in ', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C350428 Patron notice (Vega)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(SettingsMenu.circulationTitleLevelRequestsPath);
    titleLevelRequests.selectConfirmationNoticeDropdown({
      notice1: patronData.notice1,
    });
    titleLevelRequests.selectCancelleationNoticeDropdown({
      notice2: patronData.notice2,
    });
    titleLevelRequests.selectExpirationNoticeDropdown({
      notice3: patronData.notice3,
    });
    titleLevelRequests.clickOnSaveButton();
    titleLevelRequests.checkUpdateTLRCalloutAppeared();
  });
});
