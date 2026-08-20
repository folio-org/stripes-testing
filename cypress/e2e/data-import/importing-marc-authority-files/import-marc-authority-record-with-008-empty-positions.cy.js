import {
  AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN,
  AUTHORITY_008_FIELD_ROMAN_DROPDOWN,
  AUTHORITY_008_FIELD_LANG_DROPDOWN,
  AUTHORITY_008_FIELD_KINDREC_DROPDOWN,
  AUTHORITY_008_FIELD_CATRULES_DROPDOWN,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const marcFile = {
      marc: 'marcAuthFileForC1332502.mrc',
      fileName: `testMarcFileC1332502.${randomPostfix}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    };
    const tag008 = '008';
    const tag100 = '100';
    // heading from 100 $a in the fixture file
    const authorityHeading = 'AT_C1332502_MarcAuthFile';
    const updatedHeadingContent = `$a AT_C1332502_MarcAuthFile_${randomPostfix}`;
    const tag008UnchangedPart = 'n\\| azannaabn\\s+\\|n aaa';

    // 008 box values expected per step 4 / step 7
    const tag008BoxValues = [
      {
        boxName: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.GEOSUBD,
        expectedValue: AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN.N,
      },
      {
        boxName: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.ROMAN,
        expectedValue: AUTHORITY_008_FIELD_ROMAN_DROPDOWN.NO,
      },
      {
        boxName: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
        expectedValue: AUTHORITY_008_FIELD_LANG_DROPDOWN.SL,
      },
      {
        boxName: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.KINDREC,
        expectedValue: AUTHORITY_008_FIELD_KINDREC_DROPDOWN.A,
      },
      {
        boxName: AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES.CATRULES,
        expectedValue: AUTHORITY_008_FIELD_CATRULES_DROPDOWN.Z,
      },
    ];

    let authorityId;
    let user;

    before('Import test data and create user', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1332502_');

      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          authorityId = response[0].authority.id;
        },
      );

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
            CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
            CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
          ],
        );

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
      Users.deleteViaApi(user?.userId);
    });

    it(
      'C1332502 Import MARC authority record with empty positions 00-05 of 008 MARC field (promin)',
      { tags: ['extendedPath', 'promin', 'C1332502'] },
      () => {
        const orginal008Content = `${tag008}\t\\s{6}${tag008UnchangedPart}`;
        const final008Content = `${tag008}\t${DateTools.getCurrentDateYYMMDD()}${tag008UnchangedPart}`;

        // Steps 1-3: File imported via API; navigate to authority, verify 008 has blanks in 00-05
        MarcAuthorities.searchBeats(authorityHeading);
        MarcAuthorities.selectTitle(authorityHeading);
        MarcAuthority.waitLoading();
        // detail view shows 008 with 6 blank chars (positions 00-05) before the coded values
        MarcAuthority.contains(orginal008Content, { regexp: true });

        // Step 4: Actions > Edit — verify 008 box values; no invalid values
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();
        tag008BoxValues.forEach(({ boxName, expectedValue }) => {
          QuickMarcEditor.verifyDropdownOptionChecked(tag008, boxName, expectedValue);
        });

        // Steps 5-6: Update 100 field and save; record saved, 008 positions 00-05 get today's date
        QuickMarcEditor.updateExistingField(tag100, updatedHeadingContent);
        QuickMarcEditor.checkContentByTag(tag100, updatedHeadingContent);
        QuickMarcEditor.pressSaveAndClose();
        MarcAuthority.waitLoading();
        MarcAuthority.contains(final008Content, { regexp: true });

        // Step 7: Actions > Edit again — verify 008 box values still correct
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();
        tag008BoxValues.forEach(({ boxName, expectedValue }) => {
          QuickMarcEditor.verifyDropdownOptionChecked(tag008, boxName, expectedValue);
        });
      },
    );
  });
});
