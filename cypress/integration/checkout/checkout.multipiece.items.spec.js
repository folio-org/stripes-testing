import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Helper from '../../support/fragments/finance/financeHelper';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';
import ConfirmMultipieceCheckOutModal from '../../support/fragments/checkout/confirmMultipieceCheckOutModal';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import UsersEditPage from '../../support/fragments/users/usersEditPage';
import Checkout from '../../support/fragments/checkout/checkout';
import inventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('Check Out', () => {
  let user = {};
  let userBarcode = '';
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  const testItems = [];
  const defautlDescriptionOfPiece = `autotest_description_${getRandomPostfix()}`;
  const missingPieceDescription = `autotest_description_${getRandomPostfix()}`;
  let servicePoint;
  let testInstanceIds;

  beforeEach(() => {
    let source;

    cy.createTempUser([
      permissions.checkoutCirculatingItems.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaulServicePoint();
        ServicePoints.createViaApi(servicePoint.body);
        UsersEditPage.addServicePointToUser([servicePoint.body.id],
          user.userId, servicePoint.body.id);
      })
      .then(() => {
        cy.login(user.username, user.password, { path: TopMenu.checkOutPath, waiter: Checkout.waitLoading });
        cy.getAdminToken().then(() => {
          cy.getLoanTypes({ limit: 1 });
          cy.getMaterialTypes({ limit: 1 });
          cy.getLocations({ limit: 2 });
          cy.getHoldingTypes({ limit: 2 });
          source = InventoryHoldings.getHoldingSources({ limit: 1 });
          cy.getInstanceTypes({ limit: 1 });
          cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
            .then((users) => {
              userBarcode = users[0].barcode;
            });
        }).then(() => {
          const getTestItem = (specialNumberOfPieces, discriptionOfPiece = defautlDescriptionOfPiece, hasMissingPieces) => {
            const defaultItem = {
              barcode: Helper.getRandomBarcode(),
              numberOfPieces: specialNumberOfPieces,
              status: { name: 'Available' },
              permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
              materialType: { id: Cypress.env('materialTypes')[0].id },
              discriptionOfPiece
            };
            if (hasMissingPieces) {
              defaultItem.numberOfMissingPieces = '2';
              defaultItem.missingPieces = missingPieceDescription;
            }
            return defaultItem;
          };
          testItems.push(getTestItem('1', true, false));
          testItems.push(getTestItem('3', true, false));
          testItems.push(getTestItem('2', true, true));
          testItems.push(getTestItem('1', false, true));
          inventoryInstances.createInstanceWithGivenIdsViaApi({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: instanceTitle
            },
            holdings: [{
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: Cypress.env('locations')[0].id,
              sourceId: source.id
            }],
            items: [testItems],
          })
            .then(specialInstanceIds => {
              testInstanceIds = specialInstanceIds;
            });
        });
      });
  });

  /* after(() => {
    testInstanceIds.itemIds.forEach(id => cy.deleteItem(id));
    cy.deleteHoldingRecord(testInstanceIds.holdingsId);
    cy.deleteInstanceApi(testInstanceIds.instanceId);
    // TODO delete service
    cy.deleteUser(user.userId);
  }); */

  it('C591 Check out: multipiece items', { tags: [TestTypes.smoke] }, () => {
    const dash = '-';

    CheckOutActions.checkIsInterfacesOpened();
    /* CheckOutActions.checkOutItem(userBarcode, testItems[0].barcode);
    CheckOutActions.checkPatronInformation(user.username, userBarcode);
    CheckOutActions.checkConfirmMultipieceCheckOutModal();
    CheckOutActions.checkOutItem(userBarcode, testItems[1].barcode);
    ConfirmMultipieceCheckOutModal.checkIsModalConsistOf(instanceTitle, testItems[1].numberOfPieces, descriptionOfPiece);
    ConfirmMultipieceCheckOutModal.checkIsNotModalConsistOf();
    ConfirmMultipieceCheckOutModal.cancelModal();
    CheckOutActions.checkOutItem(userBarcode, testItems[1].barcode);
    ConfirmMultipieceCheckOutModal.checkIsModalConsistOf(instanceTitle, testItems[1].numberOfPieces, descriptionOfPiece);
    ConfirmMultipieceCheckOutModal.confirmMultiplePiecesItemModal();
    CheckOutActions.checkOutItem(userBarcode, testItems[2].barcode);
    ConfirmMultipieceCheckOutModal.checkIsModalConsistOf(instanceTitle, testItems[2].numberOfPieces, descriptionOfPiece);
    ConfirmMultipieceCheckOutModal.checkMissingPiecesInModal(testItems[2].numberOfMissingPieces, missingPieceDescription);
    ConfirmMultipieceCheckOutModal.confirmMultiplePiecesItemModal();
    CheckOutActions.checkOutItem(userBarcode, testItems[3].barcode);
    ConfirmMultipieceCheckOutModal.checkIsModalConsistOf(instanceTitle, testItems[3].numberOfPieces, dash);
    ConfirmMultipieceCheckOutModal.checkMissingPiecesInModal(testItems[3].numberOfMissingPieces, missingPieceDescription);
    ConfirmMultipieceCheckOutModal.confirmMultiplePiecesItemModal(); */
  });
});
