import moment from 'moment';
import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../support/fragments/lists/lists';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Refresh lists', () => {
    const userData = {};
    const patronData = {};
    const itemData = {};
    let servicePoint;

    before('Create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken()
        .then(() => {
          // make sure there are no duplicate records in the system
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411820');
          ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
            servicePoint = sp;
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
          });
          Locations.getViaApiAnyDefault().then((locations) => {
            itemData.locationId = locations[0].id;
          });
        })
        .then(() => {
          itemData.barcode = generateItemBarcode();
          itemData.barcode2 = generateItemBarcode();
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: itemData.instanceTypeId,
              title: `AT_C411820_Instance_${getRandomPostfix()}`,
            },
            holdings: [
              {
                holdingsTypeId: itemData.holdingTypeId,
                permanentLocationId: itemData.locationId,
              },
            ],
            items: [
              {
                barcode: itemData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: itemData.loanTypeId },
                materialType: { id: itemData.materialTypeId },
              },
              {
                barcode: itemData.barcode2,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: itemData.loanTypeId },
                materialType: { id: itemData.materialTypeId },
              },
            ],
          });
        });

      cy.createTempUser([])
        .then((userProperties) => {
          patronData.userId = userProperties.userId;
          patronData.barcode = userProperties.barcode;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePoint.id, patronData.userId, servicePoint.id);
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: itemData.barcode,
            loanDate: moment.utc().format(),
            servicePointId: servicePoint.id,
            userBarcode: patronData.barcode,
          });
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: itemData.barcode2,
            loanDate: moment.utc().format(),
            servicePointId: servicePoint.id,
            userBarcode: patronData.barcode,
          });
          cy.getUsers({ limit: 1, query: `"id"="${patronData.userId}"` }).then((users) => {
            const user = users[0];
            user.active = false;
            cy.updateUser(user);
          });
        });

      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      Users.deleteViaApi(patronData.userId);
      Users.deleteViaApi(userData.userId);
      cy.loginAsAdmin({
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.waitLoading();
      Lists.resetAllFilters();
      Lists.openExpiredPatronLoanList();
      Lists.openActions();
      Lists.refreshList();
      Lists.viewUpdatedList();
    });

    it(
      'C411820 Refresh list: Canned lists (athena)',
      { tags: ['smoke', 'athena', 'C411820'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openExpiredPatronLoanList();
        Lists.getNumberOfFoundRecordsFromPaneHeader('Inactive patrons with open loans').then(
          (numberOfRecords) => {
            const numberOfRecordsBeforeRefresh = numberOfRecords;
            Lists.openActions();
            Lists.refreshList();
            Lists.viewUpdatedList();
            Lists.verifyResultCellByIdentifier(itemData.barcode, 'User — Active', 'False');
            Lists.verifyResultCellByIdentifier(itemData.barcode2, 'User — Active', 'False');
            Lists.getNumberOfFoundRecordsFromPaneHeader('Inactive patrons with open loans').then(
              (recordsAfterRefresh) => {
                const numberOfRecordsAfterRefresh = recordsAfterRefresh;

                expect(numberOfRecordsAfterRefresh).to.be.greaterThan(numberOfRecordsBeforeRefresh);

                Lists.verifyRecordsNumber(numberOfRecordsAfterRefresh);
              },
            );
          },
        );
      },
    );
  });
});
