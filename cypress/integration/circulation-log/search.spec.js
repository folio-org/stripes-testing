import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../support/utils/stringTools';

const instanceName = `test_${getRandomPostfix()}`;
const itemBarcode = `123${getRandomPostfix()}`;

describe('Circulation log filters', () => {
  before('create inventory instance', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryInstance.createNewInventoryInstance(instanceName);
    InventoryInstance.addHoldingToInventoryInstance();
    InventoryInstance.addItemToInventoryInstance(itemBarcode);
    InventoryInstance.addRequestForItem(itemBarcode);
  });

  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.circulationLogPath);
  });


  it.only('C15484 Filter circulation log on item barcode', { tags: [TestTypes.smoke] }, () => {
    SearchPane.searchByItemBarcode(itemBarcode);
    SearchPane.verifyResultCells();
  });

  it('C16976 Filter circulation log by date', { tags: [TestTypes.smoke] }, () => {
    const verifyDate = true;

    SearchPane.filterByLastWeek();
    SearchPane.verifyResultCells(verifyDate);
  });
});
