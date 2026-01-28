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
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag100: '100',
          createdRecordIDs: [],
          bib100AfterLinkingToAuth100: [
            11,
            '100',
            '1',
            '\\',
            '$a C366581 Chin, Staceyann, $d 1972-',
            '$e Author $e Narrator',
            '$0 http://id.loc.gov/authorities/names/n2008052404',
            '$1 http://viaf.org/viaf/24074052',
          ],
          bib100AfterUnlinking: [
            11,
            '100',
            '1',
            '\\',
            '$a C366581 Chin, Staceyann, $d 1972- $e Author $e Narrator $0 http://id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
          ],
          marcAuthIcon: 'Linked to MARC authority',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC366581.mrc',
            fileName: `C366579 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            contributorName: 'C366581 Chin, Staceyann, 1972-',
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC366581.mrc',
            fileName: `C366579 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 2,
            contributorName: 'C366581 Woodson, Jacqueline',
            propertyName: 'authority',
          },
        ];
        const linkingTagAndValues = [
          {
            tag: '100',
            rowIndex: 11,
            value: 'C366581 Chin, Staceyann, 1972-',
          },
          {
            tag: '700',
            rowIndex: 21,
            value: 'C366581 Woodson, Jacqueline',
          },
        ];

        before('Creating test data', () => {
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C366581');
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
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              testData.user = userProperties;
            })
            .then(() => {
              cy.loginAsAdmin({
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              linkingTagAndValues.forEach((linking) => {
                QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
                MarcAuthorities.switchToSearch();
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.verifySearchOptions();
                InventoryInstance.searchResults(linking.value);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
              });
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C366581 Derive | Restore deleted unlinked field of "MARC Bib" record in deriving window (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C366581'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
            QuickMarcEditor.clickUnlinkIconInTagField(11);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib100AfterUnlinking);
            QuickMarcEditor.checkLinkButtonExist(testData.tag100);
            QuickMarcEditor.deleteField(11);
            QuickMarcEditor.afterDeleteNotification(testData.tag100);
            QuickMarcEditor.undoDelete();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib100AfterUnlinking);
            QuickMarcEditor.verifyTagValue(11, testData.tag100);
            QuickMarcEditor.deleteField(11);
            QuickMarcEditor.afterDeleteNotification(testData.tag100);
            QuickMarcEditor.clickSaveAndCloseThenCheck(1);
            QuickMarcEditor.checkDeletingFieldsModal();
            QuickMarcEditor.clickRestoreDeletedField();
            QuickMarcEditor.checkDeleteModalClosed();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib100AfterUnlinking);
            QuickMarcEditor.verifyTagValue(11, testData.tag100);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            InventoryInstance.verifyContributor(0, 1, marcFiles[0].contributorName);
            InventoryInstance.verifyContributor(
              1,
              1,
              `${testData.marcAuthIcon}${marcFiles[1].contributorName}`,
            );
          },
        );
      });
    });
  });
});
