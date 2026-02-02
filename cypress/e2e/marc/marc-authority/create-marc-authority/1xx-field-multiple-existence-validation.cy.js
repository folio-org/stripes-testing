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
        tag110: '110',
        prefix: 'n',
        randomValue: `503061${getRandomPostfix()}`,
        expectedErrorMessage: 'Field 1XX is non-repeatable and required',
        errorNonRepeatableMessage: 'Field is non-repeatable',
        fieldsContent: [
          { index: 5, tag: '100', content: '$a 1XX field one' },
          { index: 6, tag: '100', content: '$a 1XX field two' },
        ],
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
        'C503061 "1XX" multiple field existence validation in "Create a new MARC authority record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503061'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.waitLoading();

          MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);
          MarcAuthority.select008DropdownsIfOptionsExist(dropdownSelections);

          QuickMarcEditor.addNewField(testData.tag010, marcAuthority.tag010Value, 3);
          QuickMarcEditor.checkContent(`${marcAuthority.tag010Value}`, 4);

          testData.fieldsContent.forEach(({ index }) => {
            QuickMarcEditor.addEmptyFields(index - 1);
            QuickMarcEditor.checkEmptyFieldAdded(index);
          });

          testData.fieldsContent.forEach(({ index, tag, content }) => {
            QuickMarcEditor.updateExistingTagValue(index, tag);
            QuickMarcEditor.updateExistingFieldContent(index, content);
            QuickMarcEditor.checkContent(content, index);
          });

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(
            testData.fieldsContent[0].index,
            testData.expectedErrorMessage,
          );
          QuickMarcEditor.checkErrorMessage(
            testData.fieldsContent[1].index,
            testData.errorNonRepeatableMessage,
          );

          QuickMarcEditor.updateExistingTagValue(testData.fieldsContent[1].index, testData.tag110);

          QuickMarcEditor.pressSaveAndCloseButton();
          testData.fieldsContent.forEach(({ index }) => {
            QuickMarcEditor.checkErrorMessage(index, testData.expectedErrorMessage);
          });
        },
      );
    });
  });
});
