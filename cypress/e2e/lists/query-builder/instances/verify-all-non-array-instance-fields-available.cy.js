import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import { SelectionOption } from '../../../../../interactors';

let user;
const listData = {
  name: `AT_C451511_List_${getRandomPostfix()}`,
  description: `AT_C451511_${getTestEntityValue('desc')}`,
};

// List of expected non-array instance fields from TestRail specification
const expectedFields = [
  instanceFieldValues.catalogedDate,
  instanceFieldValues.createdDate,
  instanceFieldValues.date1,
  instanceFieldValues.date2,
  instanceFieldValues.formatNames,
  instanceFieldValues.indexTitle,
  instanceFieldValues.instanceHrid,
  instanceFieldValues.instanceId,
  instanceFieldValues.languages,
  instanceFieldValues.modeOfIssuance,
  instanceFieldValues.previouslyHeld,
  instanceFieldValues.recordVersion,
  instanceFieldValues.instanceResourceTitle,
  instanceFieldValues.resourceType,
  instanceFieldValues.instanceSource,
  instanceFieldValues.staffSuppress,
  instanceFieldValues.statisticalCodeNames,
  instanceFieldValues.suppressFromDiscovery,
  instanceFieldValues.updatedDate,
  instanceFieldValues.instanceDateTypeName,
  instanceFieldValues.instanceStatusCode,
  instanceFieldValues.instanceStatusTerm,
];

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances', () => {
      before('Create test user and login', () => {
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

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C451511 Verify that all non-array queryable fields are available in the Query Builder (athena)',
        { tags: ['extendedPath', 'athena', 'C451511'] },
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

          // Step 2: Verify all expected non-array instance fields are available in the dropdown
          expectedFields.forEach((fieldName) => {
            QueryModal.filterFieldSelectionList(fieldName);
            cy.expect(SelectionOption(fieldName).exists());
            QueryModal.closeOpenedSelection();
          });
        },
      );
    });
  });
});
