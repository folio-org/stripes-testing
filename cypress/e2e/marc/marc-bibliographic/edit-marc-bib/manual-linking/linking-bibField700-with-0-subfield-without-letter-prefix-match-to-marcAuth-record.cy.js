import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        let userData = {};
        const testData = {
          tag700: '700',
          rowIndex: 76,
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
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC380750.mrc',
            fileName: `testMarcFileC380750${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
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
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380750*');

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
                response.forEach((record) => {
                  testData.createdRecordsIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
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
          { tags: ['extendedPath', 'spitfire', 'C380750'] },
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
            InventoryInstance.verifyContributorWithMarcAppLink(3, 1, testData.contributor);
          },
        );
      });
    });
  });
});
