import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      searchQueries: [
        'HD1691.I51968',
        '  HD1691.I51968',
        'HD1691.I51968  ',
        'HD1691.  I51968',
        '  HD  1691.  I51968  ',
      ],
      searchResults: [
        'C466168 Search by Classification Instance (space checks) - Instance 1 (no spaces)',
        'C466168 Search by Classification Instance (space checks) - Instance 2 (leading spaces)',
        'C466168 Search by Classification Instance (space checks) - Instance 3 (trailing spaces)',
        'C466168 Search by Classification Instance (space checks) - Instance 4 (internal spaces)',
        'C466168 Search by Classification Instance (space checks) - Instance 5 (spaces everywhere)',
      ],
      classificationOption: 'Classification, normalized',
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      paymentMethod: 'EFT',
    };
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      manualPo: false,
    };
    let orderNumber;
    let orderID;
    let user;

    const marcFile = {
      marc: 'marcBibFileForC466168.mrc',
      fileName: `testMarcFileC466168.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdRecordIDs = [];

    before('Create user, test data', () => {
      cy.getAdminToken();
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
        order.vendor = response;
      });

      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        orderID = response.body.id;
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.getUserToken(user.username, user.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.clickTitleLookUp();
        InventorySearchAndFilter.instanceTabIsDefault();
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(orderID);
      Organizations.deleteOrganizationViaApi(organization.id);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466168 Find Instance plugin | Search by "Classification, normalized" search option using queries with spaces (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466168'] },
      () => {
        SelectInstanceModal.clickSearchOptionSelect();
        testData.searchQueries.forEach((query) => {
          SelectInstanceModal.chooseSearchOption(testData.classificationOption);
          SelectInstanceModal.searchByName(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkDefaultSearchOptionSelected();
          SelectInstanceModal.checkTableContent();
        });
      },
    );
  });
});
