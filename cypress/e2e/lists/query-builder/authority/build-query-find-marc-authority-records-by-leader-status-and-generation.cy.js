import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import { AUTHORITY_QUERY_FIELDS } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322594_List_${randomPostfix}`,
        authorityHeading: `AT_C1322594_MarcAuthority_${randomPostfix}`,
      };

      const authData = {
        prefix: getRandomLetters(10),
        startWithNumber: `1322594${randomNDigitNumber(6)}`,
      };

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordDelete,
      ];

      let userData = {};
      let authorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322594_');

        MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.startWithNumber, [
          { tag: '100', content: `$a ${testData.authorityHeading}`, indicators: ['\\', '\\'] },
        ])
          .then((id) => {
            authorityId = id;
          })
          .then(() => {
            // Update 3 times (each adds a new 500 field) → generation becomes 3
            cy.getMarcRecordDataViaAPI(authorityId).then((marcRecord) => {
              marcRecord.fields.push({
                tag: '500',
                content: `$a ${testData.authorityHeading} Note 1`,
                indicators: ['\\', '\\'],
              });
              cy.updateMarcRecordDataViaAPI(marcRecord.parsedRecordId, marcRecord);
            });
          })
          .then(() => {
            cy.getMarcRecordDataViaAPI(authorityId).then((marcRecord) => {
              marcRecord.fields.push({
                tag: '500',
                content: `$a ${testData.authorityHeading} Note 2`,
                indicators: ['\\', '\\'],
              });
              cy.updateMarcRecordDataViaAPI(marcRecord.parsedRecordId, marcRecord);
            });
          })
          .then(() => {
            cy.getMarcRecordDataViaAPI(authorityId).then((marcRecord) => {
              marcRecord.fields.push({
                tag: '500',
                content: `$a ${testData.authorityHeading} Note 3`,
                indicators: ['\\', '\\'],
              });
              cy.updateMarcRecordDataViaAPI(marcRecord.parsedRecordId, marcRecord);
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
        MarcAuthority.deleteViaAPI(authorityId, true);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1322594 Build query to find MARC authority records which have Leader status = New (n) and have been updated several times (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322594'] },
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

          // Row 0: Heading contains test prefix — stays for all steps (isolation filter)
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(testData.authorityHeading);

          // Add Row 1: MARC Authority — Leader record status equals 'n' — stays for all steps
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.MARC_AUTHORITY_LEADER_RECORD_STATUS, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield('n', 1);

          // Add Row 2: MARC Authority — Generation (operator/value changes per step)
          QueryModal.addNewRow(1);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.MARC_AUTHORITY_GENERATION, 2);

          // Step 2: Leader status = 'n' AND Generation > 2 → record found (generation=3, 3>2 ✓)
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN, 2);
          QueryModal.fillInValueTextfield('2', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 3: Leader status = 'n' AND Generation >= 3 → record found (generation=3, 3>=3 ✓)
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO, 2);
          QueryModal.fillInValueTextfield('3', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 4: Leader status = 'n' AND Generation = 3 → record found (generation=3, 3=3 ✓)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 5: Leader status = 'n' AND Generation > 3 → record NOT found (generation=3, 3>3 ✗)
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();
        },
      );
    });
  });
});
