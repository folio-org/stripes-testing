import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { CLASSIFICATION_IDENTIFIER_TYPES } from '../../../support/constants';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const testData = {
      instances: [
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 3 - Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 4 - GDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.GDC,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 5 - LC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 8 - NLM',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NLM,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
        },
        {
          instanceTitle:
            'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 10 - UDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.UDC,
        },
      ],
      classificationOption: 'Dewey Decimal classification',
      classificationValue: 'test004. HD',
      querySearchOption: 'Query search',
      instanceTitleWithLocalClassification:
        'C468159 Browse by Class-on (different inst-s with same class-on value) Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[1].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[1].algorithm,
    };
    const createdRecordIDs = [];
    const localClassificationIdentifierType = {
      name: `C468159 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468159*');

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
            (response) => {
              classificationIdentifierTypeId = response.body.id;
            },
          );

          ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
            testData.classificationBrowseId,
          ).then((types) => {
            testData.originalTypes = types;
          });
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY],
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
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
          InventorySearchAndFilter.verifyCallNumberBrowsePane();
          BrowseClassifications.waitForClassificationNumberToAppear(
            testData.classificationValue,
            testData.classificationBrowseId,
          );
        },
      );
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        testData.originalTypes,
      );
      ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468159 Browse for classification which has the same value but different classification types using "Dewey Decimal classification" browse option when only "Dewey" classification type is selected in Settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468159'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        InventorySearchAndFilter.browseSearch(testData.classificationValue);
        BrowseClassifications.verifySearchResultsTable();
        BrowseClassifications.verifyRowValueIsBold(5, testData.classificationValue);
        BrowseClassifications.verifyNumberOfTitlesInRow(5, '1');

        BrowseClassifications.selectFoundValueByRow(5, testData.classificationValue);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.classificationValue}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instances[2].instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
      },
    );
  });
});
