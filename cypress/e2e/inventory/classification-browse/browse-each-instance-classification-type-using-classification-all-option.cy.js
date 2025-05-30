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
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: [
        {
          instanceTitle: 'C468150 Search by Classification Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          classificationValue: '598.099',
        },
        {
          instanceTitle: 'C468150 Search by Classification Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
          classificationValue: 'HT154',
        },
        {
          instanceTitle: 'C468150 Search by Classification Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
          classificationValue: 'DD259.4 .B527 1973',
        },
        {
          instanceTitle:
            'C468150 Search by Classification Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
          classificationValue: 'HD3492.H8',
        },
        {
          instanceTitle: 'C468150 Search by Classification Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
          classificationValue: 'L37.s:Oc1/2/991',
        },
      ],
      marcRecordsTitlesAndClassifications: [
        {
          instanceTitle: 'C468150 Search by Classification Instance 3 - Dewey',
          classificationValue: '598.0994',
        },
        {
          instanceTitle: 'C468150 Search by Classification Instance 4 - GDC',
          classificationValue: 'HEU/G74.3C49',
        },
        {
          instanceTitle: 'C468150 Search by Classification Instance 5 - LC',
          classificationValue: 'QS 11 .GA1 E53 2005',
        },
        {
          instanceTitle: 'C468150 Search by Classification Instance 8 - NLM',
          classificationValue: 'SB945.A5',
        },
        {
          instanceTitle: 'C468150 Search by Classification Instance 10 - UDC ',
          classificationValue: '631.321:631.411.3',
        },
      ],
      classificationOption: 'Classification (all)',
      localInstnaceClassificationValue: 'VP000321',
      instanceTitleWithLocalClassification: 'C468150 Search by Classification Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };
    const marcFile = {
      marc: 'marcBibFileForC468150.mrc',
      fileName: `testMarcFileC468150.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdRecordIDs = [];
    const localClassificationIdentifierType = {
      name: `C468150 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
    let user;
    const search = (query, expectedResult) => {
      InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
      InventorySearchAndFilter.browseSearch(query);
      InventorySearchAndFilter.verifySearchResult(expectedResult);
      InventorySearchAndFilter.clickResetAllButton();
    };

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468150*');

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
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

        cy.getAdminToken();
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
              [...Object.values(CLASSIFICATION_IDENTIFIER_TYPES), classificationIdentifierTypeId],
            );
          },
        );

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
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
      });
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
      'C468150 Each Classification identifier type could be found in the browse result list by "Classification (all)" browse option when all identifier types are selected in settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468150'] },
      () => {
        [...testData.folioInstances, ...testData.marcRecordsTitlesAndClassifications].forEach(
          (instance) => {
            BrowseClassifications.waitForClassificationNumberToAppear(instance.classificationValue);
          },
        );
        testData.folioInstances.forEach((folioInstance) => {
          search(folioInstance.classificationValue, folioInstance.classificationValue);
        });
        testData.marcRecordsTitlesAndClassifications.forEach((marcInstance) => {
          search(marcInstance.classificationValue, marcInstance.classificationValue);
        });
        search(
          testData.localInstnaceClassificationValue,
          testData.localInstnaceClassificationValue,
        );
      },
    );
  });
});
