import testTypes from '../../support/dictionary/testTypes';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import marcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import topMenu from '../../support/fragments/topMenu';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import circulationlog from '../../support/ideyaLabs/circulationlog';

const testData = {
  itemA: '4502015',
};

describe.skip('CirculationLog App', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C16999 Filter circulation log by Closed loan', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByStatus('Active');
    circulationlog.clickOnStatus();
    cy.visit(topMenu.checkInPath);
    circulationlog.checkIn(testData.itemA);
    cy.visit(topMenu.circulationLogPath);
    searchPane.searchByCheckedOut();
    searchPane.verifyClosedloanlist();
  });
});
