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
      searchQueries: [
        '388.14',
        'K347.9445',
        '839.83',
        'A 13.28:F 61/2/982 Glacier',
        'BJ1533.C5',
        'JK608',
        'TRANSL17827',
        'N972a 1968',
        'L33s:Oc1/2/996',
        '821.113.4-15',
        'VP111433',
      ],
      classificationOption: 'Library of Congress classification',
      querySearchOption: 'Query search',
      querySearchValue: 'classifications.classificationNumber=="BJ1533.C5"',
      instanceTitle: 'C468180 Browse by Classification Instance (has each classification type)',
      classificationIdentifierTypeIds: [
        CLASSIFICATION_IDENTIFIER_TYPES.LC,
        CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
      ],
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };
    const localClassificationIdentifierType = {
      name: `C468180 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468180*');

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
            (response) => {
              classificationIdentifierTypeId = response.body.id;
              ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
                testData.classificationBrowseId,
              ).then((types) => {
                testData.originalTypes = types;
              });
              ClassificationBrowse.updateIdentifierTypesAPI(
                testData.classificationBrowseId,
                testData.classificationBrowseAlgorithm,
                [...testData.classificationIdentifierTypeIds, classificationIdentifierTypeId],
              );
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
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
          InventorySearchAndFilter.verifyCallNumberBrowsePane();
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
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468180 Browse for classifications of Instance which has each classification type using "Library of Congress classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468180'] },
      () => {
        ['JK608', 'VP111433', 'BJ1533.C5'].forEach((callNumber) => {
          BrowseClassifications.waitForClassificationNumberToAppear(
            callNumber,
            testData.classificationBrowseId,
          );
        });
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            testData.classificationOption,
          );
          InventorySearchAndFilter.browseSearch(query);
          if (query === 'JK608' || query === 'VP111433') {
            InventorySearchAndFilter.verifySearchResult(query);
            InventorySearchAndFilter.clickResetAllButton();
          } else if (query === 'BJ1533.C5') {
            InventorySearchAndFilter.verifySearchResult(query);
            InventorySearchAndFilter.selectFoundItemFromBrowse(query);
            InventorySearchAndFilter.verifySearchOptionAndQuery(
              testData.querySearchOption,
              testData.querySearchValue,
            );
            InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
            InventorySearchAndFilter.switchToBrowseTab();
          } else {
            InventorySearchAndFilter.verifySearchResult(`${query}would be here`);
            InventorySearchAndFilter.clickResetAllButton();
          }
        });
      },
    );
  });
});
