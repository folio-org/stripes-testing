import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../../support/constants';
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
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag100: '100',
          tag245: '245',
          tag245content:
            "$a Black Panther /Updated $c writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
          createdRecordIDs: [],
          bib100AfterLinkingToAuth100: [
            32,
            '100',
            '1',
            '\\',
            '$a C366577 Coates, Ta-Nehisi',
            '$e author.',
            '$0 http://id.loc.gov/authorities/names/n2008001084',
            '',
          ],
          marcAuthIcon: 'Linked to MARC authority',
          contributorName: 'C366577 Coates, Ta-Nehisi',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC366577.mrc',
            fileName: `C366577 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC366577.mrc',
            fileName: `C366577 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValue = {
          rowIndex: 32,
          value: 'C366577 Coates, Ta-Nehisi',
          tag: 100,
        };

        before('Creating user and records', () => {
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C366577"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });
          });
          cy.loginAsAdmin();
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
          ]).then((userProperties) => {
            testData.user = userProperties;

            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
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
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user and records', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C366577 Derive | Restore deleted and saved linked field of "MARC Bib" record in deriving window (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C366577'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
            QuickMarcEditor.deleteField(32);
            QuickMarcEditor.afterDeleteNotification(testData.tag100);
            QuickMarcEditor.undoDelete();
            QuickMarcEditor.verifyTagValue(32, testData.tag100);
            QuickMarcEditor.deleteField(32);
            QuickMarcEditor.afterDeleteNotification(testData.tag100);
            QuickMarcEditor.clickSaveAndCloseThenCheck(1);
            QuickMarcEditor.checkDeletingFieldsModal();
            QuickMarcEditor.clickRestoreDeletedField();
            QuickMarcEditor.checkDeleteModalClosed();
            QuickMarcEditor.verifyTagValue(32, testData.tag100);
            QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245content);
            QuickMarcEditor.checkButtonSaveAndCloseEnable();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout('Record created.');
            InstanceRecordView.verifyInstancePaneExists();
            InventoryInstance.verifyContributor(
              0,
              1,
              `${testData.marcAuthIcon}${testData.contributorName}`,
            );
          },
        );
      });
    });
  });
});
