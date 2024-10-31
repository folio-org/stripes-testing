import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { CLASSIFICATION_IDENTIFIER_TYPES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      instances: [
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 3 - Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 4 - GDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.GDC,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 5 - LC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 8 - NLM',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NLM,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
        },
        {
          instanceTitle:
            'C466148 Search by Class-on (different inst-s with same class-on value) Instance 10 - UDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.UDC,
        },
      ],
      classificationOption: 'Classification, normalized',
      classificationValue: 'test003. HD',
      instanceTitleWithLocalClassification:
        'C466148 Search by Class-on (different inst-s with same class-on value) Instance 11 - Local',
    };
    const createdRecordIDs = [];
    const localClassificationIdentifierType = {
      name: `C466148 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
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
            testData.instances.forEach((instanceValues) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: instanceValues.instanceTitle,
                  classifications: [
                    {
                      classificationNumber: testData.classificationValue,
                      classificationTypeId: instanceValues.classificationType,
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
                    classificationNumber: testData.classificationValue,
                    classificationTypeId: classificationIdentifierTypeId,
                  },
                ],
              },
            }).then((instance) => {
              createdRecordIDs.push(instance.instanceId);
            });
          });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.instanceTabIsDefault();
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466148 Search for Instances which have different classification types using "Classification, normalized" search option and one query (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466148'] },
      () => {
        InventorySearchAndFilter.selectSearchOption(testData.classificationOption);
        InventorySearchAndFilter.executeSearch(testData.classificationValue);
        testData.instances.forEach((query) => {
          InventorySearchAndFilter.verifySearchResult(query.instanceTitle);
        });
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitleWithLocalClassification);
      },
    );
  });
});
