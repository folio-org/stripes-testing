import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
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

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C794530_MarcAuthority_${randomPostfix}`,
        tag008: '008',
        tag100: '100',
        tag008Index: 3,
        editedDropdownOptions: 'dabababaaaan          |a aba    sd',
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
        'C794530 Edit "MARC authority" record with invalid values in "008" field and verify dropdowns (spitfire)',
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
          MarcAuthority.contains(testData.editedDropdownOptions);
        },
      );
    });
  });
});
