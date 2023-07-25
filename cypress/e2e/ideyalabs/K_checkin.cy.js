import checkInItems from '../../support/a_ideyalabs/checkInItems';
import serviceshift from '../../support/a_ideyalabs/serviceShift';
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
  itemAnumberOfPieces: '1',
  itemnumberOfPieces: '2',
  description: 'pieces count',
};

describe('servicepoints shift', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C589 Check in items at service points for effective location', () => {
    serviceshift.servicePointsOne();
    cy.visit(topMenu.inventoryPath);
    checkInItems.createInstance(barcode);
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(barcode);
    serviceshift.clickClose();
    checkInActions.openItemDetails();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(barcode);
    checkInItems.clickonModal();
    serviceshift.servicePointsTwo();
    cy.visit(topMenu.inventoryPath);
    checkInItems.createInstance(barcode);
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(barcode);
    serviceshift.clickClose();
    checkInActions.openItemDetails();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(barcode);
    checkInItems.clickonModal();
  });

  it('C9194 Check in: confirm check in for item status', () => {
    cy.visit(topMenu.circulationLogPath);
    checkInItems.declaredItem();
    cy.visit(topMenu.inventoryPath);
    checkInItems.withdrawn();
    cy.visit(topMenu.inventoryPath);
    checkInItems.lostAndPaid();
  });

  it('C17137 - Filter circulation log by renewed through override', () => {
    cy.visit(topMenu.circulationLogPath);
    searchPane.checkbarcode();
  });

  it('C590 Check in: multipiece items', () => {
    cy.visit(topMenu.checkInPath);
    checkInItems.checkIn(testData.itemA);
    checkInActions.openItemDetails(testData.itemA);
    checkInActions.editItemDetails(testData.itemAnumberOfPieces, '', '');
    cy.visit(topMenu.checkInPath);
    checkInItems.cancelCheckInMultipleItem(testData.itemB);
    checkInItems.checkIn(testData.itemB);
    checkInActions.openItemDetails(testData.itemB);
    checkInActions.editItemDetails(
      testData.itemnumberOfPieces,
      '',
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemB);
    checkInItems.checkIn(testData.itemC);
    checkInActions.openItemDetails(testData.itemC);
    checkInActions.editItemDetails(
      testData.itemnumberOfPieces,
      testData.itemAnumberOfPieces,
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemC);
    checkInItems.checkIn(testData.itemD);
    checkInActions.openItemDetails(testData.itemD);
    checkInActions.editItemDetails(
      '',
      testData.itemnumberOfPieces,
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemD);
  });
});
