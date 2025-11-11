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
          title: 'C350901 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchOption: 'Keyword',
          tag: '100',
          rowIndex: 14,
        },
        errorMultiple1XX: 'Field 1XX is non-repeatable and required.',
        createdAuthorityID: '',
      };
      const marcFile = {
        marc: 'marcFileForC350901.mrc',
        fileName: `C350901 testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;

      before('create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="350901"',
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
        'C350901 Add multiple / delete 1XX tag of "MARC Authority" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C350901'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.edit();
          MarcAuthority.changeTag(testData.authority.rowIndex, '');
          MarcAuthority.deleteTag(testData.authority.rowIndex);
          MarcAuthority.clickSaveAndCloseButton();
          QuickMarcEditor.checkCallout('Field 1XX is non-repeatable and required.');
          QuickMarcEditor.undoDelete();
          MarcAuthority.changeTag(testData.authority.rowIndex, testData.authority.tag);
          QuickMarcEditor.checkContentByTag(
            testData.authority.tag,
            '$a C350901 Twain, Mark, $d 1835-1910. $t Adventures of Huckleberry Finn',
          );
          MarcAuthority.checkAddNew1XXTag(
            testData.authority.rowIndex,
            testData.authority.tag,
            '$a C350901',
          );
          QuickMarcEditor.checkErrorMessage(14, testData.errorMultiple1XX);
          QuickMarcEditor.checkErrorMessage(15, testData.errorMultiple1XX);
          QuickMarcEditor.closeWithoutSavingAfterChange();
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.contains(testData.authority.title);
        },
      );
    });
  });
});
