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
import { AUTHORITY_QUERY_FIELDS } from '../../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      describe('ECS', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          recordType: 'Authority',
          listName: `AT_C1312668_List_${randomPostfix}`,
          // Common prefix for starts-with query — both records share it
          headingQueryPrefix: `AT_C1312668_MarcAuthority_${randomPostfix}`,
          headingShared: `AT_C1312668_MarcAuthority_${randomPostfix}_1_Shared`,
          headingLocal: `AT_C1312668_MarcAuthority_${randomPostfix}_2_Local`,
        };

        const authData = {
          prefix: getRandomLetters(10),
          startWithNumber: `1312668${randomNDigitNumber(6)}`,
        };

        const capabSetsToAssign = [
          CapabilitySets.moduleListsManage,
          CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        ];

        let userData = {};
        let authorityIdShared;
        let authorityIdLocal;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Cleanup from previous runs
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1312668_');
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1312668_');

          // Create user in Central — primary affiliation = Central, logs into Central automatically
          cy.resetTenant();
          cy.createTempUser([])
            .then((userProperties) => {
              userData = userProperties;

              // Assign Central capabilities
              cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);

              // Affiliate user to College and assign member capabilities
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
              // Create Local authority record in College (member) tenant
              cy.setTenant(Affiliations.College);
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                String(Number(authData.startWithNumber) + 1),
                [{ tag: '100', content: `$a ${testData.headingLocal}`, indicators: ['\\', '\\'] }],
              ).then((id) => {
                authorityIdLocal = id;
              });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          MarcAuthority.deleteViaAPI(authorityIdShared, true);
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(authorityIdLocal, true);
        });

        it(
          'C1312668 Verify that only Shared MARC authority records are found by query from Central tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C1312668'] },
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

            // Step 2: Heading starts with common prefix → only Shared record found (Local is not
            // visible from Central tenant)
            QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInValueTextfield(testData.headingQueryPrefix);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            QueryModal.verifyResultFound(testData.headingShared);
            QueryModal.verifyResultFound(testData.headingLocal, { isFound: false });
            QueryModal.verifyNumberOfRowsInPreviewTable(1);

            // Step 3: Heading equals Local record heading → no records found (Local not visible
            // from Central tenant)
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(testData.headingLocal);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            QueryModal.verifyQueryReturnsNoResults();
          },
        );
      });
    });
  });
});
