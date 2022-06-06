import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Helper from '../../support/fragments/finance/financeHelper';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import UsersEditPage from '../../support/fragments/users/usersEditPage';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';

describe('Check Out', () => {
  let user = {};
  let userBarcode;
  let servicePoint;
  let materialTypeName;
  let testInstanceIds;
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  const testItems = [];
  const defautlDescription = `autotest_description_${getRandomPostfix()}`;

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
      const getTestItem = (numberOfPieces, hasDiscription, hasMissingPieces) => {
        const defaultItem = {
          barcode: Helper.getRandomBarcode(),
          status:  { name: 'Available' },
          permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
          materialType: { id: materialTypeName.id },
        };
        if (numberOfPieces) {
          defaultItem.numberOfPieces = numberOfPieces;
        }
        if (hasDiscription) {
          defaultItem.descriptionOfPieces = defautlDescription;
        }
        if (hasMissingPieces) {
          defaultItem.numberOfMissingPieces = 2;
          defaultItem.missingPieces = defautlDescription;
        }
        return defaultItem;
      };
      testItems.push(getTestItem(1, false, false));
      testItems.push(getTestItem(3, true, false));
      testItems.push(getTestItem(2, true, true));
      testItems.push(getTestItem(1, false, true));
      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: Cypress.env('instanceTypes')[0].id,
          title: instanceTitle,
        },
        holdings: [{
          holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
          permanentLocationId: Cypress.env('locations')[0].id,
        }],
        items: testItems,
      })
        .then(specialInstanceIds => {
          testInstanceIds = specialInstanceIds;
        });
    });

    cy.createTempUser([
      permissions.checkoutCirculatingItems.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaulServicePoint();
        ServicePoints.createViaApi(servicePoint.body);
        UsersEditPage.addServicePointsToUser([servicePoint.body.id],
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

  after(() => {
    testItems.forEach(item => {
      CheckInActions.checkInItem(item.barcode);
    });
    cy.wrap(testInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecord(holdingsId.id);
      });
    })).then(() => {
      cy.deleteInstanceApi(testInstanceIds.instanceId);
    });
    SwitchServicePoint.changeServicePointPreference(user.username);
    cy.deleteServicePoint(servicePoint.body.id);
    Users.deleteViaApi(user.userId);
  });

  it('C591 Check out: multipiece items', { tags: [TestTypes.smoke] }, () => {
    CheckOutActions.checkIsInterfacesOpened();
    CheckOutActions.checkOutItem(userBarcode, testItems[0].barcode);
    CheckOutActions.checkPatronInformation(user.username, userBarcode);
    CheckOutActions.checkConfirmMultipieceCheckOut();

    CheckOutActions.checkOutItem(userBarcode, testItems[1].barcode);
    MultipieceCheckOut.checkContent(instanceTitle, materialTypeName.name, testItems[1].barcode,
      { itemPieces : testItems[1].numberOfPieces, description :testItems[1].descriptionOfPieces },
      { missingitemPieces : testItems[1].numberOfMissingPieces, missingDescription: testItems[1].missingPieces });
    MultipieceCheckOut.cancelModal();
    CheckOutActions.checkItemstatus(testItems[1].barcode);

    CheckOutActions.checkOutItem(userBarcode, testItems[1].barcode);
    MultipieceCheckOut.checkContent(instanceTitle, materialTypeName.name, testItems[1].barcode,
      { itemPieces : testItems[1].numberOfPieces, description :testItems[1].descriptionOfPieces },
      { missingitemPieces : testItems[1].numberOfMissingPieces, missingDescription: testItems[1].missingPieces });
    MultipieceCheckOut.confirmMultipleCheckOut(testItems[1].barcode);

    CheckOutActions.checkOutItem(userBarcode, testItems[2].barcode);
    MultipieceCheckOut.checkContent(instanceTitle, materialTypeName.name, testItems[2].barcode,
      { itemPieces : testItems[2].numberOfPieces, description :testItems[2].descriptionOfPieces },
      { missingitemPieces : testItems[2].numberOfMissingPieces, missingDescription: testItems[2].missingPieces });
    MultipieceCheckOut.confirmMultipleCheckOut(testItems[2].barcode);

    CheckOutActions.checkOutItem(userBarcode, testItems[3].barcode);
    MultipieceCheckOut.checkContent(instanceTitle, materialTypeName.name, testItems[3].barcode,
      { itemPieces : testItems[3].numberOfPieces, description :testItems[3].descriptionOfPieces },
      { missingitemPieces : testItems[3].numberOfMissingPieces, missingDescription: testItems[3].missingPieces });
    MultipieceCheckOut.confirmMultipleCheckOut(testItems[3].barcode);
  });
});
