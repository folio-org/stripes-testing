import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
  AUTHORITY_LDR_FIELD_ELVL_DROPDOWN,
  AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN,
  AUTHORITY_LDR_FIELD_TYPE_DROPDOWN,
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
} from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create', () => {
      const headerText = /New .*MARC authority record/;
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);
      const sourceFieName = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const authorityHeadingPrefix = `AT_C423415_MarcAuthority_${randomPostfix}`;
      const naturalIdPrefix = `n423415${randomDigits}`;
      const tags = {
        tagLdr: 'LDR',
        tag008: '008',
        tag010: '010',
        tag100: '100',
      };
      const dropdownData = {
        status: {
          label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          options: Object.values(AUTHORITY_LDR_FIELD_STATUS_DROPDOWN),
        },
        type: {
          label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
          options: Object.values(AUTHORITY_LDR_FIELD_TYPE_DROPDOWN),
        },
        elvl: {
          label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
          options: Object.values(AUTHORITY_LDR_FIELD_ELVL_DROPDOWN),
        },
        punct: {
          label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT,
          options: Object.values(AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN),
        },
      };
      const defaultLDRValuesInFields = [
        ['records[0].content.Record length', '00000', true],
        ['records[0].content.7-16 positions', '\\\\a2200000', true],
        ['records[0].content.19-23 positions', '\\4500', true],
      ];
      const defaultLDRValuesInDropdowns = [
        [tags.tagLdr, dropdownData.status.label, AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.N],
        [tags.tagLdr, dropdownData.type.label, AUTHORITY_LDR_FIELD_TYPE_DROPDOWN.Z],
        [tags.tagLdr, dropdownData.elvl.label, AUTHORITY_LDR_FIELD_ELVL_DROPDOWN.O],
        [tags.tagLdr, dropdownData.punct.label, AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN['\\']],
      ];
      const userPermissionsMember = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
      ];
      function getSourceValues(recordIndex) {
        const getValue = (optionsList) => {
          const value = optionsList[recordIndex % optionsList.length].split(' - ')[0];
          return value === '\\' ? ' ' : value;
        };
        return {
          status: getValue(dropdownData.status.options),
          type: getValue(dropdownData.type.options),
          elvl: getValue(dropdownData.elvl.options),
          punct: getValue(dropdownData.punct.options),
        };
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423415_');
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C423415 Verify that valid value can be entered in "LDR" field in "Create a new MARC authority record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423415'] },
        () => {
          dropdownData.status.options.forEach((_, recordIndex) => {
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            QuickMarcEditor.checkPaneheaderContains(headerText);
            MarcAuthority.checkSourceFileSelectShown();

            MarcAuthority.selectSourceFile(sourceFieName);

            MarcAuthority.setValid008DropdownValues();
            QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(tags.tag008, false);

            QuickMarcEditor.addNewField(tags.tag010, `$a ${naturalIdPrefix}${recordIndex}`, 3);
            QuickMarcEditor.checkContentByTag(tags.tag010, `$a ${naturalIdPrefix}${recordIndex}`);

            QuickMarcEditor.addNewField(
              tags.tag100,
              `$a ${authorityHeadingPrefix}${recordIndex}`,
              4,
            );
            QuickMarcEditor.checkContentByTag(
              tags.tag100,
              `$a ${authorityHeadingPrefix}${recordIndex}`,
            );

            defaultLDRValuesInFields.forEach((defaultLDRValueInField) => {
              QuickMarcEditor.verifyLDRPositionsDefaultValues(...defaultLDRValueInField);
            });
            defaultLDRValuesInDropdowns.forEach((defaultLDRValueInDropdown) => {
              QuickMarcEditor.verifyDropdownOptionChecked(...defaultLDRValueInDropdown);
            });
            QuickMarcEditor.verifyLDRDropdownsHoverTexts();

            Object.values(dropdownData).forEach((dropdown) => {
              dropdown.options.forEach((dropdownOption) => {
                QuickMarcEditor.verifyFieldsDropdownOption(
                  tags.tagLdr,
                  dropdown.label,
                  dropdownOption,
                );
              });
              QuickMarcEditor.verifyFieldsDropdownOptionCount(
                tags.tagLdr,
                dropdown.label,
                dropdown.options.length,
              );
            });

            Object.values(dropdownData).forEach((dropdown) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                tags.tagLdr,
                dropdown.label,
                dropdown.options[recordIndex % dropdown.options.length],
              );
              QuickMarcEditor.verifyDropdownOptionChecked(
                tags.tagLdr,
                dropdown.label,
                dropdown.options[recordIndex % dropdown.options.length],
              );
            });

            QuickMarcEditor.pressSaveAndCloseButton();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(`${authorityHeadingPrefix}${recordIndex}`);

            const sourceLdrValues = getSourceValues(recordIndex);
            MarcAuthority.checkTagInRow(0, `${sourceLdrValues.status}${sourceLdrValues.type}`);
            MarcAuthority.checkTagInRow(0, `${sourceLdrValues.elvl}${sourceLdrValues.punct}`);
          });
        },
      );
    });
  });
});
