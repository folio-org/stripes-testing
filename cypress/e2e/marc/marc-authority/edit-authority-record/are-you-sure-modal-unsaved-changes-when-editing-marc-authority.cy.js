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
        field100: { tag: '100', content: 'C434151 Updated authority field' },
        searchOption: 'Keyword',
      };
      const marcFile = {
        marc: 'marcAuthFileForC434151.mrc',
        fileName: `testMarcFileC434151.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
        authorityTitle: 'C434151 Chin, Staceyann, 1972-',
      };

      before('Creating data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(marcFile.authorityTitle);

        DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun);
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            cy.reload();
            MarcAuthorities.waitLoading();
          }, 20_000);
        });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(marcFile.authorityTitle);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C434151 "Are you sure?" modal is displayed after user pressed "ESC" button when record has unsaved changes - Edit MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C434151'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFile.authorityTitle);
          MarcAuthorities.selectFirstRecord();
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(testData.field100.tag, testData.field100.content);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();
          QuickMarcEditor.discardChangesWithEscapeKey(4);
          QuickMarcEditor.cancelEditConfirmationPresented();
        },
      );
    });
  });
});
