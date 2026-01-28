import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          browseSearchOption: 'personalNameTitle',
          tag100: '100',
          tag010: '010',
          tag240: '240',
          authority100FieldValue: 'C365134 Coates, Ta-Nehisi',
          authority010FieldValue: 'n 2008001084',
          successMsg:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
          accordion: 'Contributor',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC365134.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC365134.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before('Creating user', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C365134*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.moduleDataImportEnabled.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          });
        });

        beforeEach('Login to the application', () => {
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });

        after('Deleting created user', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
          createdAuthorityIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C365134 Link "MARC Bib" field without "$0" subfield to "MARC Authority" record. "Authority source file" value from the pre-defined list (100 field to 100) (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C365134'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
            MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(testData.authority100FieldValue);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${testData.authority010FieldValue} `,
            );
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag100,
              `$a ${testData.authority100FieldValue} `,
            );

            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              32,
              '100',
              '1',
              '\\',
              '$a C365134 Coates, Ta-Nehisi',
              '$e author.',
              '$0 http://id.loc.gov/authorities/names/n2008001084',
              '',
            );
            QuickMarcEditor.pressSaveAndKeepEditing(testData.successMsg);

            InventoryInstance.clickViewAuthorityIconDisplayedInTagField(testData.tag100);
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authority100FieldValue);

            InventoryInstance.goToPreviousPage();
            QuickMarcEditor.pressCancel();

            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authority100FieldValue);
            InventoryInstance.goToPreviousPage();

            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryInstance.viewSource();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authority100FieldValue);
          },
        );
      });
    });
  });
});
