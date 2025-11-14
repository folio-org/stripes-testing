import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  AUTHORITY_008_FIELD_ROMAN_DROPDOWN,
  AUTHORITY_008_FIELD_SERIES_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C794530_MarcAuthority_${randomPostfix}`,
        tag008: '008',
        tag100: '100',
        tag008Index: 3,
        tag008FinalSourceValue: 'na acaanaaan          |a aaa',
      };

      const updatedHeading = `${testData.authorityHeading} UPD`;

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
      const custom008Values = { ...MarcAuthorities.valid008FieldValues, Roman: '\\', Series: '\\' };

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C794530_MarcAuthority');
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
            undefined,
            custom008Values,
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
        'C794530 Edit "MARC authority" record with invalid values in "008" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C794530'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.ROMAN,
          );
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SERIES,
          );

          QuickMarcEditor.updateExistingField(testData.tag100, `$a ${updatedHeading}`);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(
            testData.tag008Index,
            QuickMarcEditor.getTag008BoxErrorText(AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.ROMAN),
          );
          QuickMarcEditor.checkErrorMessage(
            testData.tag008Index,
            QuickMarcEditor.getTag008BoxErrorText(AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SERIES),
          );

          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.ROMAN,
            AUTHORITY_008_FIELD_ROMAN_DROPDOWN.A,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SERIES,
            AUTHORITY_008_FIELD_SERIES_DROPDOWN.A,
          );
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.ROMAN,
            false,
          );
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SERIES,
            false,
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.tag008FinalSourceValue);
        },
      );
    });
  });
});
