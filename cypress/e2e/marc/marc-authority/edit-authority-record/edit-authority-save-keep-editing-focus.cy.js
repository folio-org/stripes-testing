import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C605892_MarcAuthority_${randomPostfix}`,
        tagLdr: 'LDR',
        tag008: '008',
        tag053: '053',
        tag100: '100',
        tag110: '110',
        tag400: '400',
        tag053Content: '$a 053test',
        tag400Content: '$a tag400',
        newLangBoxValue: 'b',
      };

      const tag1XXUpdatedValues = {
        update1: `$a ${testData.authorityHeading} $t test focus`,
        update2: `$a Check focus ${testData.authorityHeading} $t test focus`,
        update3: `$a Check focus ${testData.authorityHeading} $t test focus-pocus`,
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const pauseAfterEdit = () => cy.wait(1000);

      const authorityFields = [
        {
          tag: testData.tag053,
          content: testData.tag053Content,
          indicators: ['\\', '0'],
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag400,
          content: testData.tag400Content,
          indicators: ['1', '\\'],
        },
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C605892_MarcAuthority');
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

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C605892 Keep user\'s focus on last edited(selected) field when user clicks on the "Save & keep editing" on "Edit MARC authority record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C605892'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          QuickMarcEditor.updateExistingField(testData.tag100, tag1XXUpdatedValues.update1);
          QuickMarcEditor.checkContentByTag(testData.tag100, tag1XXUpdatedValues.update1);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyContentBoxIsFocused(testData.tag100);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.updateExistingField(testData.tag100, tag1XXUpdatedValues.update2);
          QuickMarcEditor.checkContentByTag(testData.tag100, tag1XXUpdatedValues.update2);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyContentBoxIsFocused(testData.tag100);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
          QuickMarcEditor.checkContentByTag(testData.tag110, tag1XXUpdatedValues.update2);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyTagBoxIsFocused(5);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.updateIndicatorValue(testData.tag110, '2', 0);
          QuickMarcEditor.verifyIndicatorValue(testData.tag110, '2', 0);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyIndicatorBoxIsFocused(testData.tag110, 0);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.focusOnFieldBox(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
          );
          QuickMarcEditor.fillInTextBoxInField(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            testData.newLangBoxValue,
          );
          QuickMarcEditor.verifyTextBoxValueInField(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            testData.newLangBoxValue,
          );
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyFieldBoxFocused(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
          );
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.focusOnFieldsDropdown(
            testData.tagLdr,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLdr,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.C,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLdr,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.C,
          );
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyFieldDropdownFocused(
            testData.tagLdr,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          );
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.moveFieldUp(5);
          QuickMarcEditor.verifyAfterMovingFieldUp(4, testData.tag110, tag1XXUpdatedValues.update2);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyAfterMovingFieldUp(4, testData.tag110, tag1XXUpdatedValues.update2);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.moveFieldDown(4);
          QuickMarcEditor.verifyAfterMovingFieldDown(
            5,
            testData.tag110,
            tag1XXUpdatedValues.update2,
          );
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyAfterMovingFieldDown(
            5,
            testData.tag110,
            tag1XXUpdatedValues.update2,
          );
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag053);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.verifyAfterMovingFieldUp(4, testData.tag110, tag1XXUpdatedValues.update2);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          pauseAfterEdit();
          QuickMarcEditor.updateExistingField(testData.tag110, tag1XXUpdatedValues.update3);
          QuickMarcEditor.updateExistingField(testData.tag400, testData.tag400Content);
          QuickMarcEditor.checkContentByTag(testData.tag110, tag1XXUpdatedValues.update3);
          QuickMarcEditor.checkContentByTag(testData.tag400, testData.tag400Content);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyContentBoxIsFocused(testData.tag400);
          QuickMarcEditor.checkButtonsDisabled();
        },
      );
    });
  });
});
