import {
  DEFAULT_JOB_PROFILE_NAMES,
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
import { Permissions } from '../../../../support/dictionary';
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
          title: 'Congress and foreign policy series',
          searchOption: 'Uniform title',
          newField: {
            title: `Test authority ${getRandomPostfix()}`,
            tag: '901',
            content: 'venn',
          },
        },
        newFields: [
          { tag: '500', content: 'Added tag 1' },
          { tag: '510', content: 'Added tag 2' },
          { tag: '511', content: 'Added tag 3' },
        ],
        deletedFieldTags: ['380', '642', '645'],
        editedFieldValues: ['edited 1 time', 'edited 2 times', 'edited 3 times'],
        editedDropdownOptions: 'dabababaaaan          |a aba    sd',
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFiles = [
        { marc: 'oneMarcAuthority.mrc', fileName: `testMarcFile.${getRandomPostfix()}.mrc` },
      ];
      const createdAuthorityID = [];
      const dropdownSelections = {
        'Geo Subd': 'd',
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
        'Subd type': 'a',
        'Govt Ag': '|',
        RefEval: 'a',
        RecUpd: 'a',
        'Pers Name': 'b',
        'Level Est': 'a',
        'Mod Rec': 's',
        Source: 'd',
      };
      const geosubdDropdownOptions = Object.values(AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN);
      const romanDropdownOptions = Object.values(AUTHORITY_008_FIELD_ROMAN_DROPDOWN);
      const langDropdownOptions = Object.values(AUTHORITY_008_FIELD_LANG_DROPDOWN);
      const kindrecDropdownOptions = Object.values(AUTHORITY_008_FIELD_KINDREC_DROPDOWN);
      const catrulesDropdownOptions = Object.values(AUTHORITY_008_FIELD_CATRULES_DROPDOWN);
      const shsysDropdownOptions = Object.values(AUTHORITY_008_FIELD_SHSYS_DROPDOWN);
      const seriesDropdownOptions = Object.values(AUTHORITY_008_FIELD_SERIES_DROPDOWN);
      const numbseriesDropdownOptions = Object.values(AUTHORITY_008_FIELD_NUMBSERIES_DROPDOWN);
      const mainuseDropdownOptions = Object.values(AUTHORITY_008_FIELD_MAINUSE_DROPDOWN);
      const subjuseDropdownOptions = Object.values(AUTHORITY_008_FIELD_SUBJUSE_DROPDOWN);
      const seriesuseDropdownOptions = Object.values(AUTHORITY_008_FIELD_SERIESUSE_DROPDOWN);
      const subdtypeDropdownOptions = Object.values(AUTHORITY_008_FIELD_SUBDTYPE_DROPDOWN);
      const govtagDropdownOptions = Object.values(AUTHORITY_008_FIELD_GOVTAG_DROPDOWN);
      const refevalDropdownOptions = Object.values(AUTHORITY_008_FIELD_REFEVAL_DROPDOWN);
      const recupdDropdownOptions = Object.values(AUTHORITY_008_FIELD_RECUPD_DROPDOWN);
      const persnameDropdownOptions = Object.values(AUTHORITY_008_FIELD_PERSNAME_DROPDOWN);
      const levelestDropdownOptions = Object.values(AUTHORITY_008_FIELD_LEVELEST_DROPDOWN);
      const modrecDropdownOptions = Object.values(AUTHORITY_008_FIELD_MODREC_DROPDOWN);
      const sourceDropdownOptions = Object.values(AUTHORITY_008_FIELD_SOURCE_DROPDOWN);
      const dropdownOptionSets = [
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.GEOSUBD,
          options: geosubdDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.ROMAN,
          options: romanDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
          options: langDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.KINDREC,
          options: kindrecDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.CATRULES,
          options: catrulesDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SHSYS,
          options: shsysDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SERIES,
          options: seriesDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.NUMBSERIES,
          options: numbseriesDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.MAINUSE,
          options: mainuseDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SUBJUSE,
          options: subjuseDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SERIESUSE,
          options: seriesuseDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SUBDTYPE,
          options: subdtypeDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.GOVTAG,
          options: govtagDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.REFEVAL,
          options: refevalDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.RECUPD,
          options: recupdDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.PERSNAME,
          options: persnameDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.LEVELEST,
          options: levelestDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.MODREC,
          options: modrecDropdownOptions,
        },
        {
          name: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.SOURCE,
          options: sourceDropdownOptions,
        },
      ];
      const tag008 = '008';

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.settingsDataImportEnabled.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
        });
      });

      before('Upload files', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        }).then(() => {
          DataImport.uploadFileViaApi(
            marcFiles[0].marc,
            marcFiles[0].fileName,
            jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityID.push(record.authority.id);
            });
          });
        });
      });

      beforeEach('Login', () => {
        cy.visit(TopMenu.marcAuthorities);
        MarcAuthorities.waitLoading();
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityID.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      // Trillium+ only
      it.skip(
        'C350691 Verify "008" field dropdowns on Edit MARC authority pane (spitfire) (TaaS)',
        { tags: [] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.select(createdAuthorityID[0]);
          MarcAuthority.edit();

          dropdownOptionSets.forEach((dropdownOptionSet) => {
            QuickMarcEditor.check008FieldLabels(dropdownOptionSet.name);
          });

          QuickMarcEditor.verifyMarcAuth008DropdownsHoverTexts();

          dropdownOptionSets.forEach((dropdownOptionSet) => {
            dropdownOptionSet.options.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                tag008,
                dropdownOptionSet.name,
                dropdownOption,
              );
            });
          });

          MarcAuthority.select008DropdownsIfOptionsExist(dropdownSelections);
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
          MarcAuthority.contains(testData.editedDropdownOptions);
        },
      );

      it(
        'C350696 Edit the imported MARC Authority record via MARC Authority app multiple times (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C350696'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.select(createdAuthorityID[0]);
          testData.newFields.forEach((newField, index) => {
            MarcAuthority.edit();
            QuickMarcEditor.checkPaneheaderContains(`Source: ${testData.userProperties.username}`);
            MarcAuthority.addNewField(4, newField.tag, `$a ${newField.content}`);
            QuickMarcEditor.verifyTagValue(5, newField.tag);
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.deleteFieldByTagAndCheck(testData.deletedFieldTags[index]);
            QuickMarcEditor.verifySaveAndCloseButtonEnabled();
            MarcAuthority.changeField('130', testData.editedFieldValues[index]);
            MarcAuthority.clickSaveAndCloseButton();
            MarcAuthority.continueWithSaveAndCheck();
          });
        },
      );
    });
  });
});
