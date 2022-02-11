import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import { MultiColumnListCell } from '../../../interactors';


describe('navigate to circulation log', () => {
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.circulationLogPath);
  });


  it('C15484 Filter circulation log on item barcode', { tags: [TestTypes.smoke] }, () => {
    SearchPane.filterByLastWeek();

    cy.do(
      // get existing item barcode from results
      MultiColumnListCell({ row: 0, columnIndex: 1 }).perform(element => {
        const itemBarcode = element.textContent;

        SearchPane.resetFilters();
        SearchPane.searchByItemBarcode(itemBarcode);
      })
    );

    SearchPane.verifyResultCells();
  });

  it('C16976 Filter circulation log by date', { tags: [TestTypes.smoke] }, () => {
    const verifyDate = true;

    SearchPane.filterByLastWeek();
    SearchPane.verifyResultCells(verifyDate);
  });
});
