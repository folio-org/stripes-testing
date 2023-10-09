import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Helper from '../../support/fragments/finance/financeHelper';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import { ITEM_STATUS_NAMES } from '../../support/constants';

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
    cy.getAdminToken()
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 }).then(({ id, name }) => {
          materialTypeName = { id, name };
        });
        cy.getLocations({ limit: 2 });
        cy.getHoldingTypes({ limit: 2 });
        cy.getInstanceTypes({ limit: 1 });
      })
      .then(() => {
        const getTestItem = (numberOfPieces, hasDiscription, hasMissingPieces) => {
          const defaultItem = {
            barcode: Helper.getRandomBarcode(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
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
          holdings: [
            {
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: Cypress.env('locations')[0].id,
            },
          ],
          items: testItems,
        }).then((specialInstanceIds) => {
          testInstanceIds = specialInstanceIds;
        });
      });
    OtherSettings.setOtherSettingsViaApi({ prefPatronIdentifier: 'barcode,username' });
    cy.createTempUser([permissions.checkoutCirculatingItems.gui])
      .then((userProperties) => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaultServicePoint();
        ServicePoints.createViaApi(servicePoint);
        UserEdit.addServicePointViaApi(servicePoint.id, user.userId, servicePoint.id);
      })
      .then(() => {
        cy.getUsers({
          limit: 1,
          query: `"personal.lastName"="${user.username}" and "active"="true"`,
        }).then((users) => {
          userBarcode = users[0].barcode;
        });
        cy.login(user.username, user.password);
      });
  });

  after(() => {
    cy.wrap(
      testItems.forEach((item) => {
        CheckInActions.checkinItemViaApi({
          itemBarcode: item.barcode,
          servicePointId: servicePoint.id,
          checkInDate: new Date().toISOString(),
        });
      }),
    ).then(() => {
      cy.wrap(
        testInstanceIds.holdingIds.forEach((holdingsId) => {
          cy.wrap(
            holdingsId.itemIds.forEach((itemId) => {
              cy.deleteItemViaApi(itemId);
            }),
          ).then(() => {
            cy.deleteHoldingRecordViaApi(holdingsId.id);
          });
        }),
      ).then(() => {
        InventoryInstance.deleteInstanceViaApi(testInstanceIds.instanceId);
      });
      UserEdit.changeServicePointPreferenceViaApi(user.userId, [servicePoint.id]).then(() => {
        ServicePoints.deleteViaApi(servicePoint.id);
        Users.deleteViaApi(user.userId);
      });
    });
  });

  const fullCheckOut = ({
    barcode,
    numberOfPieces,
    descriptionOfPieces,
    numberOfMissingPieces,
    missingPieces,
  }) => {
    CheckOutActions.checkOutItem(barcode);
    MultipieceCheckOut.checkContent(
      instanceTitle,
      materialTypeName.name,
      barcode,
      { itemPieces: numberOfPieces, description: descriptionOfPieces },
      { missingitemPieces: numberOfMissingPieces, missingDescription: missingPieces },
    );
  };

  it('C591 Check out: multipiece items (vega)', { tags: [TestTypes.smoke, DevTeams.vega] }, () => {
    cy.visit(TopMenu.checkOutPath);
    Checkout.waitLoading();
    CheckOutActions.checkOutItemUser(userBarcode, testItems[0].barcode);
    CheckOutActions.checkPatronInformation(user.username, userBarcode);
    cy.expect(CheckOutActions.modal.absent());

    fullCheckOut(testItems[1]);
    MultipieceCheckOut.cancelModal();
    CheckOutActions.checkItem(testItems[1].barcode);

    fullCheckOut(testItems[1]);
    MultipieceCheckOut.confirmMultipleCheckOut(testItems[1].barcode);

    fullCheckOut(testItems[2]);
    MultipieceCheckOut.confirmMultipleCheckOut(testItems[2].barcode);

    fullCheckOut(testItems[3]);
    MultipieceCheckOut.confirmMultipleCheckOut(testItems[3].barcode);
  });
});
