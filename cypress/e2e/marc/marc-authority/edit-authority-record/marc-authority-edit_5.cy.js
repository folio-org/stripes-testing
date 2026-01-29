import {
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_ELVL_DROPDOWN,
  AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
  AUTHORITY_LDR_FIELD_TYPE_DROPDOWN,
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
      const testData = {
        authority: {
          title: 'C353583Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchOption: 'Keyword',
        },
      };
      const statusDropdownOptions = Object.values(AUTHORITY_LDR_FIELD_STATUS_DROPDOWN);
      const typeDropdownOptions = Object.values(AUTHORITY_LDR_FIELD_TYPE_DROPDOWN);
      const elvlDropdownOptions = Object.values(AUTHORITY_LDR_FIELD_ELVL_DROPDOWN);
      const punctDropdownOptions = Object.values(AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN);
      const marcFile = {
        marc: 'marcFileForC353583.mrc',
        fileName: `C353583 testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const changesSavedCallout =
        'This record has successfully saved and is in process. Changes may not appear immediately.';
      const LDRDropdownOptionSets = [
        {
          name: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          options: statusDropdownOptions,
        },
        {
          name: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
          options: typeDropdownOptions,
        },
        {
          name: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
          options: elvlDropdownOptions,
        },
        {
          name: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT,
          options: punctDropdownOptions,
        },
      ];
      const LDR = 'LDR';

      before('create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C353583"',
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
        'C353583 Verify LDR validation rules with valid data (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C353583'] },
        () => {
          for (let i = 0; i < statusDropdownOptions.length; i++) {
            MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
            MarcAuthorities.selectTitle(testData.authority.title);
            MarcAuthority.edit();

            QuickMarcEditor.verifyBoxLabelsInLDRFieldInMarcAuthorityRecord();
            QuickMarcEditor.verifyLDRDropdownsHoverTexts();

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              LDRDropdownOptionSet.options.forEach((dropdownOption) => {
                QuickMarcEditor.verifyFieldsDropdownOption(
                  LDR,
                  LDRDropdownOptionSet.name,
                  dropdownOption,
                );
              });
            });

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                LDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.verifyDropdownOptionChecked(
                LDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });
            cy.wait(1500);
            QuickMarcEditor.pressSaveAndClose();

            MarcAuthorities.verifyLDRFieldSavedSuccessfully(
              changesSavedCallout,
              statusDropdownOptions[i % statusDropdownOptions.length],
              typeDropdownOptions[i % typeDropdownOptions.length],
              elvlDropdownOptions[i % elvlDropdownOptions.length],
              punctDropdownOptions[i % punctDropdownOptions.length],
            );
          }
        },
      );
    });
  });
});
