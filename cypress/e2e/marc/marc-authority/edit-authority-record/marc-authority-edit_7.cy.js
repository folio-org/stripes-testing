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
        authority: {
          title: 'C356840Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchOption: 'Keyword',
          tag: '100',
          rowIndex: 14,
        },
      };
      const marcFile = {
        marc: 'marcFileForC356840.mrc',
        fileName: `C356840 testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;

      before('create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C356840"',
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
        'C356840 Verify that the "Save & close" button enabled when user make changes in the record. (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C356840'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.edit();
          // Waiter needed for the whole page to be loaded.
          cy.wait(2000);
          MarcAuthority.addNewField(7, '555', '$a test');
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          MarcAuthority.addNewField(7, '555', '$a test');
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          MarcAuthority.addNewField(7, '555', '$a test');
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          MarcAuthority.deleteTag(8);
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          MarcAuthority.deleteTag(8);
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          MarcAuthority.deleteTag(8);
          MarcAuthority.deleteTag(8);
          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          MarcAuthorities.waitLoading();
        },
      );
    });
  });
});
