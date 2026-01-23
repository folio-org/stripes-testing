import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authorityHeading: `AT_C359176_MarcAuthority_${getRandomPostfix()}`,
        tag100: '100',
        tag400: '400',
        tag500: '500',
        tag670: '670',
        field400Content: '$a Alternative, Name C359176',
        field500Content: '$a Related, Name C359176',
        field670Content: '$a Other Data C359176',
        firstFieldToDeleteIndex: 5,
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
        { tag: testData.tag400, content: testData.field400Content, indicators: ['\\', '\\'] },
        { tag: testData.tag500, content: testData.field500Content, indicators: ['\\', '\\'] },
        { tag: testData.tag670, content: testData.field670Content, indicators: ['\\', '\\'] },
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C359176_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields,
          ).then((createdRecordId) => {
            createdAuthorityId = createdRecordId;
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C359176 MARC Authority | Verify that deleted MARC Field will display at the same position after restoring (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C359176'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          authorityFields.slice(1).forEach((field, index) => {
            QuickMarcEditor.deleteField(testData.firstFieldToDeleteIndex + index);
            QuickMarcEditor.afterDeleteNotification(field.tag);
          });

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkDeleteModal(3);
          QuickMarcEditor.clickRestoreDeletedField();

          authorityFields.slice(1).forEach((field, index) => {
            QuickMarcEditor.verifyTagValue(testData.firstFieldToDeleteIndex + index, field.tag);
          });
        },
      );
    });
  });
});
