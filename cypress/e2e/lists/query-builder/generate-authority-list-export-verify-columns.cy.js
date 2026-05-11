import Permissions from '../../../support/dictionary/permissions';
import QueryModal, { QUERY_OPERATIONS } from '../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_FOLIO_AUTHORITY_FILES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import { including } from '../../../../interactors';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322593_List_${getRandomPostfix()}`,
        queryField: 'Authority — Heading',
        queryOperator: QUERY_OPERATIONS.START_WITH,
        queryValue: 'UXPROD-4394',
        expectedRecordsCount: 17,
        specificHeading:
          'UXPROD-4394 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq Musical settings Literary style Stage history 1950- England',
        specificRecordValues: {
          'Authority — Heading':
            'UXPROD-4394 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq Musical settings Literary style Stage history 1950- England',
          'Authority — Heading type': MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
          'Authority — Natural ID': 'n80126296',
          'Source file — Name': DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
          'MARC Authority — External HRID': '2842006',
          'MARC Authority — State': 'ACTUAL',
          'Authority — Source': 'MARC',
          'Authority — Subject heading code': 'a',
          'MARC Authority — Leader record status': 'c',
          'MARC Authority — Order': '0',
          'MARC Authority — Generation': '1',
          'Created by user — Username': Cypress.env('diku_login'),
          'Authority — UUID': null,
          'Created by user — Last name, first name': null,
          'Updated by user — Email': null,
          'Updated by user — Last name, first name': null,
          'Updated by user — Username': null,
        },
        allColumns: [
          'Authority — Created date',
          'Authority — Heading',
          'Authority — Heading type',
          'Authority — Identifiers',
          'Authority — Natural ID',
          'Authority — Notes',
          'Authority — See also from references',
          'Authority — See from references',
          'Authority — Source',
          'Authority — Subject heading code',
          'Authority — Updated date',
          'Authority — UUID',
          'Source file — Name',
          'Created by user — Email',
          'Created by user — Last name, first name',
          'Created by user — Username',
          'Updated by user — Email',
          'Updated by user — Last name, first name',
          'Updated by user — Username',
          'MARC Authority — Created date',
          'MARC Authority — External HRID',
          'MARC Authority — Generation',
          'MARC Authority — Leader record status',
          'MARC Authority — MARC jsonb',
          'MARC Authority — Matched UUID',
          'MARC Authority — Order',
          'MARC Authority — State',
          'MARC Authority — Updated date',
        ],
        // Columns checked by default per TestRail spec (marked with "(Checked)")
        defaultCheckedColumns: [
          'Authority — Heading',
          'Authority — Heading type',
          'Authority — Natural ID',
          'Authority — UUID',
          'Source file — Name',
          'MARC Authority — External HRID',
          'MARC Authority — State',
        ],
        headingTypeVerifications: [
          {
            heading: 'UXPROD-4394 Geographic Subdivision 181',
            headingType: 'Geographic subdivision',
          },
          {
            heading: 'UXPROD-4394 Medium of Performance Term 162',
            headingType: 'Medium of performance term',
          },
          { heading: 'UXPROD-4394 Subject 150', headingType: 'Topical term' },
          { heading: 'UXPROD-4394 Form Subdivision 185', headingType: 'Form subdivision' },
          {
            heading: 'UXPROD-4394 Conference Name-title 111',
            headingType: 'Conference name title',
          },
          { heading: 'UXPROD-4394 Geographic name 151', headingType: 'Geographic name' },
          {
            heading: 'UXPROD-4394 Chronological Subdivision 182',
            headingType: 'Chronological subdivision',
          },
          { heading: 'UXPROD-4394 Conference Name 111', headingType: 'Conference name' },
          { heading: 'UXPROD-4394 Genre 155', headingType: 'Genre term' },
          { heading: 'UXPROD-4394 Chronological Term 148', headingType: 'Chronological term' },
          { heading: 'UXPROD-4394 General Subdivision 180', headingType: 'General subdivision' },
          { heading: 'UXPROD-4394 Personal name 100', headingType: 'Personal name' },
          { heading: 'UXPROD-4394 Corporate name-title 110', headingType: 'Corporate name title' },
          { heading: 'UXPROD-4394 Corporate name 110', headingType: 'Corporate name' },
          { heading: 'UXPROD-4394 Named Event 147', headingType: 'Named event' },
          { heading: 'UXPROD-4394 Personal name-title 100', headingType: 'Personal name title' },
          { heading: 'UXPROD-4394 Uniform title 130', headingType: 'Uniform title' },
        ],
      };
      const marcFile = {
        marc: 'marcAuthFileC1322593.mrc',
        fileName: `testMarcAuthC1322593.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      let userData = {};
      const createdAuthorityIds = [];

      before('Create test data', () => {
        // Import MARC authority records as admin
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('UXPROD-4394');
        cy.getAdminSourceRecord().then((record) => {
          testData.specificRecordValues['Created by user — Last name, first name'] = record;
        });

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIds.push(record.authority.id);
          });
        });

        // Create user with required permissions
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ])
          .then((userProperties) => {
            userData = userProperties;
            testData.specificRecordValues['Updated by user — Email'] = userData.email;
            testData.specificRecordValues['Updated by user — Last name, first name'] =
              `${userData.lastName}, ${userData.firstName}`;
            testData.specificRecordValues['Updated by user — Username'] = userData.username;

            // Edit the specific "Elizabeth II" record as the test user to set "Updated by"
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${testData.specificHeading}" and (authRefType==("Authorized"))`,
            }).then((authorities) => {
              const targetAuthorityId = authorities[0].id;
              testData.specificRecordValues['Authority — UUID'] = targetAuthorityId;
              cy.getMarcRecordDataViaAPI(targetAuthorityId).then((marcData) => {
                const field500 = marcData.fields.find((f) => f.tag === '500');
                field500.content = `AT_C1322593 Updated by test ${getRandomPostfix()}`;
                cy.getToken(userData.username, userData.password);
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.eq(202);
                  },
                );
              });
            });
          })
          .then(() => {
            cy.log(JSON.stringify(testData.specificRecordValues, null, 2));
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
        'C1322593 Generate Authority record type List, export it and verify all available columns (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C1322593'] },
        () => {
          // Step 1: Create new list with "Authority" record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.buildQuery();

          // Step 2: Configure query: Authority — Heading starts with "UXPROD-4394" and test query
          QueryModal.selectField(testData.queryField);
          QueryModal.selectOperator(testData.queryOperator);
          QueryModal.populateFiled('input', testData.queryValue);
          QueryModal.testQuery();
          cy.wait(2000);
          Lists.verifyPreviewOfRecordsMatched();

          // Step 3: Expand "Show columns" dropdown and verify checked/unchecked state per spec
          QueryModal.clickShowColumnsButton();
          QueryModal.verifyShowColumnsMenuDisplayed();
          testData.allColumns.forEach((column) => {
            const isChecked = testData.defaultCheckedColumns.includes(column);
            QueryModal.verifyCheckboxInShowColumnsChecked(column, isChecked);
          });

          // Step 4: Check all unchecked columns (selectCheckboxInShowColumns only checks if not already checked)
          testData.allColumns.forEach((column) => {
            QueryModal.selectCheckboxInShowColumns(column);
            QueryModal.verifyCheckboxInShowColumnsChecked(column);
          });
          QueryModal.verifyCheckedCheckboxesPresentInTheTable();

          // Step 5: Verify specific column values for the Elizabeth II record in the preview
          // Find the row by unique naturalId and assert each expected column value within it
          Object.entries(testData.specificRecordValues).forEach(([column, value]) => {
            QueryModal.verifyColumnValueForRow(
              testData.specificRecordValues['Authority — Heading'],
              column,
              value,
            );
          });

          // Step 6: Verify heading types for all imported records
          testData.headingTypeVerifications.forEach(({ heading, headingType }) => {
            QueryModal.verifyColumnValueForRow(heading, 'Authority — Heading', including(heading));
            QueryModal.verifyColumnValueForRow(heading, 'Authority — Heading type', headingType);
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
              testData.specificRecordValues['Authority — Heading'],
              column,
              value,
            );
          });

          testData.headingTypeVerifications.forEach(({ heading, headingType }) => {
            QueryModal.verifyColumnValueForRow(heading, 'Authority — Heading', including(heading));
            QueryModal.verifyColumnValueForRow(heading, 'Authority — Heading type', headingType);
          });

          // Step 9: Export all columns as CSV
          Lists.openActions();
          Lists.exportList();
          Lists.verifyExportCallouts(testData.listName);

          // Step 10: Verify downloaded CSV contains all expected columns
          Lists.checkDownloadedFileArray(testData.listName, testData.allColumns);
          ExportFile.verifyFileIncludes(testData.listName, [
            ...Object.values(testData.specificRecordValues),
            ...testData.headingTypeVerifications.map((data) => data.heading),
            ...testData.headingTypeVerifications.map((data) => data.headingType),
          ]);
        },
      );
    });
  });
});
