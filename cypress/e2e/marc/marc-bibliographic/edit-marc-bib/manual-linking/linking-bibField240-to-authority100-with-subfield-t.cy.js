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
          browseSearchOption: 'nameTitle',
          tag100: '100',
          tag010: '010',
          tag240: '240',
          authorityMarkedValue: 'C369092 Beethoven, Ludwig van,',
          authority100FieldValue:
            'C369092 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
          authority010FieldValue: 'n  83130832',
          accordion: 'Title data',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC369092.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcFileForC369092.mrc',
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C369092*');

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
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
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
          'C369092 Link the "240" of "MARC Bib" field with "100" field with a "$t" of "MARC Authority" record. (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C369092'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(testData.authority100FieldValue);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${testData.authority010FieldValue}`,
            );
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag100,
              `$a ${testData.authorityMarkedValue}`,
            );

            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              17,
              '240',
              '1',
              '0',
              '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
              '',
              '$0 http://id.loc.gov/authorities/names/n83130832',
              '',
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();

            InventoryInstance.waitInventoryLoading();
            InventoryInstance.viewSource();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();
            MarcAuthorities.closeMarcViewPane();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickUnlinkIconInTagField(17);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              17,
              '240',
              '1',
              '0',
              '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $0 http://id.loc.gov/authorities/names/n83130832',
            );
            QuickMarcEditor.checkLinkButtonExist(testData.tag240);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);

            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
          },
        );
      });
    });
  });
});
