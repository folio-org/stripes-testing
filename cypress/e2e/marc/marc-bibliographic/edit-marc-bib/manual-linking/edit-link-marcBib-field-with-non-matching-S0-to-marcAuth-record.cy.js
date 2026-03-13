import uuid from 'uuid';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../../../support/constants';
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
            name: `Source file created by USER C423593 ${randomPostfix}`,
            code: randomCode,
            type: 'names',
            baseUrl: `http://id.loc.gov/authorities/c423593/${randomPostfix}`,
            selectable: false,
            hridManagement: { startNumber: 112 },
          },
          marcBibFile: {
            marc: 'marcBibFileForC423593.mrc',
            fileName: `C423593_testBibFile${randomPostfix}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          marcAuthFile: {
            marc: 'marcAuthFileForC423593.mrc',
            fileName: `C423593_testAuthFile${randomPostfix}.mrc`,
            editedFileName: `C423593_authFile${randomPostfix}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
          tag010: '010',
          tag010content: `${randomCode}423593`,
          tag100: '100',
          marcValue: 'C423593 Chin, Staceyann 1972-',
          originalSearchOptionValue: 'advancedSearch',
          newSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
          marcAuthIcon: 'Linked to MARC authority',
          cqlQuery:
            'keyword exactPhrase Letshopethereisnosuchauthorityheading or identifiers.value exactPhrase nonexisting999321654423593',
        };
        const bib100AfterLinkingToAuth100 = [
          32,
          '100',
          '1',
          '\\',
          '$a C423593 Chin, Staceyann $d 1972-',
          '$e Author $e Narrator',
          `$0 ${testData.authoritySourceFile.baseUrl}/${testData.tag010content}`,
          '$1 http://viaf.org/viaf/79117120423593',
        ];
        let createdAuthorityId;
        let createdInstanceId;
        let createdAuthoritySourceFileId;

        before('Creating test data', () => {
          // Make sure there are no duplicate authority records in the system
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C423593');

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
          cy.deleteAuthoritySourceFileViaAPI(createdAuthoritySourceFileId, true);
        });

        it(
          'C423593 Link "MARC Bib" field with subfield "$0" which doesn\'t match to "MARC authority" record with created by user "Authority source file" (100 field to 100) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C423593'] },
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
                  testData.marcBibFile.marc,
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
                QuickMarcEditor.checkLinkButtonExistByRowIndex(32);
                QuickMarcEditor.clickLinkIconInTagField(32);
                MarcAuthorities.checkSearchOption(testData.originalSearchOptionValue);
                MarcAuthorities.checkSearchInput(testData.cqlQuery);
                MarcAuthorities.verifyEmptyAuthorityFieldInPlugin();
                InventoryInstance.searchResultsWithOption(
                  testData.newSearchOption,
                  testData.tag010content,
                );
                MarcAuthority.contains(testData.marcValue.split(' 1972')[0]);
                MarcAuthority.contains(testData.tag010content);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag100, 32);
                QuickMarcEditor.verifyTagFieldAfterLinking(...bib100AfterLinkingToAuth100);
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
