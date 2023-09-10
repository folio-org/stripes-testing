import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Search in Inventory', () => {
  const testData = {
    searchQueries: [
      'Pangkok',
      'Pangk ok',
      "Pangk'ok",
      "Pangk'ok : Kim Ki-ch'ang changp'yŏn sosŏl.",
      'Han’guk yŏnghwa 100-sŏn',
      'Hanguk yŏnghwa 100-sŏn',
      'Han guk yŏnghwa 100-sŏn',
      "Han'guk yŏnghwa 100-yŏn, yŏnghwa kwanggo 100-sŏn / P'yŏnjippu yŏkkŭm.",
      "Han'guk yŏnghwa 100-sŏn : yŏnghwa hakcha, p'yŏngnon'ga ka ppobŭn Han'guk yŏnghwa taep'yojak : \"Ch'ŏngch'un ŭi sipcharo\" esŏ \"P'iet'a\" kkaji / Han'guk Yŏngsang Charyowŏn p'yŏn.",
    ],
    titles: [
      "Pangk'ok : Kim Ki-ch'ang changp'yŏn sosŏl.",
      "Han'guk yŏnghwa 100-sŏn : yŏnghwa hakcha, p'yŏngnon'ga ka ppobŭn Han'guk yŏnghwa taep'yojak : \"Ch'ŏngch'un ŭi sipcharo\" esŏ \"P'iet'a\" kkaji / Han'guk Yŏngsang Charyowŏn p'yŏn.",
      "Han'guk yŏnghwa 100-yŏn, yŏnghwa kwanggo 100-sŏn / P'yŏnjippu yŏkkŭm.",
    ],
  };

  const expectedTitles = [
    [testData.titles[0]],
    [testData.titles[0]],
    [testData.titles[0]],
    [testData.titles[0]],
    [testData.titles[1], testData.titles[2]],
    [testData.titles[1], testData.titles[2]],
    [testData.titles[1], testData.titles[2]],
    [testData.titles[2]],
    [testData.titles[1]],
  ];

  const marcFiles = [
    {
      marc: 'marcBibFileC369042.mrc',
      fileName: `testMarcFileC369042.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 3,
    },
  ];

  const createdRecordIDs = [];

  before('Importing data, linking records', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numberOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdRecordIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting user, records', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C369042 Search for "Instance" with "diacritic - Korean" symbol in the "Resource title" field using "Keyword" search option (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      testData.searchQueries.forEach((query, index) => {
        InventoryInstance.searchByTitle(query);
        // wait for search results to be updated
        cy.wait(1500);
        expectedTitles[index].forEach((expectedTitle) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(expectedTitle);
        });
        InventorySearchAndFilter.checkRowsCount(expectedTitles[index].length);
      });
    },
  );
});
