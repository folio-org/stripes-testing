import checkInActions from '../../support/fragments/check-in-actions/checkInActions';
import topMenu from '../../support/fragments/topMenu';
import checkInItems from '../../support/ideyaLabs/checkinitems';
import serviceShift from '../../support/ideyaLabs/serviceshift';

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
    { tags: ['ideaLabsTests'] },
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

  it('C9194 Check in: confirm check in for item status (vega)', { tags: ['ideaLabsTests'] }, () => {
    cy.visit(topMenu.circulationLogPath);
    checkInItems.declaredItem();
    cy.visit(topMenu.inventoryPath);
    checkInItems.withdrawn();
    cy.visit(topMenu.inventoryPath);
    checkInItems.lostAndPaid();
  });
});
