import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  AUTHORITY_HEADING_TYPES,
  AUTHORITY_QUERY_FIELDS,
} from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322603_List_${getRandomPostfix()}`,
        queryValue: 'AT_C1322603_MarcAuthority',
        totalRecordsCount: 17,
      };

      const marcFile = {
        marc: 'marcAuthFileC1322603.mrc',
        fileName: `testMarcAuthC1322603.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      const headingTypeVerifications = [
        {
          heading: 'AT_C1322603_MarcAuthority Geographic Subdivision 181',
          headingType: AUTHORITY_HEADING_TYPES.GEOGRAPHIC_SUBDIVISION,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Medium of Performance Term 162',
          headingType: AUTHORITY_HEADING_TYPES.MEDIUM_OF_PERFORMANCE_TERM,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Subject 150',
          headingType: AUTHORITY_HEADING_TYPES.TOPICAL_TERM,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Form Subdivision 185',
          headingType: AUTHORITY_HEADING_TYPES.FORM_SUBDIVISION,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Conference Name-title 111',
          headingType: AUTHORITY_HEADING_TYPES.CONFERENCE_NAME_TITLE,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Geographic name 151',
          headingType: AUTHORITY_HEADING_TYPES.GEOGRAPHIC_NAME,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Chronological Subdivision 182',
          headingType: AUTHORITY_HEADING_TYPES.CHRONOLOGICAL_SUBDIVISION,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Conference Name 111',
          headingType: AUTHORITY_HEADING_TYPES.CONFERENCE_NAME,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Genre 155',
          headingType: AUTHORITY_HEADING_TYPES.GENRE_TERM,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Chronological Term 148',
          headingType: AUTHORITY_HEADING_TYPES.CHRONOLOGICAL_TERM,
        },
        {
          heading: 'AT_C1322603_MarcAuthority General Subdivision 180',
          headingType: AUTHORITY_HEADING_TYPES.GENERAL_SUBDIVISION,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Personal name 100',
          headingType: AUTHORITY_HEADING_TYPES.PERSONAL_NAME,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Corporate name-title 110',
          headingType: AUTHORITY_HEADING_TYPES.CORPORATE_NAME_TITLE,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Corporate name 110',
          headingType: AUTHORITY_HEADING_TYPES.CORPORATE_NAME,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Named Event 147',
          headingType: AUTHORITY_HEADING_TYPES.NAMED_EVENT,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Personal name-title 100',
          headingType: AUTHORITY_HEADING_TYPES.PERSONAL_NAME_TITLE,
        },
        {
          heading: 'AT_C1322603_MarcAuthority Uniform title 130',
          headingType: AUTHORITY_HEADING_TYPES.UNIFORM_TITLE,
        },
      ];

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
      ];

      let userData = {};
      const createdAuthorityIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322603_');

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIds.push(record.authority.id);
          });
        });

        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1322603 Build query to find MARC authority records by Heading and Heading types (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322603'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Step 1: Create new list, select Authority record type, open Build query
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2: Heading contains queryValue AND Heading type equals Personal name → 1 record
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.populateFiled('input', testData.queryValue);
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING_TYPE, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(AUTHORITY_HEADING_TYPES.PERSONAL_NAME, 1);
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 3: Add AND condition: See also from reference — Tracing type equals Personal name → still 1 record
          QueryModal.addNewRow(1);
          QueryModal.selectField(
            AUTHORITY_QUERY_FIELDS.AUTHORITY_SEE_ALSO_FROM_REFERENCE_TRACING_TYPE,
            2,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.chooseValueSelect(AUTHORITY_HEADING_TYPES.PERSONAL_NAME, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 4: Remove row 2, change Heading type to 'not equal to' Personal name → 16 records
          QueryModal.clickGarbage(2);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.chooseValueSelect(AUTHORITY_HEADING_TYPES.PERSONAL_NAME, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(16);

          // Step 5: Heading type 'in' [Personal name, Personal name title, Corporate name, Corporate name title] → 4 records
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedMultiselectValue(AUTHORITY_HEADING_TYPES.PERSONAL_NAME, 1);
          QueryModal.chooseFromValueMultiselect(AUTHORITY_HEADING_TYPES.PERSONAL_NAME_TITLE, 1, {
            exactMatch: true,
          });
          QueryModal.chooseFromValueMultiselect(AUTHORITY_HEADING_TYPES.CORPORATE_NAME, 1, {
            exactMatch: true,
          });
          QueryModal.chooseFromValueMultiselect(AUTHORITY_HEADING_TYPES.CORPORATE_NAME_TITLE, 1, {
            exactMatch: true,
          });
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(4);

          // Step 6: Heading type 'not in' [same 4 types] → 13 records
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
          QueryModal.verifySelectedMultiselectValue(
            [
              AUTHORITY_HEADING_TYPES.PERSONAL_NAME,
              AUTHORITY_HEADING_TYPES.PERSONAL_NAME_TITLE,
              AUTHORITY_HEADING_TYPES.CORPORATE_NAME,
              AUTHORITY_HEADING_TYPES.CORPORATE_NAME_TITLE,
            ],
            1,
          );
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(13);

          // Step 7: Heading type 'is null/empty' False → 17 records (all records have heading types)
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);

          // Step 8: Repeat step 2 pattern for each heading type → only 1 record per type
          headingTypeVerifications.forEach(({ heading, headingType }) => {
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
            QueryModal.chooseValueSelect(headingType, 1);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            QueryModal.verifyColumnValueForRow(
              heading,
              AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING_TYPE,
              headingType,
            );
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
          });
        },
      );
    });
  });
});
