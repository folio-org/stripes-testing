import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        let userData = {};
        const testData = {
          tag700: '700',
          rowIndex: 77,
          content: '$a C380750 Martin, Laura $c (Comic book artist), $e colorist. $0 2014052262',
          searchValue:
            'keyword exactPhrase C380750 Martin, Laura or identifiers.value exactPhrase 2014052262',
          selectedFilterValue: 'advancedSearch',
          toggle: 'Search',
          contributor: 'C380750 Martin, Laura (Comic book artist)',
          createdRecordsIDs: [],
        };

        const marcAuthData = {
          tag010: '010',
          tag100: '100',
          tag010Value: '2014052262',
          tag100Value: '$a C380750 Martin, Laura $c (Comic book artist)',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380750.mrc',
            fileName: `testMarcFileC380750${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numOfRecords: 1,
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthFileC380750.mrc',
            fileName: `testMarcFileC380750${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        const bib700AfterLinkingToAuth100 = [
          testData.rowIndex,
          testData.tag700,
          '1',
          '\\',
          marcAuthData.tag100Value,
          '$e colorist.',
          '$0 9640356',
          '',
        ];

        before('Creating user and test data', () => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.getAdminToken();
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.entries.forEach((record) => {
                  testData.createdRecordsIDs.push(record[marcFile.propertyName].idList[0]);
                });
              });
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordsIDs[0]);
          MarcAuthority.deleteViaAPI(testData.createdRecordsIDs[1]);
        });

        it(
          'C380750 Link "MARC Bib" 700 field with "$0" subfield ("Not specified" - without letter prefix) with matched to "MARC authority" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.selectedFilterValue,
              testData.searchValue,
              testData.toggle,
            );
            MarcAuthority.contains(`${marcAuthData.tag010}\t   \t$a ${marcAuthData.tag010Value}`);
            MarcAuthority.contains(`${marcAuthData.tag100}\t1  \t${marcAuthData.tag100Value}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyContributorWithMarcAppLink(3, 1, testData.contributor);
          },
        );
      });
    });
  });
});
