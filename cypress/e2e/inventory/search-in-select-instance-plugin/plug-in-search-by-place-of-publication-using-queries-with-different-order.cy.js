import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      searchItem: [
        {
          searchOption: 'Place of publication',
          searchValue: 'Burlingtonauto, Massachusettsauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Burlingtonauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Massachusettsauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Burlingtonauto Massachusettsauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Massachusettsauto, Burlingtonauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Burlingtonauto, Massachusettsauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Burlingtonauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Massachusettsauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Burlingtonauto Massachusettsauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Massachusettsauto, Burlingtonauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Massachusettsauto, Burlingtonauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Burlingtonauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Massachusettsauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Burlingtonauto Massachusettsauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Massachusettsauto, Burlingtonauto',
        },
      ],
      searchResult: 'C496185 Tabletop game design for video game designers',
    };

    const marcFile = {
      marc: 'marcBibFileForC496185.mrc',
      fileName: `testMarcFileC496185.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
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
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.getUserToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });

        cy.login(testData.user.username, testData.user.password, {
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

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(orderID);
      Organizations.deleteOrganizationViaApi(organization.id);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C496185 Select Instance plugin | Search for Instance by "Place of publication" field using queries with different order of search terms (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C496185'] },
      () => {
        testData.searchItem.forEach((item) => {
          SelectInstanceModal.chooseSearchOption(item.searchOption);
          SelectInstanceModal.searchByName(item.searchValue);
          InventorySearchAndFilter.verifySearchResultIncludingValue(testData.searchResult);
          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkDefaultSearchOptionSelected();
          SelectInstanceModal.checkTableContent();
        });
      },
    );
  });
});
