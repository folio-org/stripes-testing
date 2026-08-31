import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import Formats from '../../../../support/fragments/settings/inventory/instances/formats';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';

const testCaseId = 'C1464108';
const titlePrefix = `AT_${testCaseId}_Instance`;
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
  description: `AT_${testCaseId}_Desc_${getRandomPostfix()}`,
};
const testData = {
  instanceTypeId: null,
  formatId: null,
  formatName: 'audio -- other',
  dateTypeId: null,
  dateTypeName: 'Multiple dates',
  urlRelationshipId: null,
  electronicAccess: {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
    uri: 'http://test.example.com/c1464108',
    linkText: 'Test Link C1464108',
    materialsSpecification: 'Test material spec',
    publicNote: 'Test public note',
  },
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

        Formats.getViaApi({ limit: 100 }).then((formats) => {
          const format = formats.find((f) => f.name === testData.formatName);
          testData.formatId = format.id;
        });

        cy.getInstanceDateTypesViaAPI(100).then(({ instanceDateTypes }) => {
          const dateType = instanceDateTypes.find((t) => t.name === testData.dateTypeName);
          testData.dateTypeId = dateType.id;
        });

        UrlRelationship.getViaApi({
          query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
        }).then((relationships) => {
          testData.urlRelationshipId = relationships[0].id;
        });

        cy.then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instance.title,
              instanceFormatIds: [testData.formatId],
              dates: { dateTypeId: testData.dateTypeId, date1: '2024' },
              electronicAccess: [
                {
                  relationshipId: testData.urlRelationshipId,
                  uri: testData.electronicAccess.uri,
                  linkText: testData.electronicAccess.linkText,
                  materialsSpecification: testData.electronicAccess.materialsSpecification,
                  publicNote: testData.electronicAccess.publicNote,
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
        'C1464108 Verify that the fields "Instance — Electronic access — URL relationship", "Instance — Format names", "Instance date type — Name" fields are queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1464108'] },
        () => {
          // Step 1: Create new list with Instances record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Configure the query with 3 rows
          QueryModal.selectField(instanceFieldValues.electronicAccessURLRelationship);
          QueryModal.verifySelectedField(instanceFieldValues.electronicAccessURLRelationship);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect(testData.electronicAccess.relationship);

          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.formatNames, 1);
          QueryModal.verifySelectedField(instanceFieldValues.formatNames, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(testData.formatName, 1);

          QueryModal.addNewRow(1);
          QueryModal.selectField(instanceFieldValues.instanceDateTypeName, 2);
          QueryModal.verifySelectedField(instanceFieldValues.instanceDateTypeName, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 2);
          QueryModal.chooseFromValueMultiselect(testData.dateTypeName, 2);

          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Step 3: Check the preview of found records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(
            testData.instance.hrid,
            testData.electronicAccess,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instance.hrid,
            instanceFieldValues.formatNames,
            testData.formatName,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instance.hrid,
            instanceFieldValues.instanceDateTypeName,
            testData.dateTypeName,
          );

          // Step 4: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 5: Verify result after refresh is done
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 6: Click "View updated list" link
            Lists.viewUpdatedList();
            Lists.verifyRecordWithContent(testData.instance.hrid);

            // Step 7: Open Actions > Show columns and verify data
            Lists.verifyResultCellByIdentifier(
              testData.instance.hrid,
              instanceFieldValues.formatNames,
              testData.formatName,
            );
            Lists.verifyResultCellByIdentifier(
              testData.instance.hrid,
              instanceFieldValues.instanceDateTypeName,
              testData.dateTypeName,
            );
            Lists.verifyEmbeddedTableInResultsRow('electronicAccess', testData.instance.hrid, {
              relationship: testData.electronicAccess.relationship,
              uri: testData.electronicAccess.uri,
              linkText: testData.electronicAccess.linkText,
              materialsSpecification: testData.electronicAccess.materialsSpecification,
              publicNote: testData.electronicAccess.publicNote,
            });
          });
        },
      );
    });
  });
});
