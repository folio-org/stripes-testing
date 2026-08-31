import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const marcAuthFileName = 'marcAuthFileForC476782.mrc';
    // heading from 100 $a in the fixture file — fixed, no postfix
    const authorityHeading = 'AT_C476782_MarcAuthority';

    // Tag order matches the original fixture file sequence exactly (not grouped by tag)
    const expectedTagsOrder = [
      'LDR',
      '001',
      '005',
      '008',
      '024',
      '010',
      '024',
      '040',
      '035',
      '024',
      '024',
      '024',
      '046',
      '100',
      '400',
      '380',
      '380',
      '380',
      '380',
      '370',
      '380',
      '380',
      '024',
      '386',
      '380',
      '670',
      '400',
      '400',
      '500',
      '386',
      '400',
      '500',
      '530',
      '667',
      '530',
      '670',
      '670',
      '670',
      '953',
      '670',
      '999',
    ];

    let authorityId;
    const testData = { user: {} };

    before('Create test user', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C476782_');
      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
            CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
            CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
          ],
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user?.userId);
      if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
    });

    it(
      'C476782 MARC tags are not grouped by tag values after import of "MARC authority" record (promin)',
      { tags: ['extendedPath', 'promin', 'C476782'] },
      () => {
        // Step 1: Import MARC authority record via API using default create authority profile
        cy.getToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          marcAuthFileName,
          marcAuthFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          authorityId = response[0].authority.id;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });

        // Steps 2-4: Find imported record, open detail, open edit view
        MarcAuthorities.searchBeats(authorityHeading);
        MarcAuthorities.selectTitle(authorityHeading);
        MarcAuthority.waitLoading();
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();

        // Steps 5-6: Verify MARC fields are in the same order as in the fixture file (not grouped by tag)
        QuickMarcEditor.verifyRowOrderByTags(expectedTagsOrder);
      },
    );
  });
});
