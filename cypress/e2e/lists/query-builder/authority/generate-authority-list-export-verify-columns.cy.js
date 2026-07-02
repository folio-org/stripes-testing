import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_FOLIO_AUTHORITY_FILES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  AUTHORITY_HEADING_TYPES,
} from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { including } from '../../../../../interactors';
import DateTools from '../../../../support/utils/dateTools';

const COLUMNS = {
  AUTHORITY_CREATED_DATE: 'Authority — Created date',
  AUTHORITY_HEADING: 'Authority — Heading',
  AUTHORITY_HEADING_TYPE: 'Authority — Heading type',
  AUTHORITY_IDENTIFIERS: 'Authority — Identifiers',
  AUTHORITY_NATURAL_ID: 'Authority — Natural ID',
  AUTHORITY_NOTES: 'Authority — Notes',
  AUTHORITY_SEE_ALSO_FROM_REFERENCES: 'Authority — See also from references',
  AUTHORITY_SEE_FROM_REFERENCES: 'Authority — See from references',
  AUTHORITY_SOURCE: 'Authority — Source',
  AUTHORITY_SUBJECT_HEADING_CODE: 'Authority — Subject heading code',
  AUTHORITY_UPDATED_DATE: 'Authority — Updated date',
  AUTHORITY_UUID: 'Authority — UUID',
  SOURCE_FILE_NAME: 'Source file — Name',
  CREATED_BY_USER_EMAIL: 'Created by user — Email',
  CREATED_BY_USER_LAST_NAME_FIRST_NAME: 'Created by user — Last name, first name',
  CREATED_BY_USER_USERNAME: 'Created by user — Username',
  UPDATED_BY_USER_EMAIL: 'Updated by user — Email',
  UPDATED_BY_USER_LAST_NAME_FIRST_NAME: 'Updated by user — Last name, first name',
  UPDATED_BY_USER_USERNAME: 'Updated by user — Username',
  MARC_AUTHORITY_EXTERNAL_HRID: 'MARC Authority — External HRID',
  MARC_AUTHORITY_GENERATION: 'MARC Authority — Generation',
  MARC_AUTHORITY_LEADER_RECORD_STATUS: 'MARC Authority — Leader record status',
  MARC_AUTHORITY_MARC_JSONB: 'MARC Authority — MARC jsonb',
  MARC_AUTHORITY_MATCHED_UUID: 'MARC Authority — Matched UUID',
  MARC_AUTHORITY_ORDER: 'MARC Authority — Order',
  MARC_AUTHORITY_STATE: 'MARC Authority — State',
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const getDate = ({ csvFormat = false } = {}) => DateTools.getFormattedDate({ date: new Date() }, csvFormat ? 'YYYY-MM-DD' : 'M/D/YYYY');
      const testData = {
        userEmail: `at_c1322593_${getRandomPostfix()}@test.com`,
        recordType: 'Authority',
        listName: `AT_C1322593_List_${getRandomPostfix()}`,
        queryField: COLUMNS.AUTHORITY_HEADING,
        queryOperator: QUERY_OPERATIONS.START_WITH,
        queryValue: 'AT_C1322593_MarcAuthority',
        expectedRecordsCount: 17,
        specificRecordValues: {
          [COLUMNS.AUTHORITY_HEADING]:
            'AT_C1322593_MarcAuthority Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq Musical settings Literary style Stage history 1950- England',
          [COLUMNS.AUTHORITY_HEADING_TYPE]: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
          [COLUMNS.AUTHORITY_NATURAL_ID]: 'n801262961322593',
          [COLUMNS.SOURCE_FILE_NAME]: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
          [COLUMNS.MARC_AUTHORITY_EXTERNAL_HRID]: '28420061322593',
          [COLUMNS.MARC_AUTHORITY_STATE]: 'ACTUAL',
          [COLUMNS.AUTHORITY_SOURCE]: 'MARC',
          [COLUMNS.AUTHORITY_SUBJECT_HEADING_CODE]: 'a',
          [COLUMNS.MARC_AUTHORITY_LEADER_RECORD_STATUS]: 'c',
          [COLUMNS.MARC_AUTHORITY_ORDER]: '0',
          [COLUMNS.MARC_AUTHORITY_GENERATION]: '1',
          [COLUMNS.CREATED_BY_USER_USERNAME]: Cypress.env('diku_login'),
          [COLUMNS.AUTHORITY_UUID]: null,
          [COLUMNS.CREATED_BY_USER_LAST_NAME_FIRST_NAME]: null,
          [COLUMNS.UPDATED_BY_USER_EMAIL]: null,
          [COLUMNS.UPDATED_BY_USER_LAST_NAME_FIRST_NAME]: null,
          [COLUMNS.UPDATED_BY_USER_USERNAME]: null,
          [COLUMNS.AUTHORITY_CREATED_DATE]: null,
          [COLUMNS.AUTHORITY_UPDATED_DATE]: null,
        },
        // Columns checked by default per TestRail spec (marked with "(Checked)")
        defaultCheckedColumns: [
          COLUMNS.AUTHORITY_HEADING,
          COLUMNS.AUTHORITY_HEADING_TYPE,
          COLUMNS.AUTHORITY_NATURAL_ID,
          COLUMNS.AUTHORITY_UUID,
          COLUMNS.SOURCE_FILE_NAME,
          COLUMNS.MARC_AUTHORITY_EXTERNAL_HRID,
          COLUMNS.MARC_AUTHORITY_STATE,
        ],
        headingTypeVerifications: [
          {
            heading: 'AT_C1322593_MarcAuthority Geographic Subdivision 181',
            headingType: AUTHORITY_HEADING_TYPES.GEOGRAPHIC_SUBDIVISION,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Medium of Performance Term 162',
            headingType: AUTHORITY_HEADING_TYPES.MEDIUM_OF_PERFORMANCE_TERM,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Subject 150',
            headingType: AUTHORITY_HEADING_TYPES.TOPICAL_TERM,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Form Subdivision 185',
            headingType: AUTHORITY_HEADING_TYPES.FORM_SUBDIVISION,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Conference Name-title 111',
            headingType: AUTHORITY_HEADING_TYPES.CONFERENCE_NAME_TITLE,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Geographic name 151',
            headingType: AUTHORITY_HEADING_TYPES.GEOGRAPHIC_NAME,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Chronological Subdivision 182',
            headingType: AUTHORITY_HEADING_TYPES.CHRONOLOGICAL_SUBDIVISION,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Conference Name 111',
            headingType: AUTHORITY_HEADING_TYPES.CONFERENCE_NAME,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Genre 155',
            headingType: AUTHORITY_HEADING_TYPES.GENRE_TERM,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Chronological Term 148',
            headingType: AUTHORITY_HEADING_TYPES.CHRONOLOGICAL_TERM,
          },
          {
            heading: 'AT_C1322593_MarcAuthority General Subdivision 180',
            headingType: AUTHORITY_HEADING_TYPES.GENERAL_SUBDIVISION,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Personal name 100',
            headingType: AUTHORITY_HEADING_TYPES.PERSONAL_NAME,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Corporate name-title 110',
            headingType: AUTHORITY_HEADING_TYPES.CORPORATE_NAME_TITLE,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Corporate name 110',
            headingType: AUTHORITY_HEADING_TYPES.CORPORATE_NAME,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Named Event 147',
            headingType: AUTHORITY_HEADING_TYPES.NAMED_EVENT,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Personal name-title 100',
            headingType: AUTHORITY_HEADING_TYPES.PERSONAL_NAME_TITLE,
          },
          {
            heading: 'AT_C1322593_MarcAuthority Uniform title 130',
            headingType: AUTHORITY_HEADING_TYPES.UNIFORM_TITLE,
          },
        ],
      };
      const marcFile = {
        marc: 'marcAuthFileC1322593.mrc',
        fileName: `testMarcAuthC1322593.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      let userData = {};
      let createdDateCsvFormat;
      let updatedDateCsvFormat;
      const createdAuthorityIds = [];

      before('Create test data', () => {
        // Import MARC authority records as admin
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322593_');
        cy.getAdminSourceRecord().then((record) => {
          testData.specificRecordValues[COLUMNS.CREATED_BY_USER_LAST_NAME_FIRST_NAME] = record;
        });

        cy.then(() => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIds.push(record.authority.id);
              testData.specificRecordValues[COLUMNS.AUTHORITY_CREATED_DATE] = getDate();
              createdDateCsvFormat = getDate({ csvFormat: true });
            });
          });
        })
          .then(() => {
            // Create user with required permissions and email
            cy.createTempUser(
              [
                Permissions.listsAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              ],
              undefined,
              undefined,
              undefined,
              testData.userEmail,
            );
          })
          .then((userProperties) => {
            userData = userProperties;
            testData.specificRecordValues[COLUMNS.UPDATED_BY_USER_EMAIL] = testData.userEmail;
            testData.specificRecordValues[COLUMNS.UPDATED_BY_USER_LAST_NAME_FIRST_NAME] =
              `${userData.lastName}, ${userData.firstName}`;
            testData.specificRecordValues[COLUMNS.UPDATED_BY_USER_USERNAME] = userData.username;

            // Edit the specific "Elizabeth II" record as the test user to set "Updated by"
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${testData.specificRecordValues[COLUMNS.AUTHORITY_HEADING]}" and (authRefType==("Authorized"))`,
            }).then((authorities) => {
              const targetAuthorityId = authorities[0].id;
              testData.specificRecordValues[COLUMNS.AUTHORITY_UUID] = targetAuthorityId;
              cy.getMarcRecordDataViaAPI(targetAuthorityId).then((marcData) => {
                const field500 = marcData.fields.find((f) => f.tag === '500');
                field500.content = `AT_C1322593 Updated by test ${getRandomPostfix()}`;
                cy.getToken(userData.username, userData.password);
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.eq(202);
                    testData.specificRecordValues[COLUMNS.AUTHORITY_UPDATED_DATE] = getDate();
                    updatedDateCsvFormat = getDate({ csvFormat: true });
                  },
                );
              });
            });
          })
          .then(() => {
            cy.login(userData.username, userData.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(testData.listName, true);
        createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id));
        Users.deleteViaApi(userData.userId);
        FileManager.deleteFileFromDownloadsByMask(`*${testData.listName}*`);
      });

      it(
        'C1405035 Generate Authority record type List, export it and verify all available columns (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C1405035'] },
        () => {
          // Step 1: Create new list with "Authority" record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.buildQuery();

          // Step 2: Configure query: Authority — Heading starts with "AT_C1322593_MarcAuthority" and test query
          QueryModal.selectField(testData.queryField);
          QueryModal.selectOperator(testData.queryOperator);
          QueryModal.populateFiled('input', testData.queryValue);
          QueryModal.testQuery();
          cy.wait(2000);
          Lists.verifyPreviewOfRecordsMatched();

          // Step 3: Expand "Show columns" dropdown and verify checked/unchecked state per spec
          QueryModal.clickShowColumnsButton();
          QueryModal.verifyShowColumnsMenuDisplayed();
          Object.values(COLUMNS).forEach((column) => {
            const isChecked = testData.defaultCheckedColumns.includes(column);
            QueryModal.verifyCheckboxInShowColumnsChecked(column, isChecked);
          });

          // Step 4: Check all unchecked columns (selectCheckboxInShowColumns only checks if not already checked)
          Object.values(COLUMNS).forEach((column) => {
            QueryModal.selectCheckboxInShowColumns(column);
            QueryModal.verifyCheckboxInShowColumnsChecked(column);
          });
          QueryModal.verifyCheckedCheckboxesPresentInTheTable();

          // Step 5: Verify specific column values for the Elizabeth II record in the preview
          Object.entries(testData.specificRecordValues).forEach(([column, value]) => {
            QueryModal.verifyColumnValueForRow(
              testData.specificRecordValues[COLUMNS.AUTHORITY_HEADING],
              column,
              value,
            );
          });

          // Step 6: Verify heading types for all imported records
          testData.headingTypeVerifications.forEach(({ heading, headingType }) => {
            QueryModal.verifyColumnValueForRow(
              heading,
              COLUMNS.AUTHORITY_HEADING,
              including(heading),
            );
            QueryModal.verifyColumnValueForRow(
              heading,
              COLUMNS.AUTHORITY_HEADING_TYPE,
              headingType,
            );
          });

          // Step 7: Run query & save, then view updated list
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);

          // Verify list detail view shows correct record count
          Lists.verifyRecordsNumber(testData.expectedRecordsCount);

          // Step 8: Repeat column/value verification in detail view
          Object.entries(testData.specificRecordValues).forEach(([column, value]) => {
            QueryModal.verifyColumnValueForRow(
              testData.specificRecordValues[COLUMNS.AUTHORITY_HEADING],
              column,
              value,
            );
          });

          testData.headingTypeVerifications.forEach(({ heading, headingType }) => {
            QueryModal.verifyColumnValueForRow(
              heading,
              COLUMNS.AUTHORITY_HEADING,
              including(heading),
            );
            QueryModal.verifyColumnValueForRow(
              heading,
              COLUMNS.AUTHORITY_HEADING_TYPE,
              headingType,
            );
          });

          // Step 9: Export all columns as CSV
          Lists.openActions();
          Lists.exportList();
          Lists.verifyExportCallouts(testData.listName);

          // Step 10: Verify downloaded CSV contains all expected columns, values
          // Note: em dashes are replaced with hyphens in exported file
          Lists.checkDownloadedFileArray(
            testData.listName,
            Object.values(COLUMNS).map((value) => value.replace('—', '-')),
          );
          ExportFile.verifyFileIncludes(`${testData.listName}.csv`, [
            ...Object.values(testData.specificRecordValues).slice(0, -4), // Exclude dates from check due to a different format
            createdDateCsvFormat,
            updatedDateCsvFormat,
            ...testData.headingTypeVerifications.map((data) => data.heading),
            ...testData.headingTypeVerifications.map((data) => data.headingType),
          ]);
        },
      );
    });
  });
});
