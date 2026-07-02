import Affiliations from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import QueryModal, {
  QUERY_OPERATIONS,
} from '../../../../../support/fragments/bulk-edit/query-modal';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';
import {
  AUTHORITY_QUERY_FIELDS_ECS,
  AUTHORITY_LISTS_COLUMNS_ECS,
} from '../../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      describe('ECS', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          recordType: 'Authority',
          listName: `AT_C1347253_List_${randomPostfix}`,
          // Common prefix for starts-with query — both records share it
          headingQueryPrefix: `AT_C1347253_MarcAuthority_${randomPostfix}`,
          headingShared: `AT_C1347253_MarcAuthority_${randomPostfix}_1_Shared`,
          headingLocalCollege: `AT_C1347253_MarcAuthority_${randomPostfix}_2_Local`,
          headingLocalUniversity: `AT_C1347253_MarcAuthority_${randomPostfix}_3_Local`,
        };

        const defaultCheckedColumns = [
          AUTHORITY_LISTS_COLUMNS_ECS.AUTHORITY_HEADING,
          AUTHORITY_LISTS_COLUMNS_ECS.AUTHORITY_HEADING_TYPE,
          AUTHORITY_LISTS_COLUMNS_ECS.AUTHORITY_NATURAL_ID,
          AUTHORITY_LISTS_COLUMNS_ECS.AUTHORITY_UUID,
          AUTHORITY_LISTS_COLUMNS_ECS.SOURCE_FILE_NAME,
          AUTHORITY_LISTS_COLUMNS_ECS.MARC_AUTHORITY_EXTERNAL_HRID,
          AUTHORITY_LISTS_COLUMNS_ECS.MARC_AUTHORITY_STATE,
        ];

        const authData = {
          prefix: getRandomLetters(10),
          startWithNumber: `1347253${randomNDigitNumber(6)}`,
        };

        const capabSetsToAssign = [
          CapabilitySets.moduleListsManage,
          CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        ];

        let userData = {};
        let authorityIdShared;
        let authorityIdLocalCollege;
        let authorityIdLocalUniversity;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Cleanup from previous runs
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C1347253_');
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C1347253_');
          cy.setTenant(Affiliations.University);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C1347253_');

          // Create user in Central — primary affiliation = Central, logs into Central automatically
          cy.resetTenant();
          cy.createTempUser([])
            .then((userProperties) => {
              userData = userProperties;

              // Assign Central capabilities
              cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);

              // Affiliate user to College and assign member 1 capabilities
              cy.assignAffiliationToUser(Affiliations.College, userData.userId);
              cy.setTenant(Affiliations.College);
              cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
            })
            .then(() => {
              // Create Shared authority record in Central tenant
              cy.resetTenant();
              MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.startWithNumber, [
                { tag: '100', content: `$a ${testData.headingShared}`, indicators: ['\\', '\\'] },
              ]).then((id) => {
                authorityIdShared = id;
              });
            })
            .then(() => {
              // Create Local authority record in College (member 1) tenant
              cy.setTenant(Affiliations.College);
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                String(Number(authData.startWithNumber) + 1),
                [
                  {
                    tag: '100',
                    content: `$a ${testData.headingLocalCollege}`,
                    indicators: ['\\', '\\'],
                  },
                ],
              ).then((id) => {
                authorityIdLocalCollege = id;
              });
            })
            .then(() => {
              // Create Local authority record in University (member 2) tenant
              cy.setTenant(Affiliations.University);
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                String(Number(authData.startWithNumber) + 2),
                [
                  {
                    tag: '100',
                    content: `$a ${testData.headingLocalUniversity}`,
                    indicators: ['\\', '\\'],
                  },
                ],
              ).then((id) => {
                authorityIdLocalUniversity = id;
              });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          MarcAuthority.deleteViaAPI(authorityIdShared, true);
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(authorityIdLocalCollege, true);
          cy.setTenant(Affiliations.University);
          MarcAuthority.deleteViaAPI(authorityIdLocalUniversity, true);
        });

        it(
          "C1347253 Verify that Shared and Local MARC authority records are found by query from Central tenant based on user's affiliations (consortia) (spitfire)",
          { tags: ['criticalPathECS', 'spitfire', 'C1347253'] },
          () => {
            // Login to Central tenant (user's primary affiliation)
            cy.resetTenant();
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

            // Step 2: Check available queriable fields in "Field" dropdown
            QueryModal.verifyAllAvailableFieldOptions(Object.values(AUTHORITY_QUERY_FIELDS_ECS));

            // Step 3: Heading starts with common prefix → shared and local from member 1 found
            QueryModal.selectField(AUTHORITY_QUERY_FIELDS_ECS.AUTHORITY_HEADING);
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInValueTextfield(testData.headingQueryPrefix);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            QueryModal.verifyResultFound(testData.headingShared);
            QueryModal.verifyResultFound(testData.headingLocalCollege);
            QueryModal.verifyResultFound(testData.headingLocalUniversity, { isFound: false });
            QueryModal.verifyNumberOfRowsInPreviewTable(2);

            // Step 4: Check available checkboxes in "Show columns" dropdown and their state
            QueryModal.clickShowColumnsButton();
            QueryModal.verifyShowColumnsMenuDisplayed();
            Object.values(AUTHORITY_LISTS_COLUMNS_ECS).forEach((column) => {
              const isChecked = defaultCheckedColumns.includes(column);
              QueryModal.verifyCheckboxInShowColumnsChecked(column, isChecked);
            });

            // Step 6: Heading equals Local member 2 record heading → no records found
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(testData.headingLocalUniversity);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            QueryModal.verifyQueryReturnsNoResults();

            // Step 5: Heading equals Local member 1 record heading → record found
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(testData.headingLocalCollege);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            QueryModal.verifyResultFound(testData.headingLocalCollege);
            QueryModal.verifyResultFound(testData.headingLocalUniversity, { isFound: false });
            QueryModal.verifyResultFound(testData.headingShared, { isFound: false });
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
          },
        );
      });
    });
  });
});
