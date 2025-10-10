import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeadingPrefix: `AT_C813629_MarcAuthority_${getRandomPostfix()}`,
        tag008: '008',
        tag010: '010',
        tag100: '100',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n813629${randomDigits}${randomDigits}`,
      };

      const existingAuthorityHeading = `${testData.authorityHeadingPrefix} Existing`;
      const newAuthorityHeading = `${testData.authorityHeadingPrefix} New`;

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${existingAuthorityHeading}`,
          indicators: ['\\', '\\'],
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C813629_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields,
          ).then(() => {
            MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.authoritySourceFile);

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeadingPrefix);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C813629 Detail view of created "MARC authority" record is open automatically after creation when user is on search result list with one result (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813629'] },
        () => {
          MarcAuthorities.searchBeats(existingAuthorityHeading);
          MarcAuthorities.selectTitle(existingAuthorityHeading);
          MarcAuthority.contains(existingAuthorityHeading);

          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          for (let i = 0; i < 2; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
          }
          cy.wait(1000);

          QuickMarcEditor.addValuesToExistingField(
            3,
            testData.tag100,
            `$a ${newAuthorityHeading}`,
            '1',
            '\\',
          );
          QuickMarcEditor.addValuesToExistingField(
            4,
            testData.tag010,
            `$a ${testData.naturalId}`,
            '\\',
            '\\',
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(newAuthorityHeading);
        },
      );
    });
  });
});
