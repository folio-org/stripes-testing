import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  AUTHORITY_SEARCH_ACCORDION_NAMES,
  AUTHORITY_TYPES,
} from '../../../../support/constants';
import { including } from '../../../../../interactors';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomDigits = randomFourDigitNumber();
      const testData = {
        tag010: '010',
        tag110: '110',
        tag370: '370',
        tag410: '410',
        tag500: '500',
        tag510: '510',
        tag511: '511',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n813628${randomDigits}${randomDigits}`,
        defaultIndicatorValue: '\\',
        authorityHeadingPrefix: 'AT_C451563_MarcAuthority',
      };

      const fieldContents = [
        { tag: testData.tag010, content: `$a ${testData.naturalId}` },
        {
          tag: testData.tag110,
          content: `$a ${testData.authorityHeadingPrefix} Ke{dollar}ha (test {dollar} sign) ${getRandomPostfix()}`,
        },
        { tag: testData.tag370, content: '$a Cost 50{dollar}, field for test' },
        { tag: testData.tag410, content: '$a US dollars ({dollar}) - field for test' },
        { tag: testData.tag410, content: '$a Heading - {dollar}{dollar}{dollar} $b {dollar}410' },
        { tag: testData.tag500, content: '$a upper case first code test' },
        { tag: testData.tag510, content: '$a upper case $b not First $c Code $d TEST' },
        { tag: testData.tag511, content: '$b A$aP $cp' },
      ];

      const fieldContentsAfterSave = [
        { tag: testData.tag010, content: fieldContents[0].content },
        { tag: testData.tag110, content: fieldContents[1].content },
        { tag: testData.tag370, content: fieldContents[2].content },
        { tag: testData.tag410, content: fieldContents[3].content },
        { tag: testData.tag410, content: fieldContents[4].content },
        { tag: testData.tag500, content: '$a upper case first code test' },
        { tag: testData.tag510, content: '$a upper case $b not First $c Code $d TEST' },
        { tag: testData.tag511, content: '$b A $a P $c p' },
      ];

      const expectedSourceFields = fieldContentsAfterSave.map(
        (field) => `${field.tag}\t   \t${field.content.replace(/{dollar}/g, '$')}`,
      );

      const browseQuery = fieldContents[1].content.replace('$a ', '').replace(/{dollar}/g, '$');

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeadingPrefix);
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.authoritySourceFile);

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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeadingPrefix);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C813628 Create "MARC authority" record which has "$" sign ("{dollar}" code) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813628'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          fieldContents.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, 3 + index);
          });
          fieldContents.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 4 + index);
          });

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          fieldContentsAfterSave.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 4 + index);
          });

          QuickMarcEditor.close();
          MarcAuthority.waitLoading();
          expectedSourceFields.forEach((field) => {
            MarcAuthority.contains(field);
          });

          MarcAuthorities.searchByParameter(MARC_AUTHORITY_SEARCH_OPTIONS.LCCN, testData.naturalId);
          MarcAuthorities.checkRow(including(testData.authorityHeadingPrefix));
          MarcAuthorities.checkRow(testData.authoritySourceFile);

          MarcAuthorities.verifyMultiselectFilterOptionExists(
            AUTHORITY_SEARCH_ACCORDION_NAMES.AUTHORITY_SOURCE,
            testData.authoritySourceFile,
          );
          MarcAuthorities.verifyMultiselectFilterOptionsCount(
            AUTHORITY_SEARCH_ACCORDION_NAMES.AUTHORITY_SOURCE,
            1,
          );

          MarcAuthorities.switchToBrowse();
          MarcAuthorities.checkDefaultBrowseOptions();
          MarcAuthorityBrowse.searchBy(
            MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
            browseQuery,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorityBrowse.checkResultWithValue(
            AUTHORITY_TYPES.AUTHORIZED,
            browseQuery,
            true,
            true,
          );
        },
      );
    });
  });
});
