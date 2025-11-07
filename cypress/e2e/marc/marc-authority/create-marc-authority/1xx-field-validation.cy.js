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
        prefix: 'n',
        randomValue: `423520${getRandomPostfix()}`,
        expectedErrorMessage: 'Field 1XX is non-repeatable and required.',
      };
      const LC_NAME_AUTHORITY_FILE = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;

      const dropdownSelections = {
        'Geo Subd': 'a',
        Roman: 'a',
        Lang: 'b',
        'Kind rec': 'a',
        'Cat Rules': 'b',
        'SH Sys': 'a',
        Series: 'b',
        'Numb Series': 'a',
        'Main use': 'a',
        'Subj use': 'a',
        'Series use': 'a',
        'Type Subd': 'a',
        'Govt Ag': 'a',
        RefEval: 'a',
        RecUpd: 'a',
        'Pers Name': 'b',
        'Level Est': 'a',
        'Mod Rec': 'a',
        Source: 'a',
      };

      const marcAuthority = {
        tag010Value: `$a ${testData.prefix}${testData.randomValue}`,
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
        'C423520 "1XX" field existence validation in "Create a new MARC authority record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423520'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.waitLoading();

          // Step 2: Select authority file from dropdown
          MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);

          // Step 3: Select valid values in 008 field positions
          MarcAuthority.select008DropdownsIfOptionsExist(dropdownSelections);

          // Step 4: Add 010 field with value
          QuickMarcEditor.addNewField(testData.tag010, marcAuthority.tag010Value, 3);
          QuickMarcEditor.checkContent(`${marcAuthority.tag010Value}`, 4);

          // Step 5: Click "Save & close" without 1XX field
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.expectedErrorMessage);
          QuickMarcEditor.closeAllCallouts();

          // Step 6: Add new empty field
          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);

          // Step 7: Fill in the MARC tag with 100
          QuickMarcEditor.updateExistingTagValue(5, testData.tag100);
          QuickMarcEditor.checkContentByTag(testData.tag100, '$a ');

          // Step 8: Click "Save & close" with 1XX field but with $a
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.expectedErrorMessage);
          QuickMarcEditor.closeAllCallouts();

          // Step 9: Delete "$a" from the 1XX field
          QuickMarcEditor.updateExistingFieldContent(5, '');

          // Step 10: Click "Save & close" with empty 1XX field
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.expectedErrorMessage);
        },
      );
    });
  });
});
