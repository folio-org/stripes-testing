import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        createdRecordIDs: [],
        tag010: '010',
        tag010content: '$a xt90635366 $z n90634162',
        tag100content: [
          13,
          '100',
          '1',
          '\\',
          '$a C422062 Robinson, Peter, $d 1950-2022',
          '$e author.',
          '$0 3052044',
          '',
        ],
        searchOption: 'Keyword',
        instanceTitle: '',
        calloutMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC422062.mrc',
          fileName: `C422062 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          numOfRecords: 1,
        },
        {
          marc: 'marcAuthFileForC422062.mrc',
          fileName: `C422062 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          authorityHeading: 'C422062 Robinson, Peter, 1950-2022',
          numOfRecords: 1,
        },
      ];
      const linkingTagAndValues = {
        rowIndex: 13,
        value: 'C422062 Robinson, Peter,',
        tag: '100',
      };

      before('Creating user and data', () => {
        cy.getAdminToken().then(() => {
          MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C422062"' }).then(
            (records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            },
          );
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.loginAsAdmin()
            .then(() => {
              marcFiles.forEach((marcFile) => {
                cy.visit(TopMenu.dataImportPath);
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
            })
            .then(() => {
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linkingTagAndValues.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValues.tag,
                linkingTagAndValues.rowIndex,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
        });
      });

      it(
        'C422062 Q release | Add "010" field with invalid prefix in "$a" subfield in linked "MARC authority" record when "001" field is controlling "$0" of MARC bib\'s field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, linkingTagAndValues.value);
          MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          QuickMarcEditor.checkFieldAbsense(testData.tag010);
          QuickMarcEditor.addNewField(testData.tag010, testData.tag010content, 4);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthorities.checkCallout(testData.calloutMessage);
          MarcAuthorities.verifyMarcViewPaneIsOpened();
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.tag100content);
        },
      );
    });
  });
});
