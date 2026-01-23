import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
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
          tag600: '600',
          marcValue: 'C380753 Black Panther (Fictitious character) Wakanda Forever',
          markedValue: 'C380753 Black Panther',
          linkedIconText: 'Linked to MARC authority',
          accordion: 'Subject',
          subjectValue:
            'C380753 Black Panther (Fictitious character) Wakanda Forever--Comic books, strips, etc',
          filterState: [
            'advancedSearch',
            'keyword exactPhrase C380753 Black Panther or identifiers.value exactPhrase n2016004081 or identifiers.value exactPhrase no2020004029 or identifiers.value exactPhrase 2006108277 or identifiers.value exactPhrase no 00041049',
          ],
          bib600AfterUnlinking: [
            45,
            '600',
            '0',
            '0',
            '$a C380753 Black Panther $c (Fictitious character) $t Wakanda Forever $v Comic books, strips, etc. $i comics $0 http://id.loc.gov/authorities/names/n2016004081 $4 .prt $2 test',
          ],
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380753.mrc',
            fileName: `testMarcFileC380753${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380753.mrc',
            fileName: `testMarcFile380753${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C380753 Black Panther (Fictitious character) Wakanda Forever',
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];

        const bib600FieldValues = [
          45,
          testData.tag600,
          '0',
          '0',
          '$a C380753 Black Panther $c (Fictitious character) $v Comic books, strips, etc. $4 .prt $2 test $i comics $0 id.loc.gov/authorities/names/n2016004081 $0 id.loc.gov/authorities/names/no2020004029 $0 2006108277 $0 custom/field/no 00041049 ',
        ];

        const bib600AfterLinkingToAuth100 = [
          45,
          testData.tag600,
          '0',
          '0',
          '$a C380753 Black Panther $c (Fictitious character) $t Wakanda Forever',
          '$v Comic books, strips, etc. $i comics',
          '$0 http://id.loc.gov/authorities/names/n2016004081',
          '$4 .prt $2 test',
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380753*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

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

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C380753 Link the "600" of "MARC Bib" field (with multiple "$0") with "100" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380753'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib600FieldValues);
            QuickMarcEditor.clickLinkIconInTagField(45);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.filterState[0],
              testData.filterState[1],
              'Search',
            );
            MarcAuthorities.selectTitle(testData.marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag600, 45);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib600AfterLinkingToAuth100);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.verifyInstanceSubject(
              0,
              0,
              `${testData.linkedIconText}${testData.subjectValue}`,
            );
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
            InventoryInstance.goToPreviousPage();
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(testData.markedValue);
            InventoryInstance.goToPreviousPage();
            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkFieldsExist([testData.tag600]);
            QuickMarcEditor.clickUnlinkIconInTagField(45);
            QuickMarcEditor.checkUnlinkModal(testData.tag600);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib600AfterUnlinking);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(45);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyInstanceSubject(
              0,
              0,
              `${testData.linkedIconText}${testData.subjectValue}`,
            );
            InventoryInstance.checkMarcAppIconAbsent(0);
            InventoryInstance.viewSource();
            InventoryViewSource.notContains(testData.linkedIconText);
          },
        );
      });
    });
  });
});
