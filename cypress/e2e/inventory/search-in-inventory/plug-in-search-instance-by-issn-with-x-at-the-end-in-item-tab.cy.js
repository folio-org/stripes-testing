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
    const testData = {
      issnOption: 'ISSN',
      defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID, barcode)',
      issnPositiveSearchQueries: ['0040-782X', '0040-782x', '0040-782*', '*-782x'],
      issnNegativeSearchQuery: '0040-782A',
      searchResults: [
        'C451462 (MSEARCH672 test ISSN upper case, record 1) Time.',
        'C451462 (MSEARCH672 test ISSN lower case, record 2) Time.',
        'C451462 (MSEARCH672 test invalid ISSN upper case, record 3) Time.',
        'C451462 (MSEARCH672 test invalid ISSN lower case, record 4) Time.',
        'C451462 (MSEARCH672 test linking ISSN upper case, record 5) Time.',
        'C451462 (MSEARCH672 test linking ISSN lower case, record 6) Time.',
      ],
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
    let user;
    let orderID;

    const marcFile = {
      marc: 'marcBibFileForC451462.mrc',
      fileName: `testMarcFileC451462.${getRandomPostfix()}.mrc`,
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

        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
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
      'C451462 Find Instance plugin | Search for "Instance" record by "ISSN" value with "X" at the end using "ISSN" search option (Item tab) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C451462'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.clickTitleLookUp();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        SelectInstanceModal.clickSearchOptionSelect();
        SelectInstanceModal.checkSearchOptionIncluded(testData.issnOption);

        testData.issnPositiveSearchQueries.forEach((query) => {
          SelectInstanceModal.chooseSearchOption(testData.issnOption);
          SelectInstanceModal.searchByName(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkDefaultSearchOptionSelected();
          SelectInstanceModal.checkTableContent();
        });
        SelectInstanceModal.chooseSearchOption(testData.issnOption);
        SelectInstanceModal.searchByName(testData.issnNegativeSearchQuery);
        SelectInstanceModal.checkNoRecordsFound(testData.issnNegativeSearchQuery);
      },
    );
  });
});
