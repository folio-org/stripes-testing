import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        tag010: '010',
        tag100: '100',
        tag008: '008',
        prefix: 'n',
        randomValue: `423493${getRandomPostfix()}`,
        expectedErrorMessage: 'Field 008 is required.',
        testContent: '$a 008 existence test423493',
        field010Content: `$a n423493${getRandomPostfix()}`,
      };
      const LC_NAME_AUTHORITY_FILE = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const marcAuthority = {
        tag010Value: testData.field010Content,
      };

      let user;
      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;
          MarcAuthorities.setAuthoritySourceFileActivityViaAPI(LC_NAME_AUTHORITY_FILE);
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C423493 "008" field existence validation in "Create a new MARC authority record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423493'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.waitLoading();

          MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);

          QuickMarcEditor.addNewField(testData.tag010, marcAuthority.tag010Value, 3);
          QuickMarcEditor.checkContent(marcAuthority.tag010Value, 4);

          QuickMarcEditor.addNewField(testData.tag100, testData.testContent, 4);
          QuickMarcEditor.checkContent(testData.testContent, 5);

          QuickMarcEditor.updateExistingTagValue(3, '00');

          QuickMarcEditor.deleteField(3);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.expectedErrorMessage);
        },
      );
    });
  });
});
