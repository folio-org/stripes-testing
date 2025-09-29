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
        authorityHeading: `AT_C409501_MarcAuthority_${getRandomPostfix()}`,
        tag180: '180',
        tag480: '480',
        tag580: '580',
        valueToAdd: 'UPDATED_480',
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag180,
          content: `$x ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
        { tag: testData.tag480, content: '$x C409501 tag 480', indicators: ['\\', '\\'] },
        { tag: testData.tag580, content: '$x C409501 tag 580', indicators: ['\\', '\\'] },
      ];

      const tag480UpdatedContent = `${authorityFields[1].content} ${testData.valueToAdd}`;

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409501_MarcAuthority');
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
        'C409501 Edit "MARC Authority" record that has a heading 147, 148, 162, 180, 181, 182, 185 (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409501'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(testData.tag480, tag480UpdatedContent);
          QuickMarcEditor.checkContentByTag(testData.tag480, tag480UpdatedContent);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.valueToAdd);

          MarcAuthority.edit();
          QuickMarcEditor.checkContentByTag(testData.tag480, tag480UpdatedContent);
        },
      );
    });
  });
});
