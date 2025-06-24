import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  CLASSIFICATION_IDENTIFIER_TYPES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      folioInstances: [
        {
          instanceTitle: 'C466162 Search by Classification Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          classificationValue: '598.099466162',
        },
        {
          instanceTitle: 'C466162 Search by Classification Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
          classificationValue: 'HT154466162',
        },
        {
          instanceTitle: 'C466162 Search by Classification Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
          classificationValue: 'DD259.4 .B527 1973466162',
        },
        {
          instanceTitle:
            'C466162 Search by Classification Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
          classificationValue: 'HD3492.H8466162',
        },
        {
          instanceTitle: 'C466162 Search by Classification Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
          classificationValue: 'L37.s:Oc1/2/991466162',
        },
      ],
      marcRecordsTitlesAndClassifications: [
        {
          instanceTitle: 'C466162 Search by Classification Instance 3 - Dewey',
          classificationValue: '598.0994466162',
        },
        {
          instanceTitle: 'C466162 Search by Classification Instance 4 - GDC',
          classificationValue: 'HEU/G74.3C49466162',
        },
        {
          instanceTitle: 'C466162 Search by Classification Instance 5 - LC',
          classificationValue: 'QS 11 .GA1 E53 2005466162',
        },
        {
          instanceTitle: 'C466162 Search by Classification Instance 8 - NLM',
          classificationValue: 'SB945.A5466162',
        },
        {
          instanceTitle: 'C466162 Search by Classification Instance 10 - UDC',
          classificationValue: '631.321:631.411.3466162',
        },
      ],
      classificationOption: 'Classification, normalized',
      localInstnaceClassificationValue: 'VP000321466162',
      instanceTitleWithLocalClassification: 'C466162 Search by Classification Instance 11 - Local',
    };
    const marcFile = {
      marc: 'marcBibFileForC466162.mrc',
      fileName: `testMarcFileC466162.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdRecordIDs = [];
    const localClassificationIdentifierType = {
      name: `C466162 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
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
    let classificationIdentifierTypeId;
    let user;
    const search = (query, expectedResult) => {
      SelectInstanceModal.chooseSearchOption(testData.classificationOption);
      SelectInstanceModal.searchByName(query);
      InventorySearchAndFilter.verifySearchResultIncludingValue(expectedResult);
      SelectInstanceModal.clickResetAllButton();
      SelectInstanceModal.checkDefaultSearchOptionSelected();
      SelectInstanceModal.checkTableContent();
    };

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C466162*');

      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
        order.vendor = response;
      });

      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        orderID = response.body.id;
      });

      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        },
      );

      ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
        (response) => {
          classificationIdentifierTypeId = response.body.id;
        },
      );

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersCreate.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          })
          .then(() => {
            testData.folioInstances.forEach((folioInstance) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: folioInstance.instanceTitle,
                  classifications: [
                    {
                      classificationNumber: folioInstance.classificationValue,
                      classificationTypeId: folioInstance.classificationType,
                    },
                  ],
                },
              }).then((instance) => {
                createdRecordIDs.push(instance.instanceId);
              });
            });
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceTitleWithLocalClassification,
                classifications: [
                  {
                    classificationNumber: testData.localInstnaceClassificationValue,
                    classificationTypeId: classificationIdentifierTypeId,
                  },
                ],
              },
            }).then((instance) => {
              createdRecordIDs.push(instance.instanceId);
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
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466162 Find Instance plugin | Search for each Instance classification type using "Classification, normalized" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466162'] },
      () => {
        testData.folioInstances.forEach((folioInstance) => {
          search(folioInstance.classificationValue, folioInstance.instanceTitle);
        });
        testData.marcRecordsTitlesAndClassifications.forEach((marcInstance) => {
          search(marcInstance.classificationValue, marcInstance.instanceTitle);
        });
        search(
          testData.localInstnaceClassificationValue,
          testData.instanceTitleWithLocalClassification,
        );
      },
    );
  });
});
