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
          title: 'C375172Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchOption: 'Keyword',
          tag: '100',
          rowIndex: 14,
        },
        errorMultiple1XX: 'Field 1XX is non-repeatable and required.',
        errorFieldNonRepitable: 'Field is non-repeatable.',
      };
      const marcFile = {
        marc: 'marcFileForC375172.mrc',
        fileName: `C375172 testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;

      before('create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C375172"',
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
        'C375172 Save "MARC authority" record with deleted field and updated fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C375172'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.edit();
          // Waiter needed for the whole page to be loaded.
          cy.wait(2000);
          MarcAuthority.deleteTag(5);
          MarcAuthority.changeTag(6, '100');
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(6, testData.errorMultiple1XX);
          QuickMarcEditor.checkErrorMessage(14, testData.errorMultiple1XX);
          // QuickMarcEditor.checkErrorMessage(14, testData.errorFieldNonRepitable);
          MarcAuthority.changeTag(6, '025');
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.checkDeleteModalClosed();
          QuickMarcEditor.checkContent(
            '$a Q215410 $2 wikidata $1 http://www.wikidata.org/entity/Q215410',
            5,
          );
          QuickMarcEditor.checkButtonsEnabled();
        },
      );
    });
  });
});
