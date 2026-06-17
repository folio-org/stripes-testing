import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451492_List_${getRandomPostfix()}`;
const userAddress = {
  addressLine1: 'ARM1',
  addressLine2: 'ARM2',
  addressTypeId: null,
  city: 'Yerevan',
  countryId: 'AM',
  postalCode: '170495',
  region: 'Nor Nork',
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.uiUsersView.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.getUsers({ query: `username=${user.username}` }).then((users) => {
            cy.getAddressTypesApi({ query: 'addressType=="Home"' }).then((addressTypes) => {
              userAddress.addressTypeId = addressTypes[0].id;

              cy.updateUser({
                ...users[0],
                personal: {
                  ...users[0].personal,
                  addresses: [userAddress],
                },
              });
            });
          });

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
      'C451492 [Users] Verify that nested array type fields are queryable (corsair)',
      { tags: ['criticalPath', 'corsair', 'C451492'] },
      () => {
        // Step 1: Create new list with Users record type and build query
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Click "Select field" dropdown in the "Field" column => search for the field 'User — Address — Line 1'
        QueryModal.typeInAndSelectField(usersFieldValues.userAddressLine1);

        // Step 3: Search for the field 'User — Address — Line 2'
        QueryModal.typeInAndSelectField(usersFieldValues.userAddressLine2);

        // Step 4: Search for the field 'User — Address — Type'
        QueryModal.typeInAndSelectField(usersFieldValues.userAddressType);

        // Step 5: Search for the field 'User - Address - City'
        QueryModal.typeInAndSelectField(usersFieldValues.userAddressCity);

        // Step 6: Search for the field 'User — Address — Region'
        QueryModal.typeInAndSelectField(usersFieldValues.userAddressRegion);

        // Step 7: Search for the field 'User — Address — Postal code'
        QueryModal.typeInAndSelectField(usersFieldValues.userAddressPostalCode);

        // Step 8: Search for the field 'User — Address — Region'
        QueryModal.typeInAndSelectField(usersFieldValues.userAddressRegion);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(userAddress.region);
        QueryModal.addNewRow();
        QueryModal.typeInAndSelectField(usersFieldValues.userName, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(user.username, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.runQueryDisabled(false);

        // Step 9: Check the field "User — Address"
        QueryModal.verifyUserAddressEmbeddedTableInQueryModal(user.barcode, {
          city: userAddress.city,
          region: userAddress.region,
          country: 'Armenia',
          postalCode: userAddress.postalCode,
          line1: userAddress.addressLine1,
          type: 'Home',
          primaryAddress: '',
          line2: userAddress.addressLine2,
        });
      },
    );
  });
});
