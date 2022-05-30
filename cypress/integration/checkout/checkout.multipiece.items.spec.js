import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Helper from '../../support/fragments/finance/financeHelper';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';
import ConfirmMultipieceCheckOutModal from '../../support/fragments/checkout/confirmMultipieceCheckOutModal';
import UsersEditPage from '../../support/fragments/users/usersEditPage';
import Checkout from '../../support/fragments/checkout/checkout';
import inventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('Check Out', () => {
  let user = {};
  let userBarcode;
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  const testItems = [];
  const defautlDescription = `autotest_description_${getRandomPostfix()}`;
  const mis = { quantity: '2',
    des: defautlDescription };
  let servicePoint;
  let materialTypeName;

  beforeEach(() => {
    cy.getAdminToken().then(() => {
      cy.getLoanTypes({ limit: 1 });
      cy.getMaterialTypes({ limit: 1 })
        .then(({ id, name }) => {
          materialTypeName = { id, name };
        });
      cy.getLocations({ limit: 2 });
      cy.getHoldingTypes({ limit: 2 });
      cy.getInstanceTypes({ limit: 1 });
    }).then(() => {
      const getTestItem = (hasNumberOfPieces, hasDiscription, hasMissingPieces) => {
        const defaultItem = {
          barcode: Helper.getRandomBarcode(),
          status:  { name: 'Available' },
          permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
          materialType: { id: materialTypeName.id },
        };
        if (hasNumberOfPieces) {
          defaultItem.numberOfPieces = '-';
        }
        if (hasDiscription) {
          defaultItem.descriptionOfPieces = defautlDescription;
        }
        if (hasMissingPieces) {
          defaultItem.numberOfMissingPieces = '2';
          defaultItem.missingPieces = defautlDescription;
        }
        return defaultItem;
      };
      testItems.push(getTestItem('1', true, false));
      testItems.push(getTestItem('3', true, false));
      testItems.push(getTestItem('2', true, true));
      testItems.push(getTestItem('1', false, true));
      testItems.push(getTestItem('1', false, true));
      inventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: Cypress.env('instanceTypes')[0].id,
          title: instanceTitle,
        },
        holdings: [{
          holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
          permanentLocationId: Cypress.env('locations')[0].id,
        }],
        items: testItems,
      });
    });

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
        cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
          .then((users) => {
            userBarcode = users[0].barcode;
          });
        cy.login(user.username, user.password, { path: TopMenu.checkOutPath, waiter: Checkout.waitLoading });
      });
  });

  /* after(() => {
    cy.wrap(testInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecord(holdingsId.id);
      });
    })).then(() => {
      cy.deleteInstanceApi(testInstanceIds.instanceId);
    });
    // TODO delete service
    cy.deleteUser(user.userId);
  }); */

  it('C591 Check out: multipiece items', { tags: [TestTypes.smoke] }, () => {
    /* CheckOutActions.checkIsInterfacesOpened();
    CheckOutActions.checkOutItem(userBarcode, testItems[0].barcode);
    CheckOutActions.checkPatronInformation(user.username, userBarcode);
    CheckOutActions.checkConfirmMultipieceCheckOutModal();
    CheckOutActions.checkOutItem(userBarcode, testItems[1].barcode);
    ConfirmMultipieceCheckOutModal.checkContent(instanceTitle, materialTypeName.name, testItems[1].barcode, testItems[1].numberOfPieces, defautlDescription);
    ConfirmMultipieceCheckOutModal.cancelModal();
    CheckOutActions.checkOutItem(userBarcode, testItems[1].barcode);
    ConfirmMultipieceCheckOutModal.checkContent(instanceTitle, materialTypeName.name, testItems[1].barcode, testItems[1].numberOfPieces, defautlDescription);
    ConfirmMultipieceCheckOutModal.confirmMultipleCheckOut(); */
    // CheckOutActions.checkOutItem(userBarcode, testItems[2].barcode);
    // ConfirmMultipieceCheckOutModal.checkContent(instanceTitle, materialTypeName.name, testItems[2].barcode, testItems[2].numberOfPieces, defautlDescription, { quantity, defautlDescription });
    // ConfirmMultipieceCheckOutModal.confirmMultipleCheckOut();
    CheckOutActions.checkOutItem(userBarcode, testItems[3].barcode);
    ConfirmMultipieceCheckOutModal.checkContent(instanceTitle, materialTypeName.name, testItems[3].barcode, mis.quantity, mis.defautlDescription, testItems[3].numberOfPieces);
    ConfirmMultipieceCheckOutModal.confirmMultipleCheckOut();
  });
});
