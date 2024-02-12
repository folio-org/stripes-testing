import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      calloutMessage:
        'This record has successfully saved and is in process. Changes may not appear immediately.',
      editedField: {
        tag: '035',
        contentBefore: '',
        editedContent: 'test',
      },
      authTitle: 'C417046 Jackson, Peter',
      marcFile: {
        marc: 'marcAuthC417046.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
      },
    };

    before('Creating user', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        testData.recordId = response.relatedAuthorityInfo.idList[0];
      });

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: `keyword="${testData.authTitle}" and (authRefType==("Authorized" or "Auth/Ref"))`,
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id);
            });
          }
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      MarcAuthority.deleteViaAPI(testData.recordId);
    });

    it(
      'C417046 Update MARC Authority via MARC Auth app; check for updated 005 (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        MarcAuthorities.searchBy('Keyword', testData.authTitle);
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.getRegularTagContent(testData.editedField.tag).then((content) => {
          testData.editedField.contentBefore = content;
          MarcAuthority.changeField(
            testData.editedField.tag,
            `${testData.editedField.contentBefore} ${testData.editedField.editedContent}`,
          );
          QuickMarcEditor.checkContentByTag(
            `${testData.editedField.contentBefore} ${testData.editedField.editedContent}`,
            testData.editedField.tag,
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.calloutMessage);
          MarcAuthority.contains(
            `${testData.editedField.contentBefore} ${testData.editedField.editedContent}`,
          );

          // The 005 field is updated with the date and time when last changes were applied
          MarcAuthority.contains(
            new Date()
              .toISOString()
              .replace(/[-T:Z]/g, '')
              .slice(0, 8),
          );
          MarcAuthority.verify005FieldInMarc21AuthFormat();
        });
      },
    );
  });
});
