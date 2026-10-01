import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  AUTHORITY_QUERY_FIELDS,
  AUTHORITY_HEADING_TYPES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

const testCaseId = 'C1464131';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const marcAuthFile = {
  marc: 'marcAuthFileForC1464131.mrc',
  fileName: `testMarcAuthC1464131.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
};
const capabSetsToAssign = [
  CapabilitySets.moduleListsManage,
  CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
  CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
  CapabilitySets.uiMarcAuthoritiesAuthorityRecordCreate,
];
let userData = {};
let marcAuthId;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      before('Create test data', () => {
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
        });

        DataImport.uploadFileViaApi(
          marcAuthFile.marc,
          marcAuthFile.fileName,
          marcAuthFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            marcAuthId = record.authority.id;
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        MarcAuthority.deleteViaAPI(marcAuthId, true);
        Lists.deleteListByNameViaApi(listName);
      });

      it(
        'C1464131 User can build and save an Authority list queried by "Authority — Heading type" (athena)',
        { tags: ['extendedPath', 'athena', 'C1464131'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Step 1: Create new list with Authority record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);

          // Step 2: Click "Build query" button and verify form elements
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Authority — Heading type" field, "equals" operator, enter heading type value and test query
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(AUTHORITY_HEADING_TYPES.UNIFORM_TITLE);
          QueryModal.testQuery();
          QueryModal.verifyQueryAreaContent(
            `(authority.heading_type == ${AUTHORITY_HEADING_TYPES.UNIFORM_TITLE})`,
          );
          QueryModal.runQueryDisabled(false);
          Lists.verifyQueryValue(
            AUTHORITY_HEADING_TYPES.UNIFORM_TITLE,
            QUERY_OPERATIONS.EQUAL,
            'list-column-authority.heading_type',
          );

          // Step 4: Click "Run query & save" button
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 5-6: Verify refresh complete toast message
          Lists.waitForCompilingToComplete();

          // Step 7: Verify "Authority — Heading type" column displays the selected heading type
          Lists.verifyQuery(`authority.heading_type == ${AUTHORITY_HEADING_TYPES.UNIFORM_TITLE}`);
          Lists.verifyResultColumnDisplayed(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING_TYPE);
          Lists.verifyQueryValue(
            AUTHORITY_HEADING_TYPES.UNIFORM_TITLE,
            QUERY_OPERATIONS.EQUAL,
            'list-column-authority.heading_type',
          );
        },
      );
    });
  });
});
