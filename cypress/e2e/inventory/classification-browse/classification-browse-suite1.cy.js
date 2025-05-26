import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  CLASSIFICATION_IDENTIFIER_TYPES,
  BROWSE_CLASSIFICATION_OPTIONS,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instance: {
        instanceTitle: `C471477 Autotest Instance ${randomPostfix}`,
        classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
        classificationNumber: `YC471477number ${randomPostfix}`,
      },
      classificationOption: 'Classification (all)',
      classificationIdentifierTypeName: 'Additional Dewey',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };
    let createdRecordId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C471477*');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;

        // remove all identifier types from target classification browse, if any
        ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
          testData.classificationBrowseId,
        ).then(() => {
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [],
          );

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instance.instanceTitle,
                  classifications: [
                    {
                      classificationNumber: testData.instance.classificationNumber,
                      classificationTypeId: testData.instance.classificationType,
                    },
                  ],
                },
              }).then((instance) => {
                createdRecordId = instance.instanceId;

                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                InventorySearchAndFilter.switchToBrowseTab();
                InventorySearchAndFilter.verifyCallNumberBrowsePane();
              });
            });
        });
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
      InventoryInstance.deleteInstanceViaApi(createdRecordId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C471477 Deleted Classification values cannot be found in browse classifications result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C471477'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.instance.classificationNumber,
        );
        InventorySearchAndFilter.browseSearch(testData.instance.classificationNumber);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifySearchResultIncludingValue(
          testData.instance.classificationNumber,
        );

        BrowseClassifications.selectFoundValueByRow(5, testData.instance.classificationNumber);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instance.instanceTitle);
        InventoryInstances.selectInstanceById(createdRecordId);

        InventoryInstance.verifyClassificationValueInView(
          testData.classificationIdentifierTypeName,
          testData.instance.classificationNumber,
        );

        InstanceRecordView.edit();
        InstanceRecordEdit.removeClassificationNumber(testData.instance.classificationNumber);
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.checkInstanceTitle(testData.instance.instanceTitle);

        InventoryInstance.verifyClassificationValueInView(
          testData.classificationIdentifierTypeName,
          testData.instance.classificationNumber,
          false,
        );

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        InventorySearchAndFilter.clickResetAllButton();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.instance.classificationNumber,
          testData.classificationBrowseId,
          false,
        );
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        InventorySearchAndFilter.browseSearch(testData.instance.classificationNumber);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifyContentNotExistInSearchResult(
          testData.instance.classificationNumber,
        );
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      instances: [
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 3 - Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 4 - GDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.GDC,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 5 - LC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 8 - NLM',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NLM,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
        },
        {
          instanceTitle:
            'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 10 - UDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.UDC,
        },
      ],
      classificationOption: 'Classification (all)',
      classificationValue: `test006. HD ${getRandomPostfix()}`,
      querySearchOption: 'Query search',
      instanceTitleWithLocalClassification:
        'C468158 Browse by Class-on (different inst-s with same class-on value) Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };
    const createdRecordIDs = [];
    const localClassificationIdentifierType = {
      name: `C468158 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468158*');

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
            (response) => {
              classificationIdentifierTypeId = response.body.id;
            },
          );

          // remove all identifier types from target classification browse, if any
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [],
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
        },
      );
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
      'C468158 Browse for classification which has the same value but different classification types using "Classification (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468158'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.classificationValue,
          testData.classificationBrowseId,
        );
        InventorySearchAndFilter.browseSearch(testData.classificationValue);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifySearchResultIncludingValue(testData.classificationValue);
        for (let i = 5; i < 16; i++) {
          BrowseClassifications.verifyRowValueIsBold(i, testData.classificationValue);
          BrowseClassifications.verifyResultAndItsRow(i, testData.classificationValue);
          BrowseClassifications.verifyNumberOfTitlesInRow(i, '1');
        }

        BrowseClassifications.selectFoundValueByRow(5, testData.classificationValue);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.classificationValue}"`,
        );
        testData.instances.forEach((instance) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(instance.instanceTitle);
        });
        InventorySearchAndFilter.verifyInstanceDisplayed(
          testData.instanceTitleWithLocalClassification,
        );
        InventoryInstances.checkSearchResultCount(/11 records found/);
      },
    );
  });

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
      classificationOption: BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
      classificationValue: `test005. HD ${getRandomPostfix()}`,
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
          // wait for values to be available in browse
          cy.wait(5000);
        },
      );
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
      'C468159 Browse for classification which has the same value but different classification types using "Dewey Decimal classification" browse option when only "Dewey" classification type is selected in Settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468159'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.classificationValue,
          testData.classificationBrowseId,
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

  describe('Instance classification browse', () => {
    const testData = {
      instances: [
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 3 - Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 4 - GDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.GDC,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 5 - LC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 8 - NLM',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NLM,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
        },
        {
          instanceTitle:
            'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 10 - UDC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.UDC,
        },
      ],
      classificationOption: 'Library of Congress classification',
      classificationValue: `test004. HD ${getRandomPostfix()}`,
      querySearchOption: 'Query search',
      instanceTitleWithLocalClassification:
        'C468160 Browse by Class-on (different inst-s with same class-on value) Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };
    const createdRecordIDs = [];
    const localClassificationIdentifierType = {
      name: `C468160 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468160*');

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
            (response) => {
              classificationIdentifierTypeId = response.body.id;
            },
          );

          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [CLASSIFICATION_IDENTIFIER_TYPES.LC, CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL],
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
        },
      );
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
      'C468160 Browse for classification which has the same value but different classification types using "Library of Congress classification" browse option when only "LC" and "Local" classification types are selected in Settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468159'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.classificationValue,
          testData.classificationBrowseId,
        );
        InventorySearchAndFilter.browseSearch(testData.classificationValue);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifySearchResultIncludingValue(testData.classificationValue);
        for (let i = 5; i < 7; i++) {
          BrowseClassifications.verifyRowValueIsBold(i, testData.classificationValue);
          BrowseClassifications.verifyResultAndItsRow(i, testData.classificationValue);
          BrowseClassifications.verifyNumberOfTitlesInRow(i, '1');
        }

        BrowseClassifications.selectFoundValueByRow(5, testData.classificationValue);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.classificationValue}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instances[4].instanceTitle);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instances[5].instanceTitle);
        InventoryInstances.checkSearchResultCount(/2 records found/);
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Classification (all)',
      searchQueries: ['HD1691 .I5 1967', 'hd1691 .i5 1967'],
      searchResults: ['hd1691 .i5 1967', 'HD1691 .I5 1967'],
      instanceTitles: [
        'C468255 Search by Classification (case insensitive check) Instance 3 - LC UPPER case',
        'C468255 Search by Classification (case insensitive check) Instance 4 - LC lower case',
      ],
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468255.mrc',
      fileName: `testMarcFileC468255.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468255*');

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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        testData.searchResults.forEach((query) => {
          BrowseClassifications.waitForClassificationNumberToAppear(
            query,
            testData.classificationBrowseId,
          );
        });
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
      'C468255 Browse for classification using "Classification (all)" option is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468255'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
          InventorySearchAndFilter.browseSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResultIncludingValue(expectedResult);
          });
        });
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchResults[0]);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          'classifications.classificationNumber=="hd1691 .i5 1967"',
        );
        testData.instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(title);
        });
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
      searchQueries: ['M1 33A', 'm1 33a'],
      searchResults: ['m1 33a', 'M1 33A'],
      instanceTitles: [
        'C468258 Search by Classification (case insensitive check) Instance 1 - Dewey UPPER case',
        'C468258 Search by Classification (case insensitive check) Instance 2 - Dewey lower case',
      ],
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[1].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[1].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468258.mrc',
      fileName: `testMarcFileC468258.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468258*');

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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        testData.searchResults.forEach((query) => {
          BrowseClassifications.waitForClassificationNumberToAppear(
            query,
            testData.classificationBrowseId,
          );
        });
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
      'C468258 Browse for classification using "Dewey Decimal classification" option is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468258'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            testData.classificationOption,
          );
          InventorySearchAndFilter.browseSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResultIncludingValue(expectedResult);
          });
        });
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchResults[0]);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          'classifications.classificationNumber=="m1 33a"',
        );
        testData.instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(title);
        });
      },
    );
  });

  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Library of Congress classification',
      searchQueries: ['HD1691 .I5 1967', 'hd1691 .i5 1967'],
      searchResults: ['hd1691 .i5 1967', 'HD1691 .I5 1967'],
      instanceTitles: [
        'C468256 Search by Classification (case insensitive check) Instance 3 - LC UPPER case',
        'C468256 Search by Classification (case insensitive check) Instance 4 - LC lower case',
      ],
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468256.mrc',
      fileName: `testMarcFileC468256.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468256*');

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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
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
      'C468256 Browse for classification using "Library of Congress classification" option is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468256'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            testData.classificationOption,
          );
          BrowseClassifications.waitForClassificationNumberToAppear(
            testData.searchResults[0],
            testData.classificationBrowseId,
          );
          InventorySearchAndFilter.browseSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResultIncludingValue(expectedResult);
          });
        });
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchResults[0]);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          'classifications.classificationNumber=="hd1691 .i5 1967"',
        );
        testData.instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(title);
        });
      },
    );
  });

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
      classificationOption: 'Classification (all)',
      instanceTitle: 'C468178 Browse by Classification Instance (has each classification type)',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };
    const localClassificationIdentifierType = {
      name: `C468178 Classification identifier type ${getRandomPostfix()}`,
      source: 'local',
    };
    let classificationIdentifierTypeId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468178*');

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

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
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
      'C468178 Browse for classifications of Instance which has each classification type using "Classification (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468178'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
          InventorySearchAndFilter.browseSearch(query);
          InventorySearchAndFilter.verifySearchResultIncludingValue(query);
          InventorySearchAndFilter.clickResetAllButton();
        });
      },
    );
  });

  describe('Instance classification browse', () => {
    const randomLetters = getRandomLetters(7);
    const testData = {
      searchQueries: [
        `388.14${randomLetters}`,
        `K347.9445${randomLetters}`,
        `839.83${randomLetters}`,
        `A 13.28:F 61/2/982 Glacier${randomLetters}`,
        `BJ1533.C5${randomLetters}`,
        `JK608${randomLetters}`,
        `TRANSL17827${randomLetters}`,
        `N972a 1968${randomLetters}`,
        `L33s:Oc1/2/996${randomLetters}`,
        `821.113.4-15${randomLetters}`,
        `VP111433${randomLetters}`,
      ],
      classificationOption: 'Library of Congress classification',
      querySearchOption: 'Query search',
      querySearchValue: `classifications.classificationNumber=="BJ1533.C5${randomLetters}"`,
      instanceTitle: `AT_C468180_FolioInstance_${getRandomPostfix()}`,
      classificationIdentifierTypeIds: [
        CLASSIFICATION_IDENTIFIER_TYPES.LC,
        CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
      ],
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };
    const callNumbersToBeFound = [4, 5, 10].map((index) => testData.searchQueries[index]);
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
        callNumbersToBeFound.forEach((callNumber) => {
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
          if (callNumbersToBeFound.includes(query)) {
            InventorySearchAndFilter.verifySearchResult(query);
            if (query === testData.searchQueries[4]) {
              InventorySearchAndFilter.selectFoundItemFromBrowse(query);
              InventorySearchAndFilter.verifySearchOptionAndQuery(
                testData.querySearchOption,
                testData.querySearchValue,
              );
              InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
              InventorySearchAndFilter.switchToBrowseTab();
            }
            InventorySearchAndFilter.clickResetAllButton();
          } else {
            InventorySearchAndFilter.verifySearchResult(`${query}would be here`);
            InventorySearchAndFilter.clickResetAllButton();
          }
        });
      },
    );
  });

  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: [
        {
          instanceTitle: 'C468147 Search by Classification Instance 1 - Additional Dewey',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          classificationValue: '598.099468147',
        },
        {
          instanceTitle: 'C468147 Search by Classification Instance 2 - Canadian Classification',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
          classificationValue: 'HT154468147',
        },
        {
          instanceTitle: 'C468147 Search by Classification Instance 6 - LC (local)',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
          classificationValue: 'DD259.4 .B527 1973468147',
        },
        {
          instanceTitle:
            'C468147 Search by Classification Instance 7 - National Agricultural Library',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
          classificationValue: 'HD3492.H8468147',
        },
        {
          instanceTitle: 'C468147 Search by Classification Instance 9 - SUDOC',
          classificationType: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
          classificationValue: 'L37.s:Oc1/2/991468147',
        },
      ],
      marcRecordsTitlesAndClassifications: [
        {
          instanceTitle: 'C468147 Search by Classification Instance 3 - Dewey',
          classificationValue: '598.0994468147',
        },
        {
          instanceTitle: 'C468147 Search by Classification Instance 4 - GDC',
          classificationValue: 'HEU/G74.3C49468147',
        },
        {
          instanceTitle: 'C468147 Search by Classification Instance 5 - LC',
          classificationValue: 'QS 11 .GA1 E53 2005468147',
        },
        {
          instanceTitle: 'C468147 Search by Classification Instance 8 - NLM',
          classificationValue: 'SB945.A5468147',
        },
        {
          instanceTitle: 'C468147 Search by Classification Instance 10 - UDC ',
          classificationValue: '631.321:631.411.3468147',
        },
      ],
      classificationOption: 'Classification (all)',
      localInstnaceClassificationValue: 'VP000321468147',
      instanceTitleWithLocalClassification: 'C468147 Search by Classification Instance 11 - Local',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };
    const marcFile = {
      marc: 'marcBibFileForC468147.mrc',
      fileName: `testMarcFileC468147.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdRecordIDs = [];
    const localClassificationIdentifierType = {
      name: `C468147 Classification identifier type ${getRandomPostfix()}`,
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
      InventoryInstances.deleteInstanceByTitleViaApi('C468147*');

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
            // remove all identifier types from target classification browse, if any
            ClassificationBrowse.updateIdentifierTypesAPI(
              testData.classificationBrowseId,
              testData.classificationBrowseAlgorithm,
              [],
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
        [],
      );
      ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468147 Each Classification identifier type could be found in the browse result list by "Classification (all)" browse option and empty settings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468147'] },
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
});
