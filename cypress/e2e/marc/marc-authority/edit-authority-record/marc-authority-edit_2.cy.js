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
          title: 'C375120Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchOption: 'Keyword',
          tag: '100',
          rowIndex: 14,
        },
        createdAuthorityID: '',
      };
      const marcFile = {
        marc: 'marcFileForC375120.mrc',
        fileName: `C375120 testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const tags = ['110', '111', '130', '150', '151'];

      before('create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C375120"',
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
        'C375120 User cannot delete "1XX" field of "MARC authority" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C375120'] },
        () => {
          const rowIndexTag1XX = 14;
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.edit();

          tags.forEach((tag) => {
            cy.wait(1000);
            MarcAuthority.changeTag(rowIndexTag1XX, tag);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkDeleteButtonNotExist(rowIndexTag1XX);
          });
          MarcAuthority.changeTag(rowIndexTag1XX, '110');
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.edit();

          MarcAuthority.addNewField(rowIndexTag1XX, '100', '$a test');
          MarcAuthority.changeTag(rowIndexTag1XX + 1, '400');
          QuickMarcEditor.checkDeleteButtonExist(rowIndexTag1XX + 1);
        },
      );
    });
  });
});
