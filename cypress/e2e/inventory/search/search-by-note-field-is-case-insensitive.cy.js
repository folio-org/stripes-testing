import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const testData = {
        instanceNotesOption: 'Instance notes (all)',
        admNotesOption: 'Instance administrative notes',
        identifierAllOption: 'Identifier (all)',
        allOption: 'All',
        searchQueries: [
          'INSTANCE NOTE AND ADMNOTE CASE TEST',
          'instance note and admnote case test',
        ],
        searchResultsAll: [
          'C466074 Instance 1, Instance note lower case',
          'C466074 Instance 2, Instance note UPPER case',
          'C466074 Instance 3, Instance adm note lower case',
          'C466074 Instance 4, Instance adm note UPPER case',
        ],
        searchResultsTwoRecords: [
          'C466074 Instance 3, Instance adm note lower case',
          'C466074 Instance 4, Instance adm note UPPER case',
        ],
        instances: [
          {
            title: 'C466074 Instance 3, Instance adm note lower case',
            admNote: 'instance note and admnote case test',
          },
          {
            title: 'C466074 Instance 4, Instance adm note UPPER case',
            admNote: 'INSTANCE NOTE AND ADMNOTE CASE TEST',
          },
        ],
      };

      const marcFile = {
        marc: 'marcBibFileForC466074.mrc',
        fileName: `testMarcFileC466074.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      const createdRecordIDs = [];

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[0].title,
                  administrativeNotes: [testData.instances[0].admNote],
                },
              }).then((instance) => {
                testData.instances[0].instanceId = instance.instanceId;
              });

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[1].title,
                  administrativeNotes: [testData.instances[1].admNote],
                },
              }).then((instance) => {
                testData.instances[1].instanceId = instance.instanceId;
              });
            });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.instanceId);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C466074 Search by "Note" field is case-insensitive (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.selectSearchOptions(testData.instanceNotesOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueries[0]);
          testData.searchResultsAll.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.selectSearchOptions(testData.instanceNotesOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueries[1]);
          testData.searchResultsAll.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.admNotesOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsTwoRecords.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsAll.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
        },
      );
    });
  });
});
