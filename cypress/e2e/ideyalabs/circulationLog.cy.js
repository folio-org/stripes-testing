import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import marcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import topMenu from '../../support/fragments/topMenu';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import circulationlog from '../../support/ideyalabs/circulationlog';

const testData = {
  itemA: '4502015',
  barcode: '43505853',
  accordion: 'notice',
  checkboxOption: 'Send',
  resultsPaneHeadings: {
    userBarcode: 'User barcode',
    itemBarcode: 'Item barcode',
    object: 'Object',
    circAction: 'Circ action',
    date: 'Date',
    servicePoint: 'Service point',
    source: 'Source',
    description: 'Description'
  },
};

describe('CirculationLog App', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C17092 Filter circulation log by (notice) send (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    cy.visit(topMenu.circulationLogPath);
    searchPane.setFilterOptionFromAccordion(
      testData.accordion,
      testData.checkboxOption
    );
    searchPane.verifyResult(testData.checkboxOption);
    searchPane.resetFilters();
    searchPane.searchByItemBarcode(testData.barcode);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.userBarcode);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.itemBarcode);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.object);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.circAction);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.date);
    marcAuthorities.checkColumnExists(
      testData.resultsPaneHeadings.servicePoint
    );
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.source);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.description);
    searchPane.verifyResult(testData.checkboxOption);
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
