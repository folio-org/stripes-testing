import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  CLASSIFICATION_IDENTIFIER_TYPES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
  defaultClassificationBrowseNames,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import DataImport from '../../../support/fragments/data_import/dataImport';

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
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        [...testData.folioInstances, ...testData.marcRecordsTitlesAndClassifications].forEach(
          (instance) => {
            BrowseClassifications.waitForClassificationNumberToAppear(
              instance.classificationValue,
              testData.classificationBrowseId,
            );
          },
        );
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

  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: [
        {
          instanceTitle: 'C468155 Search by Classification Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          classificationValue: '598.099',
        },
        {
          instanceTitle: 'C468155 Search by Classification Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
          classificationValue: 'HT154',
        },
        {
          instanceTitle: 'C468155 Search by Classification Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
          classificationValue: 'DD259.4 .B527 1973',
        },
        {
          instanceTitle:
            'C468155 Search by Classification Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
          classificationValue: 'HD3492.H8',
        },
        {
          instanceTitle: 'C468155 Search by Classification Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
          classificationValue: 'L37.s:Oc1/2/991',
        },
      ],
      marcRecordsTitlesAndClassifications: [
        {
          instanceTitle: 'C468155 Search by Classification Instance 3 - Dewey',
          classificationValue: '598.0994',
        },
        {
          instanceTitle: 'C468155 Search by Classification Instance 4 - GDC',
          classificationValue: 'HEU/G74.3C49',
        },
        {
          instanceTitle: 'C468155 Search by Classification Instance 5 - LC',
          classificationValue: 'QS 11 .GA1 E53 2005',
        },
        {
          instanceTitle: 'C468155 Search by Classification Instance 8 - NLM',
          classificationValue: 'SB945.A5',
        },
        {
          instanceTitle: 'C468155 Search by Classification Instance 10 - UDC ',
          classificationValue: '631.321:631.411.3',
        },
      ],
      classificationOption: 'Classification (all)',
      localInstnaceClassificationValue: 'VP000321',
      instanceTitleWithLocalClassification: 'C468155 Search by Classification Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468155.mrc',
      fileName: `testMarcFileC468155.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdRecordIDs = [];

    const localClassificationIdentifierType = {
      name: `C468155 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;

    let user;

    const search = (query, isNegative = true) => {
      InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
      InventorySearchAndFilter.browseSearch(query);
      if (isNegative) {
        InventorySearchAndFilter.verifySearchResult(`${query}would be here`);
      } else {
        InventorySearchAndFilter.verifySearchResult(query);
      }
      InventorySearchAndFilter.clickResetAllButton();
    };

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468155*');

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
            ClassificationBrowse.updateIdentifierTypesAPI(
              testData.classificationBrowseId,
              testData.classificationBrowseAlgorithm,
              [classificationIdentifierTypeId],
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
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.localInstnaceClassificationValue,
          testData.classificationBrowseId,
        );
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        [],
      );
      ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468155 Only one Classification identifier type could be found in the browse result list by "Classification (all)" browse option when only one Classification identifier type is selected in settings (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C468155'] },
      () => {
        testData.folioInstances.forEach((folioInstance) => {
          search(folioInstance.classificationValue);
        });
        testData.marcRecordsTitlesAndClassifications.forEach((marcInstance) => {
          search(marcInstance.classificationValue);
        });
        search(testData.localInstnaceClassificationValue, false);
      },
    );
  });

  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: [
        {
          instanceTitle: 'C468156 Search by Classification Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          classificationValue: '598.099',
        },
        {
          instanceTitle: 'C468156 Search by Classification Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
          classificationValue: 'HT154',
        },
        {
          instanceTitle: 'C468156 Search by Classification Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
          classificationValue: 'DD259.4 .B527 1973',
        },
        {
          instanceTitle:
            'C468156 Search by Classification Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
          classificationValue: 'HD3492.H8',
        },
        {
          instanceTitle: 'C468156 Search by Classification Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
          classificationValue: 'L37.s:Oc1/2/991',
        },
      ],
      marcRecordsTitlesAndClassifications: [
        {
          instanceTitle: 'C468156 Search by Classification Instance 3 - Dewey',
          classificationValue: '598.0994',
        },
        {
          instanceTitle: 'C468156 Search by Classification Instance 4 - GDC',
          classificationValue: 'HEU/G74.3C49',
        },
        {
          instanceTitle: 'C468156 Search by Classification Instance 5 - LC',
          classificationValue: 'QS 11 .GA1 E53 2005',
        },
        {
          instanceTitle: 'C468156 Search by Classification Instance 8 - NLM',
          classificationValue: 'SB945.A5',
        },
        {
          instanceTitle: 'C468156 Search by Classification Instance 10 - UDC ',
          classificationValue: '631.321:631.411.3',
        },
      ],
      classificationOption: 'Dewey Decimal classification',
      localInstnaceClassificationValue: 'VP000321',
      instanceTitleWithLocalClassification: 'C468156 Search by Classification Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[1].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[1].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468156.mrc',
      fileName: `testMarcFileC468156.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdRecordIDs = [];

    const localClassificationIdentifierType = {
      name: `C468156 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;

    let user;

    const search = (query, isNegative = true) => {
      InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
        testData.classificationOption,
      );
      InventorySearchAndFilter.browseSearch(query);
      if (isNegative) {
        InventorySearchAndFilter.verifySearchResult(`${query}would be here`);
      } else {
        InventorySearchAndFilter.verifySearchResult(query);
      }
      InventorySearchAndFilter.clickResetAllButton();
    };

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468156*');

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
            ClassificationBrowse.updateIdentifierTypesAPI(
              testData.classificationBrowseId,
              testData.classificationBrowseAlgorithm,
              [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY],
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
        [],
      );
      ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468156 Only one Classification identifier type could be found in the browse result list by "Dewey Decimal classification" browse option when only one Classification identifier type is selected in settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468156'] },
      () => {
        testData.folioInstances.forEach((folioInstance) => {
          search(folioInstance.classificationValue);
        });
        cy.wait(2000);
        BrowseClassifications.waitForClassificationNumberToAppear('598.0994');
        testData.marcRecordsTitlesAndClassifications.forEach((marcInstance) => {
          if (marcInstance.classificationValue === '598.0994') {
            search(marcInstance.classificationValue, false);
          } else {
            search(marcInstance.classificationValue);
          }
        });
        search(testData.localInstnaceClassificationValue);
      },
    );
  });

  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: [
        {
          instanceTitle: 'C468157 Search by Classification Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          classificationValue: '598.099',
        },
        {
          instanceTitle: 'C468157 Search by Classification Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
          classificationValue: 'HT154',
        },
        {
          instanceTitle: 'C468157 Search by Classification Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
          classificationValue: 'DD259.4 .B527 1973',
        },
        {
          instanceTitle:
            'C468157 Search by Classification Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
          classificationValue: 'HD3492.H8',
        },
        {
          instanceTitle: 'C468157 Search by Classification Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
          classificationValue: 'L37.s:Oc1/2/991',
        },
      ],
      marcRecordsTitlesAndClassifications: [
        {
          instanceTitle: 'C468157 Search by Classification Instance 3 - Dewey',
          classificationValue: '598.0994',
        },
        {
          instanceTitle: 'C468157 Search by Classification Instance 4 - GDC',
          classificationValue: 'HEU/G74.3C49',
        },
        {
          instanceTitle: 'C468157 Search by Classification Instance 5 - LC',
          classificationValue: 'QS 11 .GA1 E53 2005',
        },
        {
          instanceTitle: 'C468157 Search by Classification Instance 8 - NLM',
          classificationValue: 'SB945.A5',
        },
        {
          instanceTitle: 'C468157 Search by Classification Instance 10 - UDC ',
          classificationValue: '631.321:631.411.3',
        },
      ],
      classificationOption: 'Library of Congress classification',
      localInstnaceClassificationValue: 'VP000321',
      instanceTitleWithLocalClassification: 'C468157 Search by Classification Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468157.mrc',
      fileName: `testMarcFileC468157.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdRecordIDs = [];

    const localClassificationIdentifierType = {
      name: `C468157 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;

    let user;

    const search = (query, isNegative = true) => {
      BrowseClassifications.waitForClassificationNumberToAppear(query, 'lc', !isNegative);
      InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
        testData.classificationOption,
      );
      InventorySearchAndFilter.browseSearch(query);
      if (isNegative) {
        InventorySearchAndFilter.verifySearchResult(`${query}would be here`);
      } else {
        InventorySearchAndFilter.verifySearchResult(query);
      }
      InventorySearchAndFilter.clickResetAllButton();
    };

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468157*');
      InventoryInstances.deleteInstanceByTitleViaApi('C466154*');

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
            ClassificationBrowse.updateIdentifierTypesAPI(
              testData.classificationBrowseId,
              testData.classificationBrowseAlgorithm,
              [CLASSIFICATION_IDENTIFIER_TYPES.LC],
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
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
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
        [],
      );
      ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468157 Only one Classification identifier type could be found in the browse result list by "Library of Congress classification" browse option when only one Classification identifier type is selected in settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468157'] },
      () => {
        testData.folioInstances.forEach((folioInstance) => {
          search(folioInstance.classificationValue);
        });
        testData.marcRecordsTitlesAndClassifications.forEach((marcInstance) => {
          if (marcInstance.classificationValue === 'QS 11 .GA1 E53 2005') {
            search(marcInstance.classificationValue, false);
          } else {
            search(marcInstance.classificationValue);
          }
        });
        search(testData.localInstnaceClassificationValue);
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Classification (all)',
      searchQuery: 'ML466.P323 A3 2018',
      instanceTitle:
        'C466323 My artistic memoirs / Giovanni Pacini ; edited and translated by Stephen Thompson Moore.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC466323.mrc',
      fileName: `testMarcFileC466323.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(testData.searchQuery);
      BrowseClassifications.verifyResultAndItsRow(5, testData.searchQuery);
      BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.searchQuery);
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '1');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C466323*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        // remove all identifier types from target classification browse, if any
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.searchQuery,
          testData.classificationBrowseId,
        );
      });
    });

    after(() => {
      cy.getAdminToken();
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C794531 Select exact match result in Classification browse result list by "Classification (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794531'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        InventorySearchAndFilter.browseSearch(testData.searchQuery);
        verifySearchResult();
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          `classifications.classificationNumber=="${testData.searchQuery}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Classification (all)',
      querySearchOption: 'Query search',
      negativeSearchQuery: 'N332.G33 B468000 2055',
      positiveSearchQuery: 'N332.G33 B468142 2018',
      instanceTitle:
        'C468142 The spirit of the Bauhaus / texts, Raphaèle Billé, Monique Blanc, Marie-Sophie Carron de la Carrière, Louise Curtis, Nicholas Fox Weber, Olivier Gabet, Jean-Louis Gaillemin, Anne Monier, Béatrice Quette ; translated from the French by Ruth Sharman.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468142.mrc',
      fileName: `testMarcFileC468142.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyResultAndItsRow(
        5,
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468142*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        // remove all identifier types from target classification browse, if any
        ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
          testData.classificationBrowseId,
        ).then((types) => {
          testData.originalTypes = types;
        });
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.positiveSearchQuery,
          testData.classificationBrowseId,
        );
      });
    });

    after(() => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        testData.originalTypes,
      );
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C794534 Select non-exact match result in Classification browse result list by "Classification (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794534'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        InventorySearchAndFilter.browseSearch(testData.negativeSearchQuery);
        verifySearchResult();
        BrowseClassifications.clickOnSearchResult(`${testData.negativeSearchQuery}would be here`);
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.positiveSearchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.positiveSearchQuery}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Dewey Decimal classification',
      querySearchOption: 'Query search',
      searchQuery: '974.7004975542468141',
      instanceTitle:
        'C468141 Stories of Oka : land, film, and literature / Isabelle St-Amand ; translated by S.E. Stewart.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[1].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[1].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468141.mrc',
      fileName: `testMarcFileC468141.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(testData.searchQuery);
      BrowseClassifications.verifyResultAndItsRow(5, testData.searchQuery);
      BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.searchQuery);
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '1');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('C468141');

          cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;

            cy.getUserToken(userProperties.username, userProperties.password);
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        })
        .then(() => {
          cy.getAdminToken();
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties2) => {
            testData.user = userProperties2;
          });
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
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
          InventorySearchAndFilter.verifyCallNumberBrowsePane();
          BrowseClassifications.waitForClassificationNumberToAppear(
            testData.searchQuery,
            testData.classificationBrowseId,
          );
        });
    });

    after(() => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        testData.originalTypes,
      );
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C794532 Select exact match result in Classification browse result list by "Dewey Decimal classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794532'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        InventorySearchAndFilter.browseSearch(testData.searchQuery);
        verifySearchResult();
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.searchQuery}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Dewey Decimal classification',
      querySearchOption: 'Query search',
      negativeSearchQuery: '974.70049755424681453123',
      positiveSearchQuery: '974.7004975542468145',
      instanceTitle:
        'C468145 Stories of Oka : land, film, and literature / Isabelle St-Amand ; translated by S.E. Stewart.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[1].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[1].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468145.mrc',
      fileName: `testMarcFileC468145.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyResultAndItsRow(
        5,
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468145*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.positiveSearchQuery,
          testData.classificationBrowseId,
        );
      });
    });

    after(() => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        [],
      );
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C794535 Select non-exact match result in Classification browse result list by "Dewey Decimal classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794535'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        InventorySearchAndFilter.browseSearch(testData.negativeSearchQuery);
        verifySearchResult();
        BrowseClassifications.clickOnSearchResult(`${testData.negativeSearchQuery}would be here`);
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.positiveSearchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.positiveSearchQuery}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Library of Congress classification',
      searchQuery: 'N332.G33 B468140 2018',
      instanceTitle:
        'C468140 The spirit of the Bauhaus / texts, Raphaèle Billé, Monique Blanc, Marie-Sophie Carron de la Carrière, Louise Curtis, Nicholas Fox Weber, Olivier Gabet, Jean-Louis Gaillemin, Anne Monier, Béatrice Quette ; translated from the French by Ruth Sharman.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468140.mrc',
      fileName: `testMarcFileC468140.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(testData.searchQuery);
      BrowseClassifications.verifyResultAndItsRow(5, testData.searchQuery);
      BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.searchQuery);
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '1');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468140*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
          testData.classificationBrowseId,
        ).then((types) => {
          testData.originalTypes = types;
        });
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [CLASSIFICATION_IDENTIFIER_TYPES.LC],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.searchQuery,
          testData.classificationBrowseId,
        );
      });
    });

    after(() => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        testData.originalTypes,
      );
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C794533 Select exact match result in Classification browse result list by "Library of Congress classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794533'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        InventorySearchAndFilter.browseSearch(testData.searchQuery);
        verifySearchResult();
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          'classifications.classificationNumber=="N332.G33 B468140 2018"',
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Library of Congress classification',
      querySearchOption: 'Query search',
      negativeSearchQuery: 'N332.G33 B443913 2055',
      positiveSearchQuery: 'N332.G33 B53 2018',
      instanceTitle:
        'C468146 Why science needs art : from historical to modern day perspectives / Richard AP Roche, Francesca R. Farina, Seán Commins.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468146.mrc',
      fileName: `testMarcFileC468146.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyResultAndItsRow(
        5,
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468146*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [CLASSIFICATION_IDENTIFIER_TYPES.LC],
        );
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.positiveSearchQuery,
          testData.classificationBrowseId,
        );
      });
    });

    after(() => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        [],
      );
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C794536 Select non-exact match result in Classification browse result list by "Library of Congress classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794536'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        InventorySearchAndFilter.browseSearch(testData.negativeSearchQuery);
        verifySearchResult();
        BrowseClassifications.clickOnSearchResult(`${testData.negativeSearchQuery}would be here`);
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.positiveSearchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.positiveSearchQuery}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });
});

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(5);
    const testData = {
      instanceTitle: `AT_C468182_FolioInstance_${randomPostfix}`,
      classificationValue1: `QL468.C18 E22 ${randomLetters} 1`,
      classificationValue2: `QL468.C18 E22 ${randomLetters} 2`,
      absentClassificationValue: `QL468.C18 E22 ${randomLetters} 0`,
      identifierTypesToSet: [
        CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
        CLASSIFICATION_IDENTIFIER_TYPES.LC,
      ],
      querySearchOption: 'Query search',
    };
    const createdRecordIDs = [];
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468182');

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

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
                      classificationNumber: testData.classificationValue1,
                      classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
                    },
                    {
                      classificationNumber: testData.classificationValue2,
                      classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
                    },
                  ],
                },
              }).then((instance) => {
                createdRecordIDs.push(instance.instanceId);

                cy.getAdminToken();
                defaultClassificationBrowseIdsAlgorithms.forEach((classifBrowse) => {
                  ClassificationBrowse.updateIdentifierTypesAPI(
                    classifBrowse.id,
                    classifBrowse.algorithm,
                    testData.identifierTypesToSet,
                  );
                });

                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                InventorySearchAndFilter.switchToBrowseTab();
                InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
                InventorySearchAndFilter.verifyCallNumberBrowsePane();
                BrowseClassifications.waitForClassificationNumberToAppear(
                  testData.classificationValue1,
                );
                BrowseClassifications.waitForClassificationNumberToAppear(
                  testData.classificationValue2,
                );
              });
            });
        },
      );
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      defaultClassificationBrowseIdsAlgorithms.forEach((classifBrowse) => {
        ClassificationBrowse.updateIdentifierTypesAPI(
          classifBrowse.id,
          classifBrowse.algorithm,
          [],
        );
      });
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468182 Browse for classifications of the same type which exist in 1 Instance using all browse options (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468182'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(defaultClassificationBrowseNames[0]);
        InventorySearchAndFilter.browseSearch(testData.classificationValue1);
        BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.classificationValue1);
        BrowseClassifications.checkNumberOfTitlesInRow(testData.classificationValue1, '1');
        InventorySearchAndFilter.verifySearchResult(testData.classificationValue2);
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.classificationValue1);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.classificationValue1}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.classificationValue1);
        InventorySearchAndFilter.verifySearchResult(testData.classificationValue2);

        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          defaultClassificationBrowseNames[1],
        );
        InventorySearchAndFilter.browseSearch(testData.classificationValue2);
        BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.classificationValue2);
        BrowseClassifications.checkNumberOfTitlesInRow(testData.classificationValue2, '1');
        InventorySearchAndFilter.verifySearchResult(testData.classificationValue1);
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.classificationValue2);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.classificationValue2}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.classificationValue2);
        InventorySearchAndFilter.verifySearchResult(testData.classificationValue1);

        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          defaultClassificationBrowseNames[2],
        );
        InventorySearchAndFilter.browseSearch(testData.absentClassificationValue);
        InventorySearchAndFilter.verifySearchResult(
          `${testData.absentClassificationValue}would be here`,
        );
        InventorySearchAndFilter.verifySearchResult(testData.classificationValue1);
        InventorySearchAndFilter.verifySearchResult(testData.classificationValue2);
      },
    );
  });
});

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(5);
    const testData = {
      instanceTitle1: `AT_C468181_FolioInstance_${randomPostfix}_1`,
      instanceTitle2: `AT_C468181_FolioInstance_${randomPostfix}_2`,
      classificationValueDewey: `468.1811 ${randomLetters}`,
      classificationValueLc: `QL468.C18 E11 ${randomLetters}`,
      querySearchOption: 'Query search',
      identifierTypesToSet: [
        [],
        [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY],
        [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY, CLASSIFICATION_IDENTIFIER_TYPES.LC],
      ],
    };
    const createdRecordIDs = [];
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468181');

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;

            cy.then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instanceTitle1,
                  classifications: [
                    {
                      classificationNumber: testData.classificationValueDewey,
                      classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
                    },
                    {
                      classificationNumber: testData.classificationValueLc,
                      classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
                    },
                  ],
                },
              }).then((instance) => {
                createdRecordIDs.push(instance.instanceId);
              });
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instanceTitle2,
                  classifications: [
                    {
                      classificationNumber: testData.classificationValueDewey,
                      classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
                    },
                  ],
                },
              }).then((instance) => {
                createdRecordIDs.push(instance.instanceId);
              });
            }).then(() => {
              cy.getAdminToken();
              defaultClassificationBrowseIdsAlgorithms.forEach((classifBrowse, index) => {
                ClassificationBrowse.updateIdentifierTypesAPI(
                  classifBrowse.id,
                  classifBrowse.algorithm,
                  testData.identifierTypesToSet[index],
                );
              });

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
              InventorySearchAndFilter.verifyCallNumberBrowsePane();
              BrowseClassifications.waitForClassificationNumberToAppear(
                testData.classificationValueDewey,
              );
            });
          });
        },
      );
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      defaultClassificationBrowseIdsAlgorithms.forEach((classifBrowse) => {
        ClassificationBrowse.updateIdentifierTypesAPI(
          classifBrowse.id,
          classifBrowse.algorithm,
          [],
        );
      });
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468181 Browse for classification which exists in more than 1 Instances using all browse options (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468181'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(defaultClassificationBrowseNames[0]);
        InventorySearchAndFilter.browseSearch(testData.classificationValueDewey);
        BrowseClassifications.verifyValueInResultTableIsHighlighted(
          testData.classificationValueDewey,
        );
        BrowseClassifications.checkNumberOfTitlesInRow(testData.classificationValueDewey, '2');
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.classificationValueDewey);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.classificationValueDewey}"`,
        );
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle1);
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle2);
        InventoryInstances.checkSearchResultCount(/2 records found/);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseClassifications.verifyValueInResultTableIsHighlighted(
          testData.classificationValueDewey,
        );

        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          defaultClassificationBrowseNames[1],
        );
        InventorySearchAndFilter.browseSearch(testData.classificationValueDewey);
        BrowseClassifications.verifyValueInResultTableIsHighlighted(
          testData.classificationValueDewey,
        );
        BrowseClassifications.checkNumberOfTitlesInRow(testData.classificationValueDewey, '2');
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.classificationValueDewey);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.classificationValueDewey}"`,
        );
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle1);
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle2);
        InventoryInstances.checkSearchResultCount(/2 records found/);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseClassifications.verifyValueInResultTableIsHighlighted(
          testData.classificationValueDewey,
        );

        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          defaultClassificationBrowseNames[2],
        );
        InventorySearchAndFilter.browseSearch(testData.classificationValueDewey);
        BrowseClassifications.verifyValueInResultTableIsHighlighted(
          testData.classificationValueDewey,
        );
        BrowseClassifications.checkNumberOfTitlesInRow(testData.classificationValueDewey, '2');
      },
    );
  });
});
