import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN,
  AUTHORITY_008_FIELD_ROMAN_DROPDOWN,
  AUTHORITY_008_FIELD_LANG_DROPDOWN,
  AUTHORITY_008_FIELD_KINDREC_DROPDOWN,
  AUTHORITY_008_FIELD_CATRULES_DROPDOWN,
  AUTHORITY_008_FIELD_SHSYS_DROPDOWN,
  AUTHORITY_008_FIELD_SERIES_DROPDOWN,
  AUTHORITY_008_FIELD_NUMBSERIES_DROPDOWN,
  AUTHORITY_008_FIELD_MAINUSE_DROPDOWN,
  AUTHORITY_008_FIELD_SUBJUSE_DROPDOWN,
  AUTHORITY_008_FIELD_SERIESUSE_DROPDOWN,
  AUTHORITY_008_FIELD_SUBDTYPE_DROPDOWN,
  AUTHORITY_008_FIELD_GOVTAG_DROPDOWN,
  AUTHORITY_008_FIELD_REFEVAL_DROPDOWN,
  AUTHORITY_008_FIELD_RECUPD_DROPDOWN,
  AUTHORITY_008_FIELD_PERSNAME_DROPDOWN,
  AUTHORITY_008_FIELD_LEVELEST_DROPDOWN,
  AUTHORITY_008_FIELD_MODREC_DROPDOWN,
  AUTHORITY_008_FIELD_SOURCE_DROPDOWN,
} from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);
      const sourceFieName = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const authorityHeading = `AT_C423497_MarcAuthority_${randomPostfix}`;
      const naturalId = `n423497${randomDigits}`;
      const tags = {
        tagLdr: 'LDR',
        tag008: '008',
        tag010: '010',
        tag100: '100',
      };
      const tag008ErrorText = (label) => `Fail: Record cannot be saved. Field 008 contains an invalid value in "${label}" position.`;
      const dropdownData = [];
      Object.values(AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES).forEach((dropdownBoxName, index) => {
        const optionsLists = [
          AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN,
          AUTHORITY_008_FIELD_ROMAN_DROPDOWN,
          AUTHORITY_008_FIELD_LANG_DROPDOWN,
          AUTHORITY_008_FIELD_KINDREC_DROPDOWN,
          AUTHORITY_008_FIELD_CATRULES_DROPDOWN,
          AUTHORITY_008_FIELD_SHSYS_DROPDOWN,
          AUTHORITY_008_FIELD_SERIES_DROPDOWN,
          AUTHORITY_008_FIELD_NUMBSERIES_DROPDOWN,
          AUTHORITY_008_FIELD_MAINUSE_DROPDOWN,
          AUTHORITY_008_FIELD_SUBJUSE_DROPDOWN,
          AUTHORITY_008_FIELD_SERIESUSE_DROPDOWN,
          AUTHORITY_008_FIELD_SUBDTYPE_DROPDOWN,
          AUTHORITY_008_FIELD_GOVTAG_DROPDOWN,
          AUTHORITY_008_FIELD_REFEVAL_DROPDOWN,
          AUTHORITY_008_FIELD_RECUPD_DROPDOWN,
          AUTHORITY_008_FIELD_PERSNAME_DROPDOWN,
          AUTHORITY_008_FIELD_LEVELEST_DROPDOWN,
          AUTHORITY_008_FIELD_MODREC_DROPDOWN,
          AUTHORITY_008_FIELD_SOURCE_DROPDOWN,
        ];
        dropdownData.push({
          label: dropdownBoxName,
          options: Object.values(optionsLists[index]),
        });
      });
      const defaultInvalid008Fields = [];
      [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16].forEach((position) => {
        dropdownData[position].labelForError = dropdownData[position].label;
        if (dropdownData[position].label === AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.CATRULES) dropdownData[position].labelForError = 'Cat Rules';
        if (dropdownData[position].label === AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SUBDTYPE) dropdownData[position].labelForError = 'Type Subd';
        defaultInvalid008Fields.push(dropdownData[position]);
      });
      const userPermissionsMember = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
      ];
      const valid008BoxesData = MarcAuthority.defaultAuthority.tag008AuthorityBytesProperties
        .getAllProperties()
        .map((property) => {
          property.value = property.defaultValue.split(' - ')[0];
          property.value = property.value === '\\' ? ' ' : property.value;
          return property;
        });
      function getSource008String() {
        const date = DateTools.getCurrentDateYYMMDD();
        return (
          [
            date,
            valid008BoxesData
              .map((property) => property.value)
              .slice(0, 12)
              .join(''),
            ' '.repeat(10),
            valid008BoxesData
              .map((property) => property.value)
              .slice(12, 14)
              .join(''),
            ' ',
            valid008BoxesData
              .map((property) => property.value)
              .slice(14, 17)
              .join(''),
            ' '.repeat(4),
            valid008BoxesData
              .map((property) => property.value)
              .slice(17, 19)
              .join(''),
          ]
            .join('')
            // emulating how spaces handled in interactor, for assertion
            .trim()
        );
      }
      const user = {};

      before('Create user, data', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.setAuthorityFileToActiveViaApi(
          DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        );

        cy.createTempUser(userPermissionsMember).then((userProperties) => {
          user.userProperties = userProperties;

          cy.login(user.userProperties.username, user.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(
          DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        );
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423497_');
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C423497 Verify "008" field dropdowns on Create MARC authority pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423497'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.checkSourceFileSelectShown();

          MarcAuthority.selectSourceFile(sourceFieName);

          QuickMarcEditor.addNewField(tags.tag010, `$a ${naturalId}`, 3);
          QuickMarcEditor.checkContentByTag(tags.tag010, `$a ${naturalId}`);

          QuickMarcEditor.addNewField(tags.tag100, `$a ${authorityHeading}`, 4);
          QuickMarcEditor.checkContentByTag(tags.tag100, `$a ${authorityHeading}`);

          QuickMarcEditor.pressSaveAndCloseButton();
          defaultInvalid008Fields.forEach((invalid008Field) => {
            QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tag008, invalid008Field.label);
            QuickMarcEditor.checkErrorMessage(3, tag008ErrorText(invalid008Field.labelForError));
          });

          QuickMarcEditor.verifyDropdownsPresent(
            tags.tag008,
            dropdownData.map((dropdown) => dropdown.label),
          );

          QuickMarcEditor.verifyMarcAuth008DropdownsHoverTexts();

          dropdownData.forEach((dropdown) => {
            dropdown.options.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                tags.tag008,
                dropdown.label,
                dropdownOption,
              );
            });
            QuickMarcEditor.verifyFieldsDropdownOptionCount(
              tags.tag008,
              dropdown.label,
              dropdown.options.length,
            );
          });

          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(tags.tag008, false);

          QuickMarcEditor.pressSaveAndCloseButton();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeading);

          MarcAuthority.checkTagInRow(3, getSource008String());
        },
      );
    });
  });
});
