import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  CLASSIFICATION_IDENTIFIER_TYPES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
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

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
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
      { tags: ['criticalPath', 'spitfire', 'C468155'] },
      () => {
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.localInstnaceClassificationValue,
        );
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
          BrowseClassifications.waitForClassificationNumberToAppear(
            folioInstance.classificationValue,
          );
        });
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
      'C466323 Select exact match result in Classification browse result list by "Classification (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466323'] },
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

        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
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
      'C468142 Select non-exact match result in Classification browse result list by "Classification (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468142'] },
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
      'C468141 Select exact match result in Classification browse result list by "Dewey Decimal classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468141'] },
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
      'C468145 Select non-exact match result in Classification browse result list by "Dewey Decimal classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468145'] },
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
      'C468140 Select exact match result in Classification browse result list by "Library of Congress classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468140'] },
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
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
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
      'C468146 Select non-exact match result in Classification browse result list by "Library of Congress classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468146'] },
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
