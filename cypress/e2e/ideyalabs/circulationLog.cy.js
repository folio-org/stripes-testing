import circulationlog from '../../support/a_ideyalabs/circulationlog';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import marcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import topMenu from '../../support/fragments/topMenu';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Create a new MARC Holdings record for existing Instance record', () => {
  before('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  const testdata = {
    item_A: '4502015',
  };
  const testData = {
    barcode: '43505853',
    accordion: 'notice',
    checkboxOption: 'Send',
    resultsPaneHeadings:{
      userBarcode: 'User barcode',
      itemBarcode: 'Item barcode',
      object: 'Object',
      circAction: 'Circ action',
      date: 'Date',
      servicePoint: 'Service point',
      source: 'Source',
      description: 'Description'
    }
  };

  it('C17092 Filter circulation log by (notice) send', () => {
    cy.visit(topMenu.circulationLogPath);
    searchPane.setFilterOptionFromAccordion(testData.accordion, testData.checkboxOption);
    searchPane.resetFilters();
    searchPane.searchByItemBarcode(testData.barcode);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.userBarcode);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.itemBarcode);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.object);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.circAction);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.date);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.servicePoint);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.source);
    marcAuthorities.checkColumnExists(testData.resultsPaneHeadings.description);
  });

  it('C16999 Filter circulation log by Closed loan', () => {
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByStatus('Active');
    circulationlog.clickstatus();
    cy.visit(topMenu.checkInPath);
    cy.checkIn(testdata.item_A);
    cy.visit(topMenu.circulationLogPath);
    searchPane.searchByCheckedOut();
  });
});
