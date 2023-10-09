import checkInItems from '../../support/ideyaLabs/checkinitems';
import serviceShift from '../../support/ideyaLabs/serviceshift';
import testTypes from '../../support/dictionary/testTypes';
import checkInActions from '../../support/fragments/check-in-actions/checkInActions';
import topMenu from '../../support/fragments/topMenu';

const testData = {
  itemA: '14367843',
  itemB: '17276636',
  itemC: '123321',
  itemD: '65656565',
  numberOfPiecesItemA: '1',
  numberOfPiecesItemB: '2',
  description: 'pieces count',
};

describe.skip('servicepoints shift', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C589 Check in items at service points for effective location (vega)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      serviceShift.servicePointsOne();
      cy.visit(topMenu.inventoryPath);
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(testData.itemA);
      checkInItems.checkModal();
      serviceShift.servicePointsTwo();
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(testData.itemB);
      checkInItems.checkModal();
    },
  );

  it(
    'C9194 Check in: confirm check in for item status (vega)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.circulationLogPath);
      checkInItems.declaredItem();
      cy.visit(topMenu.inventoryPath);
      checkInItems.withdrawn();
      cy.visit(topMenu.inventoryPath);
      checkInItems.lostAndPaid();
    },
  );

  it('C590 Check in: multipiece items (vega)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.checkInPath);
    checkInItems.checkIn(testData.itemA);
    checkInActions.openItemDetails(testData.itemA);
    checkInActions.editItemDetails(testData.numberOfPiecesItemA, '', '');
    cy.visit(topMenu.checkInPath);
    checkInItems.cancelCheckInMultipleItem(testData.itemB);
    checkInItems.checkIn(testData.itemB);
    checkInActions.openItemDetails(testData.itemB);
    checkInActions.editItemDetails(testData.numberOfPiecesItemA, '', testData.description);
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemB);
    checkInItems.checkIn(testData.itemC);
    checkInActions.openItemDetails(testData.itemC);
    checkInActions.editItemDetails(
      testData.numberOfPiecesItemB,
      testData.numberOfPiecesItemA,
      testData.description,
    );
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemC);
    checkInItems.checkIn(testData.itemD);
    checkInActions.openItemDetails(testData.itemD);
    checkInActions.editItemDetails('', testData.numberOfPiecesItemA, testData.description);
    cy.visit(topMenu.checkInPath);
    checkInItems.checkInMultipleItem(testData.itemD);
  });
});
