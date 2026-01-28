import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authorityB: {
          title: 'C359238Beethoven, Ludwig van (no 010)',
          searchOption: 'Keyword',
        },
      };
      const marcFile = {
        marc: 'marcFileForC359238.mrc',
        fileName: `C359238 testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const tags = ['381', '382', '379', ''];

      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C359238"',
          }).then((records) => {
            records.forEach((record) => {
              if (record.authRefType === 'Authorized') {
                MarcAuthority.deleteViaAPI(record.id);
              }
            });
          });
          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              testData.createdAuthorityID = response[0].authority.id;
            },
          );
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdAuthorityID);
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });

      it(
        'C359238 MARC Authority | Displaying of placeholder message when user deletes a row (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C359238'] },
        () => {
          MarcAuthorities.searchAndVerify(
            testData.authorityB.searchOption,
            testData.authorityB.title,
          );
          MarcAuthority.edit();

          // Waiter needed for the whole page to be loaded.
          cy.wait(2000);
          for (let i = 0; i < 4; i++) {
            QuickMarcEditor.addEmptyFields(4);
          }
          QuickMarcEditor.addValuesToExistingField(4, '', '$a');
          QuickMarcEditor.addValuesToExistingField(5, '251', '$a');
          QuickMarcEditor.addValuesToExistingField(6, '', '$a Filled');
          QuickMarcEditor.addValuesToExistingField(7, '400', '$a value');
          QuickMarcEditor.checkButtonsEnabled();
          for (let i = 0; i < 4; i++) {
            QuickMarcEditor.deleteField(5);
          }

          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.deleteField(4);
          QuickMarcEditor.afterDeleteNotification('035');
          QuickMarcEditor.undoDelete();
          QuickMarcEditor.updateExistingTagValue(7, '381');
          QuickMarcEditor.updateExistingFieldContent(8, '$a Filled');
          QuickMarcEditor.updateExistingTagValue(9, '379');
          QuickMarcEditor.updateExistingFieldContent(9, '$a value');
          QuickMarcEditor.updateExistingTagValue(10, '');
          for (let i = 7; i < 11; i++) {
            QuickMarcEditor.deleteField(i);
          }

          tags.forEach((tag) => {
            QuickMarcEditor.afterDeleteNotification(tag);
          });
          QuickMarcEditor.undoDelete();

          QuickMarcEditor.deleteField(10);
          QuickMarcEditor.deleteField(11);
          QuickMarcEditor.afterDeleteNotification('');
          QuickMarcEditor.afterDeleteNotification('400');
          QuickMarcEditor.clickSaveAndCloseThenCheck(2);
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.deleteField(8);
          QuickMarcEditor.deleteField(10);
          QuickMarcEditor.afterDeleteNotification('382');
          QuickMarcEditor.afterDeleteNotification('');
          QuickMarcEditor.clickSaveAndCloseThenCheck(2);
          QuickMarcEditor.confirmDelete();
          cy.wait(1500);
          QuickMarcEditor.checkFieldAbsense('382');
        },
      );
    });
  });
});
