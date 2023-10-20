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
    searchQueriesC368038: [
      "Mrs. Lirriper's legacy the extra Christmas number of All the year round conducted by (Charles Dickens for Christmas, 1864).",
      "Mrs. Lirriper's legacy & the extra Christmas number of All the year round; conducted by Charles-Dickens, for Christmas 1864",
      "Mrs. Lirriper's legacy : the extra Christmas number of All the year round conducted by Charles Dickens, for Christmas 1864",
      '"Mrs. Lirriper\'s legacy" / the extra Christmas number of All the year round {conducted by Charles Dickens, for Christmas 1864}',
      "Mrs. Lirriper's legacy the extra&Christmas number: of All the year round conducted by/ Charles Dickens for Christmas, 1864",
      "Christmas 1864 : Charles Dickens Mrs. Lirriper's legacy the extra Christmas",
      "Mrs. Lirriper's legacy and the extra Christmas number of All the year round conducted by Charles Dickens, for Christmas 1864.",
      "Mrs. Lirriper's legacy & the extra Christmas : number of All the year round / conducted by writer (Charles Dickens for Christmas, 1864).",
      ".Mrs. Lirriper's legacy - the extra Christmas number of All the year round conducted by [Charles Dickens], for Christmas, 1864 !",
    ],
    titlesC368038: [
      'MSEARCH-466 Title 1 Search by "Alternative title" field which has special characters',
      'MSEARCH-466 Title 2 Search by "Alternative title" field which has special characters',
      'MSEARCH-466 Title 3 Search by "Alternative title" field which has special characters',
      'MSEARCH-466 Title 4 Search by "Alternative title" field which has special characters',
      'MSEARCH-466 Title 5 Search by "Alternative title" field which has special characters.',
      'MSEARCH-466 Title 6 Search by "Alternative title" field which has special characters.',
      'MSEARCH-466 Title 7 Search by "Alternative title" field which has special characters.',
      'MSEARCH-466 Title 8 Search by "Alternative title" field which has special characters.',
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

  const expectedTitlesC368038 = [
    testData.titlesC368038,
    testData.titlesC368038,
    testData.titlesC368038,
    testData.titlesC368038,
    testData.titlesC368038,
    testData.titlesC368038,
    [testData.titlesC368038[0], testData.titlesC368038[1], testData.titlesC368038[5]],
    [testData.titlesC368038[5]],
  ];

  const marcFiles = [
    {
      marc: 'marcBibFileC369042.mrc',
      fileName: `testMarcFileC369042.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 3,
    },
    {
      marc: 'marcBibFileC368038.mrc',
      fileName: `testMarcFileC368038.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 8,
    },
  ];

  const createdRecordIDs = [];

  before('Importing data', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath, { waiter: DataImport.waitLoading });
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numberOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          }
        });
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
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

  it(
    'C368038 Search for "Instance" by "Alternative title" field with special characters using "Keyword" search option (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstances.waitContentLoading();
      expectedTitlesC368038.forEach((expectedTitlesSet, index) => {
        InventoryInstance.searchByTitle(testData.searchQueriesC368038[index]);
        // wait for search results to be updated
        cy.wait(1500);
        expectedTitlesSet.forEach((expectedTitle) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(expectedTitle);
        });
        InventorySearchAndFilter.checkRowsCount(expectedTitlesSet.length);
      });
      InventoryInstance.searchByTitle(testData.searchQueriesC368038[8]);
      // wait for search results to be updated
      cy.wait(1500);
      InventorySearchAndFilter.verifyNoRecordsFound();
    },
  );
});
