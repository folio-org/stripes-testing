import topMenu from '../../support/fragments/topMenu';
import serviceshift from '../../support/a_ideyalabs/serviceshift';
import checkInActions from '../../support/fragments/check-in-actions/checkInActions';
import inventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import checkinitems from '../../support/a_ideyalabs/checkinitems';

const item_A = '13575447';
const testData = {
  item_A : '14367843',
  item_B : '17276636',
  item_C : '123321',
  item_D : '65656565',
  itemAnumberOfPieces: '1',
  itemnumberOfPieces: '2',
  description: 'pieces count'
};

describe('servicepoints shift', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  xit('C589 Check in items at service points for effective location', () => {
    serviceshift.servicepoints1();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(item_A);
    serviceshift.servicepoints2();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(item_A);
  });

  it('C9194 Check in: confirm check in for item status', () => {
    cy.visit(topMenu.inventoryPath);
    inventorySearchAndFilter.switchToItem();
    checkinitems.declareditem();

    cy.visit(topMenu.inventoryPath);
    checkinitems.withdrawn();

    cy.visit(topMenu.inventoryPath);
    checkinitems.lostandpaid();
  });


  it('C17137 - Filter circulation log by renewed through override', () => {
    cy.visit(topMenu.circulationLogPath);
    searchPane.checkbarcode();
  });
  it('C590 Check in: multipiece items', () => {
    cy.visit(topMenu.checkInPath);
    cy.checkIn(testData.item_A);
    checkInActions.openItemDetails(testData.item_A);
    checkInActions.editItemDetails(testData.itemAnumberOfPieces, '', '');
    cy.visit(topMenu.checkInPath);

    cy.cancelCheckInMultipleItem(testData.item_B);

    cy.checkIn(testData.item_B);
    cy.wait(2000);
    checkInActions.openItemDetails(testData.item_B);
    checkInActions.editItemDetails(
      testData.itemnumberOfPieces,
      '',
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    cy.checkInMultipleItem(testData.item_B);
    cy.wait(3000);

    cy.checkIn(testData.item_C);
    cy.wait(4000);
    checkInActions.openItemDetails(testData.item_C);
    checkInActions.editItemDetails(
      testData.itemnumberOfPieces,
      testData.itemAnumberOfPieces,
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    cy.checkInMultipleItem(testData.item_C);
    cy.wait(3000);

    cy.checkIn(testData.item_D);
    cy.wait(4000);
    checkInActions.openItemDetails(testData.item_D);
    checkInActions.editItemDetails(
      '',
      testData.itemnumberOfPieces,
      testData.description
    );
    cy.visit(topMenu.checkInPath);
    cy.checkInMultipleItem(testData.item_D);
  });
});


