import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  booleanOperators,
  booleanOperatorsInRepeatableFields,
  holdingsFieldValues,
  instanceFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `C958460_List_${getRandomPostfix()}`;
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
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

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C958460 Available operators for arrays of booleans (corsair)',
      { tags: ['extendedPath', 'corsair', 'C958460'] },
      () => {
        // Step 1: Create new list with Holdings record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();

        // Step 2: Verify Build query form opens
        QueryModal.verify();

        // Step 3: Select "Holdings — Notes — Staff only" and verify operators
        QueryModal.selectField(holdingsFieldValues.notesStaffOnly);
        QueryModal.verifySelectedField(holdingsFieldValues.notesStaffOnly);
        QueryModal.verifyOperatorsList(booleanOperatorsInRepeatableFields);

        // Step 4: Select "Holdings — Receiving history — Public display" and verify operators
        QueryModal.selectField(holdingsFieldValues.receivingHistoryPublicDisplay);
        QueryModal.verifySelectedField(holdingsFieldValues.receivingHistoryPublicDisplay);
        QueryModal.verifyOperatorsList(booleanOperatorsInRepeatableFields);

        // Step 5: Select "Instance — Contributors — Primary" and verify operators
        QueryModal.selectField(instanceFieldValues.contributorPrimary);
        QueryModal.verifySelectedField(instanceFieldValues.contributorPrimary);
        QueryModal.verifyOperatorsList(booleanOperatorsInRepeatableFields);

        // Step 6: Select "Instance — Flag for deletion" and verify operators
        QueryModal.selectField(instanceFieldValues.flagForDeletion);
        QueryModal.verifySelectedField(instanceFieldValues.flagForDeletion);
        QueryModal.verifyOperatorsList(booleanOperators);

        // Step 7: Select "Instance — Previously held" and verify operators
        QueryModal.selectField(instanceFieldValues.previouslyHeld);
        QueryModal.verifySelectedField(instanceFieldValues.previouslyHeld);
        QueryModal.verifyOperatorsList(booleanOperators);
      },
    );
  });
});
