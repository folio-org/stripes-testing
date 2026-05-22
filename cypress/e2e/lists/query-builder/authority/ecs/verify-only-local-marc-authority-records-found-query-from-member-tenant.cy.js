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
          listName: `AT_C1312669_List_${randomPostfix}`,
          // Common prefix for starts-with query — both records share it
          headingQueryPrefix: `AT_C1312669_MarcAuthority_${randomPostfix}`,
          headingShared: `AT_C1312669_MarcAuthority_${randomPostfix}_1_Shared`,
          headingLocal: `AT_C1312669_MarcAuthority_${randomPostfix}_2_Local`,
        };

        const authData = {
          prefix: getRandomLetters(10),
          startWithNumber: `1312669${randomNDigitNumber(6)}`,
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1312669_');
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1312669_');

          // Create user in College — primary affiliation = College, logs into College automatically
          cy.setTenant(Affiliations.College);
          cy.createTempUser([])
            .then((userProperties) => {
              userData = userProperties;

              // Assign Central capabilities (Central affiliation is automatic)
              cy.resetTenant();
              cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);

              // Assign College capabilities
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
                Number(authData.startWithNumber) + 1,
                [{ tag: '100', content: `$a ${testData.headingLocal}`, indicators: ['\\', '\\'] }],
              ).then((id) => {
                authorityIdLocal = id;
              });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(authorityIdShared, true);
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(authorityIdLocal, true);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C1312669 Verify that only Local MARC authority records are found by query from Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C1312669'] },
          () => {
            // Login to College tenant (user's primary affiliation)
            cy.setTenant(Affiliations.College);
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

            // Step 2: Heading starts with common prefix → only Local record found (Shared is not
            // visible from Member tenant)
            QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInValueTextfield(testData.headingQueryPrefix);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            QueryModal.verifyResultFound(testData.headingLocal);
            QueryModal.verifyResultFound(testData.headingShared, { isFound: false });
            QueryModal.verifyNumberOfRowsInPreviewTable(1);

            // Step 3: Heading equals Shared record heading → no records found (Shared not visible
            // from Member tenant)
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(testData.headingShared);
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
