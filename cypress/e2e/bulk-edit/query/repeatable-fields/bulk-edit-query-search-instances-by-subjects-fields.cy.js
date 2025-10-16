import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  instanceFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import SubjectSources from '../../../../support/fragments/settings/inventory/instances/subjectSources';

let user;
let subjectSources;
let subjectTypes;
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C808477_FolioInstance_1_${getRandomPostfix()}`,
    subjects: [
      {
        value: 'Bulgaria',
        source: 'Library of Congress Subject Headings',
        type: 'Geographic name',
      },
    ],
  },
  {
    // Instance 2 - multiple subjects
    title: `AT_C808477_FolioInstance_2_${getRandomPostfix()}`,
    subjects: [
      {
        value: 'Occupations.',
        source: 'Library of Congress Subject Headings',
        type: 'Occupation',
      },
      {
        value: 'Bulgaria.',
        source: 'National Agricultural Library subject authority file',
        type: 'Geographic name',
      },
      {
        value: 'Chronology.',
        source: '',
        type: 'Chronological term',
      },
    ],
  },
  {
    // Instance 3
    title: `AT_C808477_FolioInstance_3_${getRandomPostfix()}`,
    subjects: [
      {
        value: 'Subject headings',
        source: 'Source not specified',
        type: 'Occupation',
      },
    ],
  },
  {
    // Instance 4 - no subjects
    title: `AT_C808477_FolioInstance_4_${getRandomPostfix()}`,
    subjects: [],
  },
];
// Helper function to find ID by name
const findSubjectSourceId = (name) => {
  return subjectSources.find((source) => source.name === name)?.id;
};
const findSubjectTypeId = (name) => {
  return subjectTypes.find((type) => type.name === name)?.id;
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808477');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get subject sources and types
          SubjectSources.getSubjectSourcesViaApi({ limit: 500 }).then((sources) => {
            subjectSources = sources;
            cy.getSubjectTypesViaApi({ limit: 500 }).then((types) => {
              subjectTypes = types;

              // Get required IDs for instances
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                const instanceTypeId = instanceTypeData[0].id;

                // Create instances with subjects
                testInstancesData.forEach((instanceData, index) => {
                  const subjectsForApi = instanceData.subjects.map((subject) => ({
                    value: subject.value,
                    sourceId: findSubjectSourceId(subject.source),
                    typeId: findSubjectTypeId(subject.type),
                  }));

                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: instanceData.title,
                      subjects: subjectsForApi,
                    },
                  }).then((createdInstance) => {
                    cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                      testInstancesData[index].hrid = instanceResponse.hrid;
                      testInstancesData[index].id = instanceResponse.id;
                    });
                  });
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        testInstancesData.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C808477 Search instances by Subjects fields (firebird)',
        { tags: ['criticalPath', 'firebird', 'C808477'] },
        () => {
          // Map subjects data to UI format for verification
          const mappedInstancesDataToUIView = testInstancesData.map((instance) => ({
            ...instance,
            subjects: instance.subjects.map((subject) => ({
              subjectHeadings: subject.value,
              subjectSource: subject.source,
              subjectType: subject.type,
            })),
          }));

          // Step 1: Verify Subjects fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const subjectsFields = [
            instanceFieldValues.subjectsSubjectHeadings,
            instanceFieldValues.subjectsSubjectSource,
            instanceFieldValues.subjectsSubjectType,
          ];

          subjectsFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(subjectsFields);

          // Step 2: Search instances by "Instance — Subjects — Subject headings" field using "contains" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(instanceFieldValues.subjectsSubjectHeadings);
          QueryModal.verifySelectedField(instanceFieldValues.subjectsSubjectHeadings);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('Bulgaria');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C808477_FolioInstance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.subjects[*]->subject_value contains Bulgaria) AND (instance.title starts with AT_C808477_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedBulgariaInstances = [
            mappedInstancesDataToUIView[0],
            mappedInstancesDataToUIView[1],
          ];

          expectedBulgariaInstances.forEach((instance) => {
            QueryModal.verifySubjectsEmbeddedTableInQueryModal(instance.hrid, instance.subjects);
          });

          const notExpectedBulgariaHrids = [
            mappedInstancesDataToUIView[2].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedBulgariaHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Subjects — Subject source" field using "in" operator
          QueryModal.selectField(instanceFieldValues.subjectsSubjectSource);
          QueryModal.verifySelectedField(instanceFieldValues.subjectsSubjectSource);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect('Library of Congress Subject Headings');
          QueryModal.fillInValueMultiselect('National Agricultural Library subject authority file');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.subjects[*]->subject_source in [Library of Congress Subject Headings, National Agricultural Library subject authority file]) AND (instance.title starts with AT_C808477_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedSourceInstances = [
            mappedInstancesDataToUIView[0],
            mappedInstancesDataToUIView[1],
          ];

          expectedSourceInstances.forEach((instance) => {
            QueryModal.verifySubjectsEmbeddedTableInQueryModal(instance.hrid, instance.subjects);
          });

          const notExpectedSourceHrids = [
            mappedInstancesDataToUIView[2].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedSourceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search instances by "Instance — Subjects — Subject type" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.subjectsSubjectType);
          QueryModal.verifySelectedField(instanceFieldValues.subjectsSubjectType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('Geographic name');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.subjects[*]->subject_type == Geographic name) AND (instance.title starts with AT_C808477_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedGeographicInstances = [
            mappedInstancesDataToUIView[0],
            mappedInstancesDataToUIView[1],
          ];

          expectedGeographicInstances.forEach((instance) => {
            QueryModal.verifySubjectsEmbeddedTableInQueryModal(instance.hrid, instance.subjects);
          });

          const notExpectedGeographicHrids = [
            mappedInstancesDataToUIView[2].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedGeographicHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Check display of Instance data from Preconditions in "Instance — Subjects" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.title starts with AT_C808477_FolioInstance)',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            mappedInstancesDataToUIView[3].hrid,
            'Instance — Subjects',
            '',
          );

          // Verify instances with subjects display appropriate values
          mappedInstancesDataToUIView
            .filter((instance) => instance.subjects.length > 0)
            .forEach((instance) => {
              QueryModal.verifySubjectsEmbeddedTableInQueryModal(instance.hrid, instance.subjects);
            });
        },
      );
    });
  });
});
