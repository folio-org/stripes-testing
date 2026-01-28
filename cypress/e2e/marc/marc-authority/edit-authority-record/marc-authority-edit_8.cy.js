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
          title: 'C375141Beethoven, Ludwig van (no 010)',
          searchOption: 'Keyword',
        },
      };
      const marcFile = {
        marc: 'marcFileForC375141.mrc',
        fileName: `C375141 testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;

      before('create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375141');
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
        'C375141 Add/edit/delete "010" field of "MARC authority" record not linked to a "MARC bibliographic" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C375141'] },
        () => {
          MarcAuthorities.searchAndVerify(
            testData.authorityB.searchOption,
            testData.authorityB.title,
          );
          MarcAuthority.edit();
          MarcAuthorities.check010FieldAbsence();
          MarcAuthority.addNewField(4, '010', '$a 123123');
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          cy.wait(4000);
          QuickMarcEditor.updateExistingField('010', '$a n90635366');
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          cy.wait(4000);
          QuickMarcEditor.deleteFieldAndCheck(5, '010');
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndCloseThenCheck(1);
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
        },
      );
    });
  });
});
