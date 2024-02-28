import uuid from 'uuid';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import getRandomStringCode from '../../../../../support/utils/genereteTextCode';
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
import FileManager from '../../../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const randomCode = getRandomStringCode(4);
        const testData = {
          createdRecordIDs: [],
          authoritySourceFile: {
            id: uuid(),
            name: `Source option created by USER 6${getRandomPostfix()}`,
            code: randomCode,
            type: 'names',
            baseUrl: `http://id.loc.gov/authorities/pv6/${getRandomPostfix()}`,
            selectable: false,
            hridManagement: { startNumber: 112 },
          },
          marcBibFile: {
            marc: 'marcBibFileForC365595.mrc',
            fileName: `C365595 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            propertyName: 'relatedInstanceInfo',
          },
          marcAuthFile: {
            marc: 'marcAuthFileForC365595.mrc',
            fileName: `C365595 testMarcFile${getRandomPostfix()}.mrc`,
            editedFileName: `C365595 marcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            propertyName: 'relatedAuthorityInfo',
          },
          tag010: '010',
          tag010content: `${randomCode}91065740`,
          tag700: '700',
          marcValue: 'C365595 Stelfreeze, Brian',
          searchOption: 'Personal name',
          marcAuthIcon: 'Linked to MARC authority',
        };
        const bib700AfterLinkingToAuth100 = [
          75,
          '700',
          '1',
          '\\',
          '$a C365595 Stelfreeze, Brian',
          '$e artist.',
          `$0 ${testData.authoritySourceFile.baseUrl}/${testData.tag010content}`,
          '',
        ];
        const linked700FieldValues = [
          71,
          '700',
          '1',
          '\\',
          '$a C365595 Stelfreeze, Brian',
          '$e artist.',
          `$0 ${testData.authoritySourceFile.baseUrl}/${testData.tag010content}`,
          '',
        ];

        before('Creating test data', () => {
          // make sure there are no duplicate authority records in the system
          cy.getAdminToken().then(() => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C365595"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });
          });
          cy.loginAsAdmin({
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.uploadFileViaApi(
            testData.marcBibFile.marc,
            testData.marcBibFile.fileName,
            testData.marcBibFile.jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              testData.createdRecordIDs.push(record[testData.marcBibFile.propertyName].idList[0]);
            });
          });

          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
          FileManager.deleteFile(`cypress/fixtures/${testData.marcAuthFile.editedFileName}`);
        });

        it(
          'C365595 Derive | Link "MARC Bib" field without "$0" subfield to "MARC Authority" record. "Authority source file" value created by user (700 field to 100) (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            cy.getAdminToken();
            MarcAuthority.createAuthoritySource(testData.authoritySourceFile).then(() => {
              DataImport.editMarcFile(
                testData.marcAuthFile.marc,
                testData.marcAuthFile.editedFileName,
                ['PLK'],
                [testData.authoritySourceFile.code],
              );
            });
            DataImport.verifyUploadState();
            DataImport.uploadFile(
              testData.marcAuthFile.editedFileName,
              testData.marcAuthFile.fileName,
            );
            JobProfiles.waitFileIsUploaded();
            JobProfiles.search(testData.marcAuthFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(testData.marcAuthFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(testData.marcAuthFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              testData.createdRecordIDs.push(link.split('/')[5]);
            });

            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.checkLinkButtonExistByRowIndex(75);
            QuickMarcEditor.clickLinkIconInTagField(75);
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);
            MarcAuthority.contains(testData.tag010);
            MarcAuthority.contains(testData.tag010content);
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, 75);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            InventoryInstance.verifyContributor(
              1,
              1,
              `${testData.marcAuthIcon}${testData.marcValue}`,
            );
            InventoryInstance.goToEditMARCBiblRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyTagFieldAfterLinking(...linked700FieldValues);
          },
        );
      });
    });
  });
});
