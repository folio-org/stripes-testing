import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
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
          tag100: {
            tag: '100',
            rowIndex: 11,
          },
          createdRecordIDs: [],
          bib100AfterLinkingToAuth100: [
            11,
            '100',
            '1',
            '\\',
            '$a C366580 Chin, Staceyann, $d 1972-',
            '$e Author $e Narrator',
            '$0 http://id.loc.gov/authorities/names/n2008052404',
            '$1 http://viaf.org/viaf/24074052',
          ],
          bib700AfterUnlinking: [
            11,
            '100',
            '1',
            '\\',
            '$a C366580 Chin, Staceyann, $d 1972- $e Author $e Narrator $0 http://id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
          ],
          contributorName: 'C366580 Chin, Staceyann, 1972-',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC366580.mrc',
            fileName: `C366580 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC366580.mrc',
            fileName: `C366580 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValue = {
          rowIndex: 11,
          value: 'C366580 Chin, Staceyann',
          tag: 100,
        };

        before('Creating user and records', () => {
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C366580');
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            })
              .then(() => {
                InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
                InventoryInstances.selectInstance();
                InventoryInstance.editMarcBibliographicRecord();
                QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValue.rowIndex);
                MarcAuthorities.switchToSearch();
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.verifySearchOptions();
                InventoryInstance.searchResults(linkingTagAndValue.value);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                  linkingTagAndValue.tag,
                  linkingTagAndValue.rowIndex,
                );
                QuickMarcEditor.saveAndCloseWithValidationWarnings();
                QuickMarcEditor.checkAfterSaveAndClose();
              })
              .then(() => {
                cy.waitForAuthRefresh(() => {
                  cy.login(testData.user.username, testData.user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                  cy.reload();
                  InventoryInstances.waitContentLoading();
                }, 20_000);
              });
          });
        });

        after('Deleting created user and records', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1], true);
        });

        it(
          'C366580 Restore deleted unlinked field of "MARC Bib" record in editing window (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C366580'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
            QuickMarcEditor.clickUnlinkIconInTagField(testData.tag100.rowIndex);
            QuickMarcEditor.checkUnlinkModal(testData.tag100.tag);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib700AfterUnlinking);
            QuickMarcEditor.verifyIconsAfterUnlinking(testData.tag100.rowIndex);
            QuickMarcEditor.checkButtonSaveAndCloseEnable();
            QuickMarcEditor.deleteField(testData.tag100.rowIndex);
            QuickMarcEditor.afterDeleteNotification(testData.tag100.tag);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(3000);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkDeleteModal(1);
            QuickMarcEditor.clickRestoreDeletedField();
            QuickMarcEditor.checkDeleteModalClosed();
            QuickMarcEditor.verifyTagValue(testData.tag100.rowIndex, testData.tag100.tag);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib700AfterUnlinking);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InstanceRecordView.verifyInstancePaneExists();
            InventoryInstance.checkMarcAppIconAbsent(0);
            InventoryInstance.verifyContributor(0, 1, testData.contributorName);
          },
        );
      });
    });
  });
});
