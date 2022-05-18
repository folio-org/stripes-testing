/// <reference types="cypress" />

import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Helper from '../../support/fragments/finance/financeHelper';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';
import ConfirmMultiplePiecesItemCheckOut from '../../support/fragments/checkout/confirmMultiplePiecesItemCheckOut';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';

describe('Check Out', () => {
  let user = {};
  const FIRST_ITEM_BARCODE = Helper.getRandomBarcode();
  const SECOND_ITEM_BARCODE = Helper.getRandomBarcode();
  const THIRD_ITEM_BARCODE = Helper.getRandomBarcode();
  const FOURTH_ITEM_BARCODE = Helper.getRandomBarcode();
  let userBarcode = '';
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  const quantityPiecesForSecondItem = '3';
  const quantityPiecesForThirdItem = '2';
  const quantityPiecesForFourthItem = '1';
  const quantityOfMissingPieces = '2';
  const descriptionOfPiece = `autotest_description_${getRandomPostfix()}`;
  const missingPieceDescription = `autotest_description_${getRandomPostfix()}`;
  let servicePoint;

  beforeEach(() => {
    cy.createTempUser([
      permissions.checkoutCirculatingItems.gui
    ])
      .then(userProperties => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaulServicePoint();
        ServicePoints.createViaApi(servicePoint.body);
        cy.addServicePointToUser([servicePoint.body.id],
          user.userId, servicePoint.body.id);
      })
      .then(() => {
        cy.login(user.username, user.password);
        cy.visit(TopMenu.inventoryPath);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 2 });
            cy.getHoldingTypes({ limit: 2 });
            cy.getHoldingSources({ limit: 2 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
              .then((users) => {
                userBarcode = users[0].barcode;
              });
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: instanceTitle,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: Cypress.env('holdingSources')[0].id,
              }],
              items: [
                [
                  {
                    barcode: FIRST_ITEM_BARCODE,
                    numberOfPieces: '1',
                    status: { name: 'Available' },
                    descriptionOfPieces: descriptionOfPiece,
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                  {
                    barcode: SECOND_ITEM_BARCODE,
                    numberOfPieces: quantityPiecesForSecondItem,
                    status: { name: 'Available' },
                    descriptionOfPieces: descriptionOfPiece,
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                  {
                    barcode: THIRD_ITEM_BARCODE,
                    numberOfPieces: quantityPiecesForThirdItem,
                    status: { name: 'Available' },
                    descriptionOfPieces: descriptionOfPiece,
                    numberOfMissingPieces: quantityOfMissingPieces,
                    missingPieces: missingPieceDescription,
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                  {
                    barcode: FOURTH_ITEM_BARCODE,
                    numberOfPieces: quantityPiecesForFourthItem,
                    status: { name: 'Available' },
                    numberOfMissingPieces: quantityOfMissingPieces,
                    missingPieces: missingPieceDescription,
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                ],
              ],
            });
          });
      });
  });

  after('Delete all data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${FIRST_ITEM_BARCODE}"` })
      .then(instance => {
        instance.items.forEach(item => {
          cy.deleteItem(item.id);
        });
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    SwitchServicePoint.changeServicePointPreference();
    cy.deleteServicePoint(servicePoint.body.id);
    cy.deleteUser(user.userId);
  });

  it('C591 Check out: multipiece items', { tags: [TestTypes.smoke] }, () => {
    const dash = '-';

    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkIsInterfacesOpened();
    CheckOutActions.checkOutItem(userBarcode, FIRST_ITEM_BARCODE);
    CheckOutActions.checkPatronInformation(user.username, userBarcode);
    CheckOutActions.checkOutItem(userBarcode, SECOND_ITEM_BARCODE);
    ConfirmMultiplePiecesItemCheckOut.checkIsModalConsistOf(instanceTitle, quantityPiecesForSecondItem, descriptionOfPiece);
    ConfirmMultiplePiecesItemCheckOut.cancelModal();
    CheckOutActions.checkOutItem(userBarcode, SECOND_ITEM_BARCODE);
    ConfirmMultiplePiecesItemCheckOut.checkIsModalConsistOf(instanceTitle, quantityPiecesForSecondItem, descriptionOfPiece);
    ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
    CheckOutActions.checkOutItem(userBarcode, THIRD_ITEM_BARCODE);
    ConfirmMultiplePiecesItemCheckOut.checkIsModalConsistOf(instanceTitle, quantityPiecesForThirdItem, descriptionOfPiece);
    ConfirmMultiplePiecesItemCheckOut.checkMissingPiecesInModal(quantityOfMissingPieces, missingPieceDescription);
    ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
    CheckOutActions.checkOutItem(userBarcode, FOURTH_ITEM_BARCODE);
    ConfirmMultiplePiecesItemCheckOut.checkIsModalConsistOf(instanceTitle, quantityPiecesForFourthItem, dash);
    ConfirmMultiplePiecesItemCheckOut.checkMissingPiecesInModal(quantityOfMissingPieces, missingPieceDescription);
    ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
  });
});
