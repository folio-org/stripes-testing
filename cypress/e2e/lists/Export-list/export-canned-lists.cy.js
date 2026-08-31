import moment from 'moment';
import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../support/fragments/lists/lists';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';

describe('Lists', () => {
  describe('Export query', () => {
    const userData = {};
    const patronData = {};
    const itemData = {};
    let servicePoint;

    before('Create test data', () => {
      cy.getAdminToken()

        .then(() => {
          // make sure there are no duplicate records in the system
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411810');
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
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: itemData.instanceTypeId,
              title: `AT_C411810_Instance_${getRandomPostfix()}`,
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

        // make sure that "Inactive patrons with open loans" list has at least one matched record
        cy.loginAsAdmin({
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openExpiredPatronLoanList();
        Lists.openActions();
        Lists.refreshList();
        Lists.waitForCompilingToComplete(5000);
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
      Lists.waitForCompilingToComplete(5000);
    });

    it(
      'C411810 Export list: Canned lists (athena)',
      { tags: ['smoke', 'athena', 'C411810', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openExpiredPatronLoanList();
        Lists.openActions();
        Lists.exportList();
        cy.contains(
          'Export of Inactive patrons with open loans is being generated. This may take some time for larger lists.',
        );
        cy.contains('List Inactive patrons with open loans was successfully exported to CSV.');
      },
    );
  });
});
