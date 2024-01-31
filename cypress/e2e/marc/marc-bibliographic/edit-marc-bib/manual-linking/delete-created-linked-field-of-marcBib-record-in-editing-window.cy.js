import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
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
          createdRecordIDs: [],
          tag700: '700',
          tag700content: '$a C366582 Coates, T.',
          rowIndex: 22,
          bib700AfterLinkingToAuth100: [
            22,
            '700',
            '\\',
            '\\',
            '$a C366582 Coates, Ta-Nehisi',
            '',
            '$0 id.loc.gov/authorities/names/n2008001084',
            '',
          ],
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC366582.mrc',
            fileName: `C366582 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileC366582.mrc',
            fileName: `C366582 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            authorityHeading: 'C366582 Coates, Ta-Nehisi',
            numOfRecords: 1,
          },
        ];

        before('Creating test data', () => {
          cy.loginAsAdmin();
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C366582"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });
            marcFiles.forEach((marcFile) => {
              cy.visit(TopMenu.dataImportPath);
              // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
              DataImport.verifyUploadState();
              DataImport.uploadFile(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              Logs.waitFileIsImported(marcFile.fileName);
              Logs.checkStatusOfJobProfile('Completed');
              Logs.openFileDetails(marcFile.fileName);
              for (let i = 0; i < marcFile.numOfRecords; i++) {
                Logs.getCreatedItemsID(i).then((link) => {
                  testData.createdRecordIDs.push(link.split('/')[5]);
                });
              }
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

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(testData.user.userId);
            InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
            MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
          });
        });

        it(
          'C366582 Delete created linked field of "MARC Bib" record in editing window (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.addNewField(testData.tag700, testData.tag700content, 21);
            QuickMarcEditor.checkButtonsEnabled();
            QuickMarcEditor.checkContent(testData.tag700content, 22);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(testData.rowIndex);
            QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700AfterLinkingToAuth100);
            QuickMarcEditor.deleteField(testData.rowIndex);
            QuickMarcEditor.checkUndoDeleteAbsent();
            QuickMarcEditor.checkButtonsDisabled();
          },
        );
      });
    });
  });
});
