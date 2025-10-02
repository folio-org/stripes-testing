import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const lccnPrefix = `569887${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        authorityHeading: `AT_C569560_MarcAuthority_${randomPostfix}`,
        tag010: '010',
        tag100: '100',
        initial010Content: '$a n1234567',
        invalidLccnContent: `$a no${lccnPrefix}1 $z n ${lccnPrefix}2`,
      };

      const tag010BoxesAfterSave = {
        tag: testData.tag010,
        ind1: '\\',
        ind2: '\\',
        content: testData.invalidLccnContent,
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag010,
          content: testData.initial010Content,
        },
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569560_MarcAuthority');
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
        'C569560 Edit MARC authority" record with invalid LCCN when "LCCN structure validation" is disabled (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C569560'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          QuickMarcEditor.updateExistingField(testData.tag010, testData.invalidLccnContent);

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyTagField(
            5,
            tag010BoxesAfterSave.tag,
            tag010BoxesAfterSave.ind1,
            tag010BoxesAfterSave.ind2,
            tag010BoxesAfterSave.content,
            '',
          );
        },
      );
    });
  });
});
