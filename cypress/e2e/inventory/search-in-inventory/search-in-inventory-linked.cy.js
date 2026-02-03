import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      tag130: '130',
      tag240: '240',
      tag010: '010',
      querySearchOption: 'Query search',
      searchQueries: {
        allRecords: 'alternativeTitles.alternativeTitle = "bibleC375256"',
        secondLinkedRecord: 'alternativeTitles.alternativeTitle = "Hosanna BibleC375256"',
        bothLinkedRecords:
          'alternativeTitles.alternativeTitle = "Hosanna BibleC375256" OR alternativeTitles.alternativeTitle = "BibleC375256. Polish."',
        linkedAndFirstNotLinkedRecords:
          'alternativeTitles.alternativeTitle = "Hosanna BibleC375256" OR alternativeTitles.alternativeTitle = "BibleC375256. Polish." OR alternativeTitles.alternativeTitle = "BibleC375256 1"',
      },
      searchResults: {
        firstLinkedRecord: 'Prayer Bible (Test record with 130 linked field).',
        secondLinkedRecord: 'Prayer Bible (Test record with 240 linked field).',
        firstNotLinkedRecord: 'Prayer Bible (Test record without linked field: 246).',
        secondNotLinkedRecord: 'Prayer Bible (Test record without linked field: 270).',
      },
    };

    const marcFiles = [
      {
        marc: 'marcBibFileC375256.mrc',
        fileName: `testMarcFileC375256.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numberOfRecords: 4,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileC375256_1.mrc',
        fileName: `testMarcFileC375256.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        authorityHeading: 'BibleC375256. Polish. Biblia Płocka C375256',
        authority010FieldValue: 'n92085235375256',
        numberOfRecords: 1,
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthFileC375256_2.mrc',
        fileName: `testMarcFileC375256.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        authorityHeading: 'Abraham, Angela, C375256 Hosanna',
        authority010FieldValue: 'n99036055375256',
        numberOfRecords: 1,
        propertyName: 'authority',
      },
    ];

    const createdRecordIDs = [];

    before('Importing data, linking Bib fields', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375256');

        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
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
        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000).then(() => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          // here and below - wait for detail view to be fully loaded
          cy.wait(3000);
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag130);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(marcFiles[1].authorityHeading);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag010,
            `$a ${marcFiles[1].authority010FieldValue}`,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag130);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstances.searchByTitle(createdRecordIDs[1]);
          InventoryInstances.selectInstance();
          cy.wait(3000);
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(marcFiles[2].authorityHeading);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag010,
            `$a ${marcFiles[2].authority010FieldValue}`,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
      });
    });

    after('Deleting user, records', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index > 3) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C375256 Query search | Search by "Alternative title" field of linked "MARC Bib" records (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C375256'] },
      () => {
        InventorySearchAndFilter.selectSearchOptions(
          testData.querySearchOption,
          testData.searchQueries.allRecords,
        );
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
          InventoryInstances.waitLoading();
        });
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.firstLinkedRecord);
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.secondLinkedRecord);
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.firstNotLinkedRecord);
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.secondNotLinkedRecord);
        InventorySearchAndFilter.checkRowsCount(4);

        InventorySearchAndFilter.selectSearchOptions(
          testData.querySearchOption,
          testData.searchQueries.secondLinkedRecord,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.secondLinkedRecord);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.selectSearchOptions(
          testData.querySearchOption,
          testData.searchQueries.bothLinkedRecords,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.firstLinkedRecord);
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.secondLinkedRecord);
        InventorySearchAndFilter.checkRowsCount(2);

        InventorySearchAndFilter.selectSearchOptions(
          testData.querySearchOption,
          testData.searchQueries.linkedAndFirstNotLinkedRecords,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.firstLinkedRecord);
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.secondLinkedRecord);
        InventorySearchAndFilter.verifySearchResult(testData.searchResults.firstNotLinkedRecord);
        InventorySearchAndFilter.checkRowsCount(3);
      },
    );
  });
});
