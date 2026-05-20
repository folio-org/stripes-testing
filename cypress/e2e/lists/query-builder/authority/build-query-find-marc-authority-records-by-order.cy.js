import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES, AUTHORITY_QUERY_FIELDS } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322615_List_${getRandomPostfix()}`,
        queryValue: 'AT_C1322615_MarcAuthority',
        totalRecordsCount: 17,
      };

      const marcFile = {
        marc: 'marcAuthFileC1322615.mrc',
        fileName: `testMarcAuthC1322615.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
      ];

      // Tags used as main entry fields in authority records
      const headingTags = [
        '100',
        '110',
        '111',
        '130',
        '147',
        '148',
        '150',
        '151',
        '155',
        '162',
        '180',
        '181',
        '182',
        '185',
      ];

      let userData = {};
      const createdAuthorityIds = [];
      // Maps order value (0-based integer assigned by data import) → heading string
      const orderToHeading = {};

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322615_');

        cy.then(() => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIds.push(record.authority.id);
            });
          });
        })
          .then(() => {
            // Retrieve order and heading for each imported record via SRS API.
            // Order values are assigned during the data import and can differ between runs.
            createdAuthorityIds.forEach((id) => {
              cy.getSrsRecordsByAuthorityId(id).then((marcData) => {
                const order = marcData.order;
                const fields = marcData.parsedRecord.content.fields;
                const headingField = fields.find((f) => headingTags.includes(Object.keys(f)[0]));
                if (headingField) {
                  const tag = Object.keys(headingField)[0];
                  const subfields = headingField[tag].subfields || [];
                  const matchingSf = subfields.find((sf) => Object.values(sf).some(
                    (v) => typeof v === 'string' && v.includes('AT_C1322615'),
                  ));
                  const heading = matchingSf ? Object.values(matchingSf)[0].trim() : undefined;
                  if (heading) orderToHeading[order] = heading;
                }
              });
            });
          })
          .then(() => {
            cy.createTempUser([]).then((userProperties) => {
              userData = userProperties;
              cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1322615 Build query to find MARC authority records by MARC Authority — Order (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322615'] },
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

          // Row 0: Heading contains test prefix — stays for all steps
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(testData.queryValue);

          // Add Row 1: MARC Authority — Order (operator/value changed per step)
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.MARC_AUTHORITY_ORDER, 1);

          // Step 2: Order equals 0 → record with order 0 found (1 record)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield('0', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(orderToHeading[0], { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 3: Order equals 10 → record with order 10 found (1 record)
          QueryModal.fillInValueTextfield('10', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(orderToHeading[10], { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 4: Order not equal to 0 → all records except order-0 (16 records)
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInValueTextfield('0', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(16);
          QueryModal.verifyResultFound(orderToHeading[0], { isFound: false, partialMatch: true });

          // Step 5: Order greater than 15 → record with order 16 found (1 record)
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN, 1);
          QueryModal.fillInValueTextfield('15', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultFound(orderToHeading[16], { partialMatch: true });

          // Step 6: Order greater than or equal to 15 → records with orders 15 and 16 (2 records)
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultFound(orderToHeading[15], { partialMatch: true });
          QueryModal.verifyResultFound(orderToHeading[16], { partialMatch: true });

          // Step 7: Order less than 3 → records with orders 0, 1, 2 (3 records)
          QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN, 1);
          QueryModal.fillInValueTextfield('3', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyResultFound(orderToHeading[0], { partialMatch: true });
          QueryModal.verifyResultFound(orderToHeading[1], { partialMatch: true });
          QueryModal.verifyResultFound(orderToHeading[2], { partialMatch: true });

          // Step 8: Order less than or equal to 3 → records with orders 0, 1, 2, 3 (4 records)
          QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN_OR_EQUAL_TO, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyResultFound(orderToHeading[0], { partialMatch: true });
          QueryModal.verifyResultFound(orderToHeading[1], { partialMatch: true });
          QueryModal.verifyResultFound(orderToHeading[2], { partialMatch: true });
          QueryModal.verifyResultFound(orderToHeading[3], { partialMatch: true });

          // Step 9: Order is null/empty True → no records
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('True', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 10: Order is null/empty False → all 17 records
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);
        },
      );
    });
  });
});
