import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';


describe('Check in', () => {
  describe(
    'End to end scenarios',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const userData = {
        permissions: [
          permissions.checkinAll.gui,
          permissions.uiUsersViewLoans.gui,
          permissions.uiUsersView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.uiUsersfeefinesCRUD.gui,
        ],
      };
      let itemData;
      let servicePoint;
      let checkInResultsData;

      beforeEach('Create New Item, New User and Check out item', () => {
        itemData = {
          barcode: generateItemBarcode(),
          instanceTitle: `AT_C347631_Instance_${getRandomPostfix()}`,
        };
        checkInResultsData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

        cy.getAdminToken()
          .then(() => {
            ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
              servicePoint = sp;
              checkInResultsData.push(LOCATION_NAMES.MAIN_LIBRARY_UI);
            });
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              itemData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              itemData.holdingTypeId = res[0].id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              itemData.loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              itemData.materialTypeId = res.id;
              itemData.materialTypeName = res.name;
              checkInResultsData.push(`${itemData.instanceTitle} (${itemData.materialTypeName})`);
            });
            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
              itemData.mainLibraryLocationId = res.id;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: itemData.instanceTypeId,
                title: itemData.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: itemData.holdingTypeId,
                  permanentLocationId: itemData.mainLibraryLocationId,
                },
              ],
              items: [
                {
                  barcode: itemData.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: itemData.loanTypeId },
                  materialType: { id: itemData.materialTypeId },
                },
              ],
            });
          })
          .then((specialInstanceIds) => {
            itemData.testInstanceIds = specialInstanceIds;
          });

        cy.createTempUser(userData.permissions)
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: itemData.barcode,
              loanDate: moment.utc().format(),
              servicePointId: servicePoint.id,
              userBarcode: userData.barcode,
            });
            cy.wait(10000);
          });
      });

      afterEach('Delete New Service point, Item and User', () => {
        cy.getAdminToken(false);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C347631 Check in: Basic check in (vega)',
        { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C347631'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkInPath,
            waiter: CheckInActions.waitLoading,
          });
          CheckInActions.checkInItemGui(itemData.barcode);
          CheckInPane.verifyResultCells();
          CheckInPane.checkResultsInTheRow(checkInResultsData);
          CheckInActions.checkActionsMenuOptions();

          CheckInActions.openLoanDetails(userData.username);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          cy.wait(2000);
          CheckInActions.openPatronDetails(userData.username);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          cy.wait(2000);
          CheckInActions.openItemDetails(itemData.barcode);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          cy.wait(2000);
          CheckInActions.openNewFeeFinesPane();
        },
      );
    },
  );
});
