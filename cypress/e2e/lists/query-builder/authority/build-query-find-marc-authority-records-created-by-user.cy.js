import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import { AUTHORITY_QUERY_FIELDS, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322596_List_${randomPostfix}`,
        heading1: `AT_C1322596_MarcAuthority_1_${randomPostfix}`,
        heading2: 'AT_C1322596_MarcAuthority_2_Imported',
        email: `at_c1322596_${getRandomLetters(7)}@test.com`,
      };

      const marcFile = {
        marc: 'marcAuthFileC1322596.mrc',
        fileName: `testMarcAuthC1322596.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      const authData = {
        prefix: getRandomLetters(10),
        startWithNumber: `1322596${randomNDigitNumber(6)}`,
      };

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordCreate,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorCreate,
        CapabilitySets.uiDataImport,
      ];

      let userData = {};
      let authorityId1;
      let authorityId2;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322596_');

        cy.createTempUser([], undefined, undefined, undefined, testData.email)
          .then((userProperties) => {
            userData = userProperties;
            cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
          })
          .then(() => {
            // Switch to user token — records created here will have createdByUserId = test user
            cy.getUserToken(userData.username, userData.password);
          })
          .then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              String(authData.startWithNumber),
              [{ tag: '100', content: `$a ${testData.heading1}`, indicators: ['\\', '\\'] }],
            ).then((id) => {
              authorityId1 = id;
            });
          })
          .then(() => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              authorityId2 = response[0].authority.id;
            });
          })
          .then(() => {
            // Switch back to admin — edits here will set updatedByUserId = admin
            cy.getAdminToken();
          })
          .then(() => {
            cy.getMarcRecordDataViaAPI(authorityId1).then((marcRecord) => {
              marcRecord.fields.push({
                tag: '500',
                content: '$a AT_C1322596 Admin note 1',
                indicators: ['\\', '\\'],
              });
              cy.updateMarcRecordDataViaAPI(marcRecord.parsedRecordId, marcRecord);
            });
          })
          .then(() => {
            cy.getMarcRecordDataViaAPI(authorityId2).then((marcRecord) => {
              marcRecord.fields.push({
                tag: '500',
                content: '$a AT_C1322596 Admin note 2',
                indicators: ['\\', '\\'],
              });
              cy.updateMarcRecordDataViaAPI(marcRecord.parsedRecordId, marcRecord);
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(authorityId1, true);
        MarcAuthority.deleteViaAPI(authorityId2, true);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1322596 Build query to find MARC authority records created by a user (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322596'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Steps shuffled for better stability

          // Step 1: Create new list, select Authority record type, open Build query
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2: Created by user — Username equals test user username → both records found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.CREATED_BY_USER_USERNAME);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(userData.username);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.heading1);
          QueryModal.verifyResultFound(testData.heading2);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Step 5: Updated by user — Username equals test user username → no records found
          // (records were updated by admin, not the test user)
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.UPDATED_BY_USER_USERNAME);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(userData.username);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 3: Created by user — Last name, first name equals test user → both records found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.CREATED_BY_USER_LAST_NAME_FIRST_NAME);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(`${userData.lastName}, ${userData.firstName}`);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.heading1);
          QueryModal.verifyResultFound(testData.heading2);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Step 6: Updated by user — Last name, first name equals test user → no records found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.UPDATED_BY_USER_LAST_NAME_FIRST_NAME);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(`${userData.lastName}, ${userData.firstName}`);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 4: Created by user — Email equals test user email → both records found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.CREATED_BY_USER_EMAIL);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.email);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.heading1);
          QueryModal.verifyResultFound(testData.heading2);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Step 7: Updated by user — Email equals test user email → no records found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.UPDATED_BY_USER_EMAIL);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.email);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();
        },
      );
    });
  });
});
