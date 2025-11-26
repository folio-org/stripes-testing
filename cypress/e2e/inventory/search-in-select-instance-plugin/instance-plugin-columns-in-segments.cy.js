import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import { INSTANCE_DATE_TYPES } from '../../../support/constants';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal, {
  COLUMN_HEADERS,
} from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const titlePrefix = `AT_C773229_FolioInstance ${getRandomPostfix()}`;
    const instanceTitles = [`${titlePrefix} A`, `${titlePrefix} B`];
    const contributor = `AT_C773229_Contrib ${getRandomPostfix()}`;
    const publisher = `AT_C773229_Publisher ${getRandomPostfix()}`;
    const date1 = '2001';
    const createdInstanceIds = [];
    let instanceAHrid;
    let instanceBHrid;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({
            vendorId: testData.organization.id,
          });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });
      }).then(() => {
        InventoryInstances.deleteInstanceByTitleViaApi(`${titlePrefix.split(' ')[0]}*`);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            cy.getInstanceDateTypesViaAPI().then((dateTypesResponse) => {
              const dateTypeId = dateTypesResponse.instanceDateTypes.find(
                (dt) => dt.name === INSTANCE_DATE_TYPES.NO,
              ).id;
              cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiOrdersCreate.gui])
                .then((userProperties) => {
                  testData.userProperties = userProperties;

                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: instanceTitles[0],
                      contributors: [
                        {
                          name: contributor,
                          contributorNameTypeId: contributorNameTypes[0].id,
                          contributorTypeId: null,
                          contributorTypeText: '',
                          primary: false,
                        },
                      ],
                      dates: {
                        dateTypeId,
                        date1,
                      },
                      publication: [
                        {
                          publisher,
                          place: '',
                          dateOfPublication: null,
                          role: '',
                        },
                      ],
                    },
                  }).then((instance) => {
                    createdInstanceIds.push(instance.instanceId);
                    cy.getInstanceById(instance.instanceId).then((instanceData) => {
                      instanceAHrid = instanceData.hrid;
                    });
                  });

                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: instanceTitles[1],
                    },
                  }).then((instance) => {
                    createdInstanceIds.push(instance.instanceId);
                    cy.getInstanceById(instance.instanceId).then((instanceData) => {
                      instanceBHrid = instanceData.hrid;
                    });
                  });
                })
                .then(() => {
                  cy.login(testData.userProperties.username, testData.userProperties.password, {
                    path: TopMenu.ordersPath,
                    waiter: Orders.waitLoading,
                  });
                  Orders.selectOrderByPONumber(testData.order.poNumber);
                  OrderDetails.selectAddPOLine();
                  OrderLineEditForm.clickTitleLookUpButton();
                });
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C773229 Select Instance plugin | Check what columns display in three segments: Instance, Holdings, Item (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C773229'] },
      () => {
        function searchAndVerifyColumns() {
          SelectInstanceModal.searchByName(instanceTitles[0]);
          SelectInstanceModal.validateSearchTableColumnsShown();
          [instanceTitles[0], contributor, `${publisher} `, date1, instanceAHrid].forEach(
            (value, index) => {
              InventorySearchAndFilter.validateColumnValueForSearchResult(
                COLUMN_HEADERS[index],
                value,
              );
            },
          );

          SelectInstanceModal.searchByName(instanceTitles[1]);
          SelectInstanceModal.validateSearchTableColumnsShown();
          [instanceTitles[1], '', '', '', instanceBHrid].forEach((value, index) => {
            InventorySearchAndFilter.validateColumnValueForSearchResult(
              COLUMN_HEADERS[index],
              value,
            );
          });
        }

        searchAndVerifyColumns();

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        SelectInstanceModal.checkResultsListEmpty();

        searchAndVerifyColumns();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        SelectInstanceModal.checkResultsListEmpty();

        searchAndVerifyColumns();
      },
    );
  });
});
