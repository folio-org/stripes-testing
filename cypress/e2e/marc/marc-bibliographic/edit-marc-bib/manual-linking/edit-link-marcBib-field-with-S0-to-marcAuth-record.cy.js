import uuid from 'uuid';
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
import FileManager from '../../../../../support/utils/fileManager';
import getRandomStringCode from '../../../../../support/utils/generateTextCode';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomCode = getRandomStringCode(15);
        const testData = {
          authoritySourceFile: {
            id: uuid(),
            name: `Source file created by USER C365596 ${randomPostfix}`,
            code: randomCode,
            type: 'names',
            baseUrl: `http://id.loc.gov/authorities/c365596/${randomPostfix}`,
            selectable: false,
            hridManagement: { startNumber: 112 },
          },
          marcBibFile: {
            marc: 'marcBibFileForC365596.mrc',
            fileName: `C365596_testBibFile${randomPostfix}.mrc`,
            editedFileName: `C365596_bibFile${randomPostfix}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          marcAuthFile: {
            marc: 'marcAuthFileForC365596.mrc',
            fileName: `C365596 testAuthFile${randomPostfix}.mrc`,
            editedFileName: `C365596_authFile${randomPostfix}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
          tag010: '010',
          tag010content: `${randomCode}365596`,
          tag700: '700',
          marcValue: 'C365596 Woodson, Jacqueline',
          searchOption: 'Personal name',
          marcAuthIcon: 'Linked to MARC authority',
        };
        const bib700AfterLinkingToAuth100 = [
          74,
          '700',
          '1',
          '\\',
          '$a C365596 Woodson, Jacqueline',
          '$e writer of foreword',
          `$0 ${testData.authoritySourceFile.baseUrl}/${testData.tag010content}`,
          '$1 http://viaf.org/viaf/79117120',
        ];
        let createdAuthorityId;
        let createdInstanceId;
        let createdAuthoritySourceFileId;

        before('Creating test data', () => {
          // Make sure there are no duplicate authority records in the system
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C365596');

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
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          FileManager.deleteFile(`cypress/fixtures/${testData.marcAuthFile.editedFileName}`);
          FileManager.deleteFile(`cypress/fixtures/${testData.marcBibFile.editedFileName}`);
          cy.deleteAuthoritySourceFileViaAPI(createdAuthoritySourceFileId, true);
        });

        it(
          'C365596 Link "MARC Bib" field with "$0" subfield matched to "MARC authority" record. "Authority source file" value created by user (700 field to 100) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C365596'] },
          () => {
            cy.getAdminToken();
            MarcAuthority.createAuthoritySource(testData.authoritySourceFile)
              .then(({ body }) => {
                createdAuthoritySourceFileId = body.id;
                DataImport.editMarcFile(
                  testData.marcAuthFile.marc,
                  testData.marcAuthFile.editedFileName,
                  ['fifteenletterss'],
                  [testData.authoritySourceFile.code],
                );
              })
              .then(() => {
                DataImport.editMarcFile(
                  testData.marcBibFile.marc,
                  testData.marcBibFile.editedFileName,
                  ['fifteenletterss'],
                  [testData.authoritySourceFile.code],
                );
              })
              .then(() => {
                DataImport.uploadFileViaApi(
                  testData.marcAuthFile.editedFileName,
                  testData.marcAuthFile.fileName,
                  testData.marcAuthFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdAuthorityId = record[testData.marcAuthFile.propertyName].id;
                  });
                });
                DataImport.uploadFileViaApi(
                  testData.marcBibFile.editedFileName,
                  testData.marcBibFile.fileName,
                  testData.marcBibFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdInstanceId = record[testData.marcBibFile.propertyName].id;
                  });
                });
              })
              .then(() => {
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });

                InventoryInstances.searchByTitle(createdInstanceId);
                InventoryInstances.selectInstanceById(createdInstanceId);
                InventoryInstance.editMarcBibliographicRecord();
                QuickMarcEditor.checkLinkButtonExistByRowIndex(74);
                QuickMarcEditor.clickLinkIconInTagField(74);
                MarcAuthority.contains(testData.tag010);
                MarcAuthority.contains(testData.tag010content);
                MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, 74);
                QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
                QuickMarcEditor.pressSaveAndClose();
                QuickMarcEditor.checkAfterSaveAndClose();
                InventoryInstance.checkContributor(`${testData.marcAuthIcon}${testData.marcValue}`);
              });
          },
        );
      });
    });
  });
});
