import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C423962_MarcAuthority_${randomPostfix}`,
        tag100: '100',
      };

      const updatedHeading = `AT_C423962_MarcAuthority_UPD_${randomPostfix}`;

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
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423962_MarcAuthority');
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
        'C423962 Heading of MARC authority record does NOT change in the pane header during editing 1XX field in quickmarc (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423962'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();
          QuickMarcEditor.checkHeaderFirstLine(
            { headingTypeFrom1XX: testData.authorityHeading, headingType: '', status: '' },
            '',
          );
          QuickMarcEditor.updateExistingField(testData.tag100, `$a ${updatedHeading}`);
          QuickMarcEditor.checkContentByTag(testData.tag100, `$a ${updatedHeading}`);
          QuickMarcEditor.checkHeaderFirstLine(
            { headingTypeFrom1XX: testData.authorityHeading, headingType: '', status: '' },
            '',
          );
        },
      );
    });
  });
});
