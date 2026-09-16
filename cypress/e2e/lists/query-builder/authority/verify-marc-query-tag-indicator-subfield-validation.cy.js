import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1504438';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const marcFieldOption = 'MARC Authority — MARC';
const blank = '\\';
const tagError = 'Enter a 3-digit tag';
const indicatorError = 'Enter a-z, 0-9, or \\ for blank';
const subfieldError = 'Enter a-z or 0-9';
// A single letter, a single digit and the backslash standing for a blank are the valid indicator entries;
// the backslash is not valid for a subfield
const validIndicators = ['a', '0', blank];
const validSubfields = ['a', '0'];
const invalidCharacters = ['!', 'õ'];

const capabSetsToAssign = [
  CapabilitySets.moduleListsManage,
  CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
  CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
];

let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssign);

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1504438 Validate Tag/Indicator/Subfield input validation when building MARC query for Authority records (athena)',
        { tags: ['extendedPath', 'athena', 'C1504438'] },
        () => {
          // Precondition: open "Build query" for the "Authority" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select "MARC Authority — MARC" in "Select field" dropdown
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.verifyOperatorColumnAbsent();

          // Step 2: Type the tag digit by digit without leaving the "Tag" field
          ['2', '4', '5'].forEach((digit) => {
            QueryModal.typeInMarcTextField('tag', digit);
            QueryModal.verifyMarcTextFieldWithoutError('tag');
          });
          QueryModal.verifyMarcTagValue('245');
          QueryModal.verifyOperatorColumn();

          // Step 3: Delete the last digit of the tag and leave the "Tag" field
          QueryModal.typeInMarcTextField('tag', '{backspace}');
          QueryModal.verifyMarcTagValue('24');
          QueryModal.blurMarcTextField('tag');
          QueryModal.verifyMarcTextFieldError('tag', tagError, { focused: false });
          QueryModal.verifyOperatorColumnAbsent();

          // Step 4: Make the tag a 3-character non-numeric value without leaving the "Tag" field
          QueryModal.typeInMarcTextField('tag', 'a');
          QueryModal.verifyMarcTagValue('24a');
          QueryModal.verifyMarcTextFieldError('tag', tagError);
          QueryModal.verifyOperatorColumnAbsent();

          // Step 5: Correct the tag to a valid one without leaving the "Tag" field
          QueryModal.typeInMarcTextField('tag', '{backspace}5');
          QueryModal.verifyMarcTagValue('245');
          QueryModal.verifyMarcTextFieldWithoutError('tag');
          QueryModal.verifyOperatorColumn();

          // Steps 6-9: The same set of entries is checked in both indicator fields
          ['ind1', 'ind2'].forEach((indicator) => {
            // Steps 6-7, 9: Invalid characters are flagged while the indicator field is still focused
            invalidCharacters.forEach((character) => {
              QueryModal.clearMarcTextField(indicator);
              QueryModal.typeInMarcTextField(indicator, character);
              QueryModal.verifyMarcTextFieldWithoutError('tag', { focused: false });
              QueryModal.verifyMarcTextFieldError(indicator, indicatorError);
              QueryModal.verifyOperatorColumnAbsent();
            });

            // Steps 8-9: A single letter, digit or backslash is accepted
            validIndicators.forEach((character) => {
              QueryModal.clearMarcTextField(indicator);
              QueryModal.typeInMarcTextField(indicator, character);
              QueryModal.verifyMarcTextFieldWithoutError(indicator);
              QueryModal.verifyOperatorColumn();
            });
          });
          QueryModal.verifyMarcTagValue('245');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });

          // Steps 10-11: Invalid characters are flagged while the "Subfield" field is still focused
          [blank, ...invalidCharacters].forEach((character) => {
            QueryModal.clearMarcTextField('subfield');
            QueryModal.typeInMarcTextField('subfield', character);
            QueryModal.verifyMarcTextFieldError('subfield', subfieldError);
            QueryModal.verifyOperatorColumnAbsent();
          });

          // Step 12: A single letter or digit is accepted
          validSubfields.forEach((character) => {
            QueryModal.clearMarcTextField('subfield');
            QueryModal.typeInMarcTextField('subfield', character);
            QueryModal.verifyMarcTextFieldWithoutError('subfield');
            QueryModal.verifyOperatorColumn();
          });
        },
      );
    });
  });
});
