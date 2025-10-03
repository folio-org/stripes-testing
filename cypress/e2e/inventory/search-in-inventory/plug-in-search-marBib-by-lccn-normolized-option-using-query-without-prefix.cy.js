import permissions from '../../../support/dictionary/permissions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      paymentMethod: 'EFT',
    };
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      manualPo: false,
    };
    let orderNumber;
    let user;
    let orderID;
    const lccnOption = 'LCCN, normalized';

    const searchQueryWithoutAsteriks = '79021425';
    const searchQueryWithAsteriks = '*79021425';

    const searchResultWithoutAsteriks = 'C442800 Test LCCN normalized record 10 (digits only)';
    const searchResultsWithAsteriks = [
      'C442800 Test LCCN normalized record 1 (two leading spaces, one trailing space, two internal spaces)',
      'C442800 Test LCCN normalized record 2 (one space internal)',
      'C442800 Test LCCN normalized record 3 (two spaces internal)',
      'C442800 Test LCCN normalized record 4 (one space trailing)',
      'C442800 Test LCCN normalized record 5 (two spaces trailing)',
      'C442800 Test LCCN normalized record 6 (one space leading)',
      'C442800 Test LCCN normalized record 7 (two spaces leading)',
      'C442800 Test LCCN normalized record 8 (two spaces everywhere)',
      'C442800 Test LCCN normalized record 9 (no spaces)',
    ];

    const marcFile = {
      marc: 'marcBibFileForC442800.mrc',
      fileName: `testMarcFileC442799.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
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
        permissions.inventoryAll.gui,
        permissions.uiOrdersCreate.gui,
        permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

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
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
          cy.reload();
          Orders.waitLoading();
        }, 20_000);
      });
    });

    after(() => {
      cy.getAdminToken();
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Orders.deleteOrderViaApi(orderID);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C442800 "Select instance" plug-in | Search for "MARC bibliographic" by "LCCN, normalized" option using a query without prefix (numbers only) when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C442800'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.clickTitleLookUp();
        InventorySearchAndFilter.instanceTabIsDefault();
        SelectInstanceModal.clickSearchOptionSelect();
        SelectInstanceModal.checkSearchOptionIncluded(lccnOption);

        InventorySearchAndFilter.instanceTabIsDefault();
        SelectInstanceModal.chooseSearchOption(lccnOption);
        SelectInstanceModal.searchByName(searchQueryWithoutAsteriks);
        InventorySearchAndFilter.verifySearchResult(searchResultWithoutAsteriks);
        SelectInstanceModal.chooseSearchOption(lccnOption);
        SelectInstanceModal.searchByName(searchQueryWithAsteriks);
        searchResultsWithAsteriks.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult);
        });
      },
    );
  });
});
