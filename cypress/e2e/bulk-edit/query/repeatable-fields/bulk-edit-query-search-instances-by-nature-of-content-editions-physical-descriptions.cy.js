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
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../support/utils/stringTools';
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';

let user;
const expectedInstances = [
  {
    // Instance 1
    title: `AT_C825249_FolioInstance_1_${getRandomPostfix()}`,
    natureOfContent: ['audiobook'],
    natureOfContentTermIds: [], // Will be populated after fetching terms
    editions: ['Classic editions'],
    physicalDescriptions: ['<14 > sound discs : digital, stereo. ; 4 3/4 in.'],
  },
  {
    // Instance 2
    title: `AT_C825249_FolioInstance_2_${getRandomPostfix()}`,
    natureOfContent: ['newspaper', 'biography', 'audiobook'],
    natureOfContentTermIds: [], // Will be populated after fetching terms
    editions: [
      'Classic editions CE 1011',
      'Eds. recorded: Classic Editions Schott',
      'Editions Salabert',
    ],
    physicalDescriptions: [
      '14 volumes ; 23 cm.',
      '1 sound disc : analog, 33 1/3 rpm ; 12 in.',
      '1 disc. 33 1/3 rpm. 12 in.',
    ],
  },
  {
    // Instance 3
    title: `AT_C825249_FolioInstance_3_${getRandomPostfix()}`,
    natureOfContent: ['website'],
    natureOfContentTermIds: [], // Will be populated after fetching terms
    editions: ['Classic Éditions Bossard, Paris'],
    physicalDescriptions: ['1 audio disc ; 12 in.'],
  },
  {
    // Instance 4
    title: `AT_C825249_FolioInstance_4_${getRandomPostfix()}`,
    natureOfContent: [],
    natureOfContentTermIds: [],
    editions: [],
    physicalDescriptions: [],
  },
];

// Helper function to populate string properties for UI display
const populateInstanceStringProperties = (instanceData) => {
  instanceData.natureOfContentString = instanceData.natureOfContent.join(' | ');
  instanceData.editionsString = instanceData.editions.join(' | ');
  instanceData.physicalDescriptionsString = instanceData.physicalDescriptions.join(' | ');
};

// Helper function to map nature of content term names to IDs
const mapNatureOfContentTermsToIds = (terms) => {
  expectedInstances.forEach((instance) => {
    if (instance.natureOfContent.length > 0) {
      instance.natureOfContentTermIds = instance.natureOfContent
        .map((termName) => {
          const term = terms.find((t) => t.name === termName);
          return term ? term.id : null;
        })
        .filter(Boolean);
    }
  });
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825249');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Populate string properties for all instances
          expectedInstances.forEach((instance) => {
            populateInstanceStringProperties(instance);
          });

          // Fetch nature of content terms and map them to IDs
          NatureOfContent.getViaApi().then(({ natureOfContentTerms: terms }) => {
            mapNatureOfContentTermsToIds(terms);

            cy.getInstanceTypes({ limit: 1 })
              .then((instanceTypes) => {
                // Create instances with nature of content term IDs, editions, and physical descriptions
                expectedInstances.forEach((instanceData) => {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: instanceData.title,
                      natureOfContentTermIds: instanceData.natureOfContentTermIds,
                      editions: instanceData.editions,
                      physicalDescriptions: instanceData.physicalDescriptions,
                    },
                  }).then((createdInstance) => {
                    cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                      instanceData.hrid = instanceResponse.hrid;
                      instanceData.id = instanceResponse.id;
                    });
                  });
                });
              })
              .then(() => {
                cy.login(user.username, user.password, {
                  path: TopMenu.bulkEditPath,
                  waiter: BulkEditSearchPane.waitLoading,
                });
              });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        expectedInstances.forEach((instance) => {
          if (instance.id) {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          }
        });
      });

      // Trillium
      it.skip(
        'C825249 Search instances by Nature of content, Editions, Physical descriptions (firebird)',
        { tags: [] },
        () => {
          // Step 1: Search instances by "Instance — Nature of content" field using "equals" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.natureOfContent);
          QueryModal.verifySelectedField(instanceFieldValues.natureOfContent);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('audiobook');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C825249_FolioInstance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.nature_of_content_term == audiobook) AND (instance.title starts with AT_C825249_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instances 1, 2 (both have "audiobook" in nature of content)
          const expectedInstancesToFind = [expectedInstances[0], expectedInstances[1]];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.natureOfContent,
              instance.natureOfContentString,
            );
          });

          // Not expected to find: Instances 3, 4
          const notExpectedToFindInstanceHrids = [
            expectedInstances[2].hrid,
            expectedInstances[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 2: Search instances by "Instance — Editions" field using "starts with" operator
          QueryModal.selectField(instanceFieldValues.editions);
          QueryModal.verifySelectedField(instanceFieldValues.editions);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('Classic editions');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.editions starts with Classic editions) AND (instance.title starts with AT_C825249_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instances 1, 2 (both have editions starting with "Classic editions")

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.editions,
              instance.editionsString,
            );
          });

          // Not expected to find: Instances 3, 4
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Physical descriptions" field using "contains" operator
          QueryModal.selectField(instanceFieldValues.physicalDescriptions);
          QueryModal.verifySelectedField(instanceFieldValues.physicalDescriptions);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('sound disc');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.physical_descriptions contains sound disc) AND (instance.title starts with AT_C825249_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instances 1, 2 (both have "sound disc" in physical descriptions)

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.physicalDescriptions,
              instance.physicalDescriptionsString,
            );
          });

          // Not expected to find: Instances 3, 4
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });
        },
      );
    });
  });
});
