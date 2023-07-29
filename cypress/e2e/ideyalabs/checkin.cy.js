import checkInItems from '../../support/a_ideyalabs/checkInItems';
import serviceShift from '../../support/a_ideyalabs/serviceShift';
import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import checkInActions from '../../support/fragments/check-in-actions/checkInActions';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import topMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';

const barcode = getRandomPostfix();
const testData = {
  itemA: '14367843',
  itemB: '17276636',
  itemC: '123321',
  itemD: '65656565',
  numberOfPiecesItemA: '1',
  numberOfPiecesItemB: '2',
  description: 'pieces count',
};

describe('servicepoints shift', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C589 Check in items at service points for effective location (vega)', { tags: [testTypes.extendedPath, devTeams.vega] }, () => {
    serviceShift.servicePointsOne();
    cy.visit(topMenu.inventoryPath);
    checkInItems.createItem(barcode);
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(barcode);
    serviceShift.clickClose();
    checkInActions.openItemDetails();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(barcode);
    checkInItems.checkModal();
    serviceShift.servicePointsTwo();
    cy.visit(topMenu.inventoryPath);
    checkInItems.createItem(barcode);
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(barcode);
    checkInItems.checkModal();
  });

  it('C9194 Check in: confirm check in for item status (vega)', { tags: [testTypes.criticalPath, devTeams.vega] }, () => {
    cy.visit(topMenu.circulationLogPath);
    checkInItems.declaredItem();
    cy.visit(topMenu.inventoryPath);
    checkInItems.withdrawn();
    cy.visit(topMenu.inventoryPath);
    checkInItems.lostAndPaid();
  });

  it('C17137 - Filter circulation log by renewed through override (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    cy.visit(topMenu.circulationLogPath);
    searchPane.checkBarcode();
  });

  it('C590 Check in: multipiece items (vega)', { tags: [testTypes.extendedPath, devTeams.vega] }, () => {
    cy.visit(topMenu.checkInPath);
    checkInItems.checkIn(testData.itemA);
    checkInActions.openItemDetails(testData.itemA);
    checkInActions.editItemDetails(testData.numberOfPiecesItemA, '', '');
    cy.visit(topMenu.checkInPath);
    checkInItems.cancelCheckInMultipleItem(testData.itemB);
    checkInItems.checkIn(testData.itemB);
    checkInActions.openItemDetails(testData.itemB);
    checkInActions.editItemDetails(
      testData.numberOfPiecesItemA,
      '',
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemB);
    checkInItems.checkIn(testData.itemC);
    checkInActions.openItemDetails(testData.itemC);
    checkInActions.editItemDetails(
      testData.numberOfPiecesItemB,
      testData.numberOfPiecesItemA,
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemC);
    checkInItems.checkIn(testData.itemD);
    checkInActions.openItemDetails(testData.itemD);
    checkInActions.editItemDetails(
      '',
      testData.numberOfPiecesItemA,
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemD);
  });
});
