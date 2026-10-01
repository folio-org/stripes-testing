import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';
import SubjectSources from '../../../../support/fragments/settings/inventory/instances/subjectSources';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1453732';
const titlePrefix = `AT_${testCaseId}_Instance`;
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
};
const testData = {
  instanceTypeId: null,
  natureOfContentId: null,
  natureOfContentName: null,
  subjectSourceId: null,
  subjectSourceName: null,
  subjectTypeId: null,
  subjectTypeName: null,
  subjectHeading: `AT_${testCaseId}_Subject`,
  instance: {
    title: `${titlePrefix}_${getRandomPostfix()}`,
    id: null,
    hrid: null,
  },
};

let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`AT_${testCaseId}`);

        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          testData.instanceTypeId = types[0].id;
        });

        NatureOfContent.getViaApi({ limit: 1 }).then(({ natureOfContentTerms }) => {
          testData.natureOfContentId = natureOfContentTerms[0].id;
          testData.natureOfContentName = natureOfContentTerms[0].name;
        });

        SubjectSources.getSubjectSourcesViaApi({ limit: 1 }).then((sources) => {
          testData.subjectSourceId = sources[0].id;
          testData.subjectSourceName = sources[0].name;
        });

        cy.getSubjectTypesViaApi({ limit: 1 }).then((types) => {
          testData.subjectTypeId = types[0].id;
          testData.subjectTypeName = types[0].name;
        });

        cy.then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instance.title,
              natureOfContentTermIds: [testData.natureOfContentId],
              subjects: [
                {
                  value: testData.subjectHeading,
                  sourceId: testData.subjectSourceId,
                  typeId: testData.subjectTypeId,
                },
              ],
            },
          }).then(({ instanceId }) => {
            testData.instance.id = instanceId;
            cy.getInstanceById(instanceId).then((instance) => {
              testData.instance.hrid = instance.hrid;
            });
          });

          cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
            (userProperties) => {
              user = userProperties;
              cy.login(user.username, user.password, {
                path: TopMenu.listsPath,
                waiter: Lists.waitLoading,
              });
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        InventoryInstance.deleteInstanceViaApi(testData.instance.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1453732 Verify that the fields "Instance — Nature of content", "Instance — Subjects — Subject type", "Instance — Subjects — Subject source" fields are queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1453732'] },
        () => {
          // Step 1: Create new list with Instances record type
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Configure the following query
          QueryModal.selectField(instanceFieldValues.natureOfContent);
          QueryModal.verifySelectedField(instanceFieldValues.natureOfContent);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect(testData.natureOfContentName);

          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.subjectsSubjectSource, 1);
          QueryModal.verifySelectedField(instanceFieldValues.subjectsSubjectSource, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.subjectSourceName, 1);

          QueryModal.addNewRow(1);
          QueryModal.selectField(instanceFieldValues.subjectsSubjectType, 2);
          QueryModal.verifySelectedField(instanceFieldValues.subjectsSubjectType, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.chooseValueSelect(testData.subjectTypeName, 2);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Step 3: Check the preview of found records
          QueryModal.verifyQueryAreaContent(
            `(instance.nature_of_content_term in [${testData.natureOfContentName}]) AND (instance.subjects[*]->subject_source in [${testData.subjectSourceName}]) AND (instance.subjects[*]->subject_type == ${testData.subjectTypeName})`,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instance.hrid,
            instanceFieldValues.natureOfContent,
            testData.natureOfContentName,
          );
          QueryModal.verifySubjectsEmbeddedTableInQueryModal(testData.instance.hrid, {
            subjectHeadings: testData.subjectHeading,
            subjectSource: testData.subjectSourceName,
            subjectType: testData.subjectTypeName,
          });

          // Step 4: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 5-7: Verify refresh complete and view updated list
            Lists.verifyRefreshCompleteCallout(recordCount);
            Lists.viewUpdatedList();
            Lists.verifyRecordWithContent(testData.instance.hrid);
            Lists.verifyResultCellByIdentifier(
              testData.instance.hrid,
              instanceFieldValues.natureOfContent,
              testData.natureOfContentName,
            );
            cy.log(testData.subjectHeading);
            cy.log(testData.subjectSourceName);
            cy.log(testData.subjectTypeName);
            Lists.verifyEmbeddedTableInResultsRow('subjects', testData.instance.hrid, {
              subjectHeadings: testData.subjectHeading,
              subjectSource: testData.subjectSourceName,
              subjectType: testData.subjectTypeName,
            });
          });
        },
      );
    });
  });
});
