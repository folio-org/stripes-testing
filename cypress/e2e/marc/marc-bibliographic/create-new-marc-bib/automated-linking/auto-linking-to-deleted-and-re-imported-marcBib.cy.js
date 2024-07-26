import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag245: '245',
            tagLDR: 'LDR',
          },
          fieldContents: {
            tag245Content: 'New title',
          },
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        };

        const newFields = [
          {
            rowIndex: 4,
            tag: '240',
            content: '$0 n9903410883C410883',
            boxFourth: '$a C410883 Hosanna Bible',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n9903410883C410883',
            boxSeventh: '',
            searchOption: 'Keyword',
            marcValue: 'C410883 Roma Council (2nd : 1962-1965 : Basilica di San Pietro in Roma)',
          },
          {
            rowIndex: 5,
            tag: '711',
            content: '$j something $0 n7908410883C410883 $2 fast',
            boxFourth:
              '$a C410883 Roma Council $c Basilica di San Pietro in Roma) $d 1962-1965 : $n (2nd :',
            boxFifth: '$j something',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n7908410883C410883',
            boxSeventh: '$2 fast',
            searchOption: 'Keyword',
            marcValue: 'C410883 Abraham, Angela, 1958- C410883 Hosanna Bible',
          },
        ];

        let userData = {};

        const linkableFields = [240, 711];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC410883.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 2,
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C410883*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            Permissions.moduleDataImportEnabled.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record.authority.id);
                });
              });
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          for (let i = 0; i < 2; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i], true);
          }
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
        });

        it(
          'C422144 Auto-linking to deleted and re-imported "MARC authority" record when creating new "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['criticalPathBroken', 'spitfire'] },
          () => {
            cy.visit(TopMenu.marcAuthorities);
            newFields.forEach((newField) => {
              MarcAuthoritiesSearch.searchBy(newField.searchOption, newField.marcValue);
              MarcAuthorities.selectItem(newField.marcValue);
              MarcAuthority.waitLoading();
              MarcAuthoritiesDelete.clickDeleteButton();
              MarcAuthoritiesDelete.checkDeleteModal();
              MarcAuthoritiesDelete.confirmDelete();
              MarcAuthoritiesDelete.checkDelete(newField.marcValue);
            });

            marcFiles.forEach((marcFile) => {
              cy.visit(TopMenu.dataImportPath);
              DataImport.verifyUploadState();
              DataImport.uploadFile(marcFile.marc, testData.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              Logs.waitFileIsImported(testData.fileName);
              Logs.checkStatusOfJobProfile('Completed');
              Logs.openFileDetails(testData.fileName);
              for (let i = 0; i < marcFile.numOfRecords; i++) {
                Logs.getCreatedItemsID(i).then((link) => {
                  createdAuthorityIDs.push(link.split('/')[5]);
                });
              }
            });

            cy.visit(TopMenu.inventoryPath);
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();

            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
              cy.wait(500);
            });

            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            cy.wait(1000);
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 240 and 711 has been linked to MARC authority record(s).',
            );
            newFields.forEach((newField) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                newField.rowIndex + 1,
                newField.tag,
                '\\',
                '\\',
                `${newField.boxFourth}`,
                `${newField.boxFifth}`,
                `${newField.boxSixth}`,
                `${newField.boxSeventh}`,
              );
            });
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            // wait for the changes to be completed.
            cy.wait(2000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });

            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t240\t   \t$a C410883 Hosanna Bible $0 http://id.loc.gov/authorities/names/n9903410883C410883 $9',
            );
            InventoryViewSource.contains(
              'Linked to MARC authority\n\t711\t   \t$a C410883 Roma Council $c Basilica di San Pietro in Roma) $d 1962-1965 : $n (2nd : $j something $0 http://id.loc.gov/authorities/names/n7908410883C410883 $9',
            );
            QuickMarcEditor.closeEditorPane();

            InventoryInstance.editMarcBibliographicRecord();
            newFields.forEach((newField) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                newField.rowIndex + 1,
                newField.tag,
                '\\',
                '\\',
                `${newField.boxFourth}`,
                `${newField.boxFifth}`,
                `${newField.boxSixth}`,
                `${newField.boxSeventh}`,
              );
            });
          },
        );
      });
    });
  });
});
