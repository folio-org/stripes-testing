import {
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_ELVL_DROPDOWN,
  AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const LDR = 'LDR';
      const testData = {
        authority: {
          title: 'C353585Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchOption: 'Keyword',
          tag: '100',
          rowIndex: 14,
          field100NewValue:
            '$aUPDATED C353585Twain, Mark,$d1835-1910.$tAdventures of Huckleberry Finn',
        },
      };
      const marcFile = {
        marc: 'marcFileForC353585.mrc',
        fileName: `C353585testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;

      before('create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C353585"',
          }).then((records) => {
            records.forEach((record) => {
              if (record.authRefType === 'Authorized') {
                MarcAuthority.deleteViaAPI(record.id);
              }
            });
          });
          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              testData.createdAuthorityID = response[0].authority.id;
            },
          );
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdAuthorityID);
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });

      it(
        'C353585 Verify LDR validation rules with invalid data (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C353585'] },
        () => {
          const errorInvalidLDR05and17and18 =
            'Record cannot be saved. Please enter a valid Leader 05, Leader 17 and Leader 18. Valid values are listed at https://www.loc.gov/marc/authority/adleader.html';
          const errorInvalidLDR17and18 =
            'Record cannot be saved. Please enter a valid Leader 17 and Leader 18. Valid values are listed at https://www.loc.gov/marc/authority/adleader.html';

          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.edit();
          // Waiter needed for the whole page to be loaded.
          cy.wait(2000);
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            false,
          );
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
            false,
          );
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT,
            false,
          );

          QuickMarcEditor.updateExistingField(
            testData.authority.tag,
            testData.authority.field100NewValue,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(0, errorInvalidLDR05and17and18);

          Object.values(AUTHORITY_LDR_FIELD_STATUS_DROPDOWN).forEach((dropdownOption) => {
            QuickMarcEditor.verifyFieldsDropdownOption(
              LDR,
              AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
              dropdownOption,
            );
          });
          QuickMarcEditor.verifyFieldsDropdownOption(
            LDR,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            'b',
          );

          QuickMarcEditor.selectFieldsDropdownOption(
            LDR,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.A,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            LDR,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.A,
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(0, errorInvalidLDR17and18);

          QuickMarcEditor.selectFieldsDropdownOption(
            LDR,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
            AUTHORITY_LDR_FIELD_ELVL_DROPDOWN.N,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            LDR,
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT,
            AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN.I,
          );
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL);
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT,
          );
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          cy.wait(1500);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL);
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT,
          );
          QuickMarcEditor.verifyDropdownValueOfLDRIsValid(
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          );
        },
      );
    });
  });
});
