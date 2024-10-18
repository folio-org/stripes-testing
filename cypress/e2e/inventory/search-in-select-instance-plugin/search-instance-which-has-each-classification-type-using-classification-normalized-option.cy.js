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
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { CLASSIFICATION_IDENTIFIER_TYPES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      searchQueries: [
        '388.13',
        'K347.9444',
        '839.82',
        'A 13.28:F 61/2/981 Glacier',
        'BJ1533.C4',
        'JK609',
        'TRANSL17828',
        'N972a 1969',
        'L33s:Oc1/2/995',
        '821.113.4-14',
        'VP111432',
      ],
      classificationOption: 'Classification, normalized',
      instanceTitle: 'C466166 Search by Classification Instance (has each classification type)',
    };
    const localClassificationIdentifierType = {
      name: `C466166 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
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
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
          (response) => {
            classificationIdentifierTypeId = response.body.id;
          },
        );

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceTitle,
                classifications: [
                  {
                    classificationNumber: testData.searchQueries[0],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
                  },
                  {
                    classificationNumber: testData.searchQueries[1],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
                  },
                  {
                    classificationNumber: testData.searchQueries[2],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
                  },
                  {
                    classificationNumber: testData.searchQueries[3],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.GDC,
                  },
                  {
                    classificationNumber: testData.searchQueries[4],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
                  },
                  {
                    classificationNumber: testData.searchQueries[5],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
                  },
                  {
                    classificationNumber: testData.searchQueries[6],
                    classificationTypeId:
                      CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
                  },
                  {
                    classificationNumber: testData.searchQueries[7],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.NLM,
                  },
                  {
                    classificationNumber: testData.searchQueries[8],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
                  },
                  {
                    classificationNumber: testData.searchQueries[9],
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.UDC,
                  },
                  {
                    classificationNumber: testData.searchQueries[10],
                    classificationTypeId: classificationIdentifierTypeId,
                  },
                ],
              },
            }).then((instance) => {
              testData.instanceId = instance.instanceId;
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
      ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466166 Find Instance plugin | Search for Instance which has each classification type using "Classification, normalized" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466166'] },
      () => {
        SelectInstanceModal.clickSearchOptionSelect();
        testData.searchQueries.forEach((query) => {
          SelectInstanceModal.chooseSearchOption(testData.classificationOption);
          SelectInstanceModal.searchByName(query);
          InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkDefaultSearchOptionSelected();
          SelectInstanceModal.checkTableContent();
        });
      },
    );
  });
});
